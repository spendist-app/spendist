import { readEmailBody } from '../_shared/email-runtime.ts';
import { z } from 'npm:zod@4.4.3';
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': 'https://spendist.app',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const bodySchema = z.object({
  email: z.email().max(320),
  language: z.enum(['pl', 'en']).default('en'),
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: cors });

  if (request.method !== 'POST') return json('method_not_allowed', 405);

  const authorization = request.headers.get('Authorization') ?? '';

  if (!/^Bearer\s+\S+$/i.test(authorization)) return json('unauthorized', 401);

  try {
    const body = bodySchema.parse(JSON.parse(await readEmailBody(request)));
    const url = Deno.env.get('SUPABASE_URL');

    const key =
      Deno.env.get('SUPABASE_ANON_KEY') ??
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

    if (!url || !key) return json('server_configuration_error', 503);

    const caller = createClient(url, key, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await caller.rpc('email_allowance_invite', {
      p_email: body.email,
      p_language: body.language,
    });

    if (error)
      return json(
        error.message.includes('rate limit')
          ? 'rate_limited'
          : 'invitation_failed',
        400
      );

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch {
    return json('invalid_email', 400);
  }
});

function json(code: string, status: number): Response {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
