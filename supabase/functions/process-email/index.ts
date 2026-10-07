import {
  SESv2Client,
  SendEmailCommand,
} from 'npm:@aws-sdk/client-sesv2@3.1097.0';
import { z } from 'npm:zod@4.4.3';
import {
  awsCredentials,
  emailDatabase,
  emailResponse,
  requiredEnv,
  runnerAuthorized,
} from '../_shared/email-runtime.ts';
import { deliveryResult, senderFor } from '../_shared/email-policy.mts';

const jobSchema = z.object({
  id: z.string().uuid(),
  lease_token: z.string().uuid(),
  kind: z.enum(['auth', 'notification', 'invitation']),
  recipient: z.email(),
  subject: z.string().max(200),
  body: z.string().max(10000),
});

Deno.serve(async (request) => {
  if (request.method !== 'POST')
    return emailResponse(405, 'method_not_allowed');

  if (!runnerAuthorized(request)) return emailResponse(401, 'unauthorized');

  try {
    const db = emailDatabase();

    const ses = new SESv2Client({
      region: requiredEnv('EMAIL_AWS_REGION'),
      credentials: awsCredentials('EMAIL_SENDER_AWS'),
      maxAttempts: 1, // SDK retries must never bypass database reservations.
    });

    const deadline = Date.now() + 40_000;

    for (let index = 0; index < 20 && Date.now() < deadline; index++) {
      const claim = await db.rpc('email_claim');

      if (claim.error) throw new Error('Queue unavailable');

      if (!claim.data) break;

      const job = jobSchema.parse(claim.data);
      let result: 'sent' | 'throttled' | 'rejected' | 'unknown' = 'unknown';
      let messageId: string | null = null;

      try {
        const response = await ses.send(
          new SendEmailCommand({
            FromEmailAddress: senderFor(job.kind),
            Destination: { ToAddresses: [job.recipient] },
            Content: {
              Simple: {
                Subject: { Data: job.subject, Charset: 'UTF-8' },
                Body: { Text: { Data: job.body, Charset: 'UTF-8' } },
              },
            },
          }),
          { abortSignal: AbortSignal.timeout(15_000) }
        );

        result = 'sent';
        messageId = response.MessageId ?? null;
      } catch (error) {
        result = deliveryResult(error instanceof Error ? error.name : '');
      }

      const completion = await db.rpc('email_complete', {
        p_id: job.id,
        p_token: job.lease_token,
        p_result: result,
        p_message_id: messageId,
      });

      if (completion.error) throw new Error('Queue completion unavailable');

      if (result !== 'sent') break;

      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    return emailResponse(200, 'processed');
  } catch {
    return emailResponse(503, 'email_worker_unavailable');
  }
});
