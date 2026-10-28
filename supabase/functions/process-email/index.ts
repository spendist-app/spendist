import {
  SESv2Client,
  SendEmailCommand,
} from 'npm:@aws-sdk/client-sesv2@3.1097.0';
import { z } from 'npm:zod@4.6.7';
import {
  awsCredentials,
  emailDatabase,
  emailResponse,
  requiredEnv,
  runnerAuthorized,
} from '../_shared/email-runtime.ts';
import { deliveryResult, senderFor } from '../_shared/email-policy.mts';
import {
  EMAIL_TEMPLATES,
  renderEmail,
  type RenderedEmail,
} from '../_shared/email-templates.mts';

const text = z.string().max(500).optional();

const templateDataSchema = z.object({
  language: text,
  link: z.string().max(2000).optional(),
  code: text,
  new_email: text,
  type: text,
  timezone: text,
  description: text,
  amount: text,
  currency: text,
  direction: text,
  occurred_at: text,
  end_date: text,
  payer_name: text,
  recipient_name: text,
  inviter_name: text,
  schedule: text,
  wallet: text,
  category: text,
});

const jobSchema = z.object({
  id: z.string().uuid(),
  lease_token: z.string().uuid(),
  kind: z.enum(['auth', 'notification', 'invitation']),
  recipient: z.email(),
  subject: z.string().max(200),
  body: z.string().max(10000),
  template: z.string().nullish(),
  template_data: z.json().nullish(),
});

const templateSchema = z.object({
  template: z.enum(EMAIL_TEMPLATES),
  template_data: templateDataSchema,
});

// Invalid template data or a rendering failure must not lose the email;
// the queued plain text is the fallback.
function content(job: z.infer<typeof jobSchema>): RenderedEmail | null {
  const parsed = templateSchema.safeParse(job);

  if (!parsed.success) return null;

  try {
    return renderEmail(parsed.data.template, parsed.data.template_data);
  } catch {
    return null;
  }
}

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
      const rendered = content(job);
      let result: 'sent' | 'throttled' | 'rejected' | 'unknown' = 'unknown';
      let messageId: string | null = null;

      try {
        const response = await ses.send(
          new SendEmailCommand({
            FromEmailAddress: senderFor(job.kind),
            Destination: { ToAddresses: [job.recipient] },
            Content: {
              Simple: {
                Subject: {
                  Data: rendered?.subject ?? job.subject,
                  Charset: 'UTF-8',
                },
                Body: rendered
                  ? {
                      Html: { Data: rendered.html, Charset: 'UTF-8' },
                      Text: { Data: rendered.text, Charset: 'UTF-8' },
                    }
                  : { Text: { Data: job.body, Charset: 'UTF-8' } },
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
