import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { createHash } from 'node:crypto';
import { z } from 'npm:zod@4.6.7';
import {
  emailDatabase,
  EmailBodyTooLarge,
  emailResponse,
  requiredEnv,
  readEmailBody,
} from '../_shared/email-runtime.ts';
import {
  authMessages,
  emailLanguage,
  isRepeatSignup,
} from '../_shared/email-policy.mts';

const payloadSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.email(),
    new_email: z.email().optional(),
    created_at: z.string().max(64).optional(),
    // User-writable: any shape falls back to defaults instead of failing the hook.
    user_metadata: z
      .object({ language: z.string().max(16).optional().catch(undefined) })
      .catch({}),
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
      emailLanguage(payload.user.user_metadata.language),
      isRepeatSignup(payload.user.created_at, new Date())
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
  } catch (error) {
    if (error instanceof EmailBodyTooLarge)
      return emailResponse(413, 'payload_too_large');

    // The error type only: messages may echo payload values.
    console.error('auth-email rejected', error?.constructor?.name ?? 'unknown');

    return emailResponse(401, 'invalid_email_hook');
  }
});
