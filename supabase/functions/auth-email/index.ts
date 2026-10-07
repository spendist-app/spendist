import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { createHash } from 'node:crypto';
import { z } from 'npm:zod@4.4.3';
import {
  emailDatabase,
  emailResponse,
  requiredEnv,
  readEmailBody,
} from '../_shared/email-runtime.ts';
import { authMessages } from '../_shared/email-policy.mts';

const payloadSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.email(),
    new_email: z.email().optional(),
    user_metadata: z.object({ language: z.string().optional() }).optional(),
  }),
  email_data: z.object({
    email_action_type: z.string(),
    token_hash: z.string().max(200),
    token_hash_new: z.string().max(200).optional(),
    token: z.string().max(20).optional(),
  }),
});

Deno.serve(async (request) => {
  if (request.method !== 'POST')
    return emailResponse(405, 'method_not_allowed');

  try {
    const raw = await readEmailBody(request);

    if (raw.length > 32_768) return emailResponse(413, 'payload_too_large');

    const secret = requiredEnv('SEND_EMAIL_HOOK_SECRET').replace(
      /^v1,whsec_/,
      ''
    );

    const verified = new Webhook(secret).verify(
      raw,
      Object.fromEntries(request.headers)
    );

    const payload = payloadSchema.parse(verified);
    const email = payload.email_data;

    const messages = authMessages(
      email.email_action_type,
      payload.user.email,
      payload.user.new_email,
      email.token_hash,
      email.token_hash_new,
      email.token,
      requiredEnv('APP_URL'),
      requiredEnv('SUPABASE_URL'),
      payload.user.user_metadata?.language ?? 'en'
    );
    // Tokens are hashed for deduplication, never logged or returned.

    const key = createHash('sha256')
      .update(
        payload.user.id +
          ':' +
          email.email_action_type +
          ':' +
          email.token_hash +
          ':' +
          (email.token_hash_new ?? '') +
          ':' +
          (email.token ?? '')
      )
      .digest('hex');

    const queued = await emailDatabase().rpc('email_enqueue', {
      p_owner: payload.user.id,
      p_key: 'auth:' + key,
      p_messages: messages,
    });

    if (queued.error || !queued.data) {
      return Response.json(
        {
          error: {
            http_code: 429,
            message: 'Email temporarily unavailable. Try again later.',
          },
        },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return Response.json({}, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return emailResponse(401, 'invalid_email_hook');
  }
});
