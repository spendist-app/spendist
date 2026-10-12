import {
  SESv2Client,
  GetAccountCommand,
} from 'npm:@aws-sdk/client-sesv2@3.1097.0';
import { SNSClient, PublishCommand } from 'npm:@aws-sdk/client-sns@3.1097.0';
import { z } from 'npm:zod@4.4.3';
import {
  awsCredentials,
  emailDatabase,
  emailResponse,
  requiredEnv,
  runnerAuthorized,
} from '../_shared/email-runtime.ts';

const snapshotSchema = z.object({
  sent_24h: z.number().nonnegative(),
  aws_limit: z.number().positive(),
  max_rate: z.number().positive(),
  sending_enabled: z.boolean(),
  production_access: z.boolean(),
  enforcement_status: z.string(),
});

const alertSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  lease_token: z.string().uuid(),
});

Deno.serve(async (request) => {
  if (request.method !== 'POST')
    return emailResponse(405, 'method_not_allowed');

  if (!runnerAuthorized(request)) return emailResponse(401, 'unauthorized');

  const db = emailDatabase();
  const claim = await db.rpc('email_monitor_claim');

  if (claim.error) return emailResponse(503, 'monitor_unavailable');

  if (!claim.data) return emailResponse(200, 'already_running');

  const token = z.string().uuid().parse(claim.data);

  try {
    const region = requiredEnv('EMAIL_AWS_REGION');
    const credentials = awsCredentials('EMAIL_MONITOR_AWS');
    const ses = new SESv2Client({ region, credentials, maxAttempts: 2 });
    const sns = new SNSClient({ region, credentials, maxAttempts: 1 });
    let snapshot: z.infer<typeof snapshotSchema> | null = null;

    try {
      const account = await ses.send(new GetAccountCommand({}), {
        abortSignal: AbortSignal.timeout(15_000),
      });

      snapshot = snapshotSchema.parse({
        sent_24h: account.SendQuota?.SentLast24Hours,
        aws_limit: account.SendQuota?.Max24HourSend,
        max_rate: account.SendQuota?.MaxSendRate,
        sending_enabled: account.SendingEnabled,
        production_access: account.ProductionAccessEnabled,
        enforcement_status: account.EnforcementStatus,
      });
    } catch {
      // Preserve the previous successful snapshot; an unavailable read is not zero usage.
    }

    const record = await db.rpc('email_monitor_record', {
      p_token: token,
      p_snapshot: snapshot,
      p_region: region,
    });

    if (record.error || !record.data)
      throw new Error('Monitor write unavailable');

    for (let index = 0; index < 12; index++) {
      const claimed = await db.rpc('email_alert_claim', { p_token: token });

      if (claimed.error) throw new Error('Alert queue unavailable');

      if (!claimed.data) break;

      const alert = alertSchema.parse(claimed.data);
      let published = false;

      try {
        await sns.send(
          new PublishCommand({
            TopicArn: requiredEnv('EMAIL_ALERT_TOPIC_ARN'),
            Subject: 'Spendist email alert: ' + alert.code,
            Message: JSON.stringify({
              application: 'Spendist',
              event: alert.code,
              region,
              observedAt: new Date().toISOString(),
              snapshot,
              note: 'Monitoring runs every 5 minutes. Open the private admin panel for queue and alert status.',
            }),
          }),
          { abortSignal: AbortSignal.timeout(5000) }
        );
        published = true;
      } catch {
        // The database limits publish attempts to three, including uncertain outcomes.
      }

      const completed = await db.rpc('email_alert_complete', {
        p_id: alert.id,
        p_token: alert.lease_token,
        p_success: published,
      });

      if (completed.error) throw new Error('Alert completion unavailable');
    }

    return emailResponse(
      snapshot ? 200 : 503,
      snapshot ? 'monitored' : 'ses_read_unavailable'
    );
  } catch {
    return emailResponse(503, 'email_monitor_unavailable');
  } finally {
    await db.rpc('email_monitor_release', { p_token: token });
  }
});
