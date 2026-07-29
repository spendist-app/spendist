import { createClient } from '@supabase/supabase-js';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

type InvitationBody = {
  email?: unknown;
  language?: unknown;
};

type InvitationResult = {
  invitation_id: string;
  token: string;
  expires_at: string;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return json({ code: 'method_not_allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json({ code: 'unauthorized' }, 401);
  }

  const body = await parseBody(request);
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const language = body.language === 'pl' ? 'pl' : 'en';
  if (!email || email.length > 320) {
    return json({ code: 'invalid_email' }, 400);
  }

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SB_SECRET_KEY');
  const publicKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
    Deno.env.get('SB_PUBLISHABLE_KEY');
  const appUrl = requiredEnv('APP_URL').replace(/\/+$/, '');
  const from = requiredEnv('EMAIL_FROM');
  const ses = new SESv2Client({
    region: requiredEnv('AWS_REGION'),
    credentials: {
      accessKeyId: requiredEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('AWS_SECRET_ACCESS_KEY'),
    },
  });
  if (!serviceKey || !publicKey) {
    return json({ code: 'server_configuration_error' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ code: 'unauthorized' }, 401);
  }

  const caller = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await caller.rpc('create_allowance_invitation', {
    p_email: email,
  });
  if (error || !isInvitationResult(data)) {
    return json({ code: mapInvitationError(error?.message) }, 400);
  }

  const inviteUrl = `${appUrl}/allowance/invite#token=${encodeURIComponent(
    data.token
  )}`;
  const copy = emailCopy(language, inviteUrl);
  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [email] },
        Content: {
          Simple: {
            Subject: { Data: copy.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: copy.html, Charset: 'UTF-8' },
              Text: { Data: copy.text, Charset: 'UTF-8' },
            },
          },
        },
      })
    );
  } catch {
    await admin.rpc('set_allowance_invitation_delivery', {
      p_invitation_id: data.invitation_id,
      p_status: 'failed',
    });
    return json({ code: 'email_delivery_failed' }, 502);
  }

  await admin.rpc('set_allowance_invitation_delivery', {
    p_invitation_id: data.invitation_id,
    p_status: 'sent',
  });
  return json(
    {
      invited: true,
      invitationId: data.invitation_id,
      expiresAt: data.expires_at,
    },
    200
  );
});

function emailCopy(
  language: 'pl' | 'en',
  inviteUrl: string
): { subject: string; html: string; text: string } {
  if (language === 'pl') {
    return {
      subject: 'Zaproszenie do modułu Kieszonkowe w Spendist',
      html: `<p>Otrzymujesz zaproszenie do połączenia kont w module Kieszonkowe.</p><p><a href="${inviteUrl}">Otwórz zaproszenie</a></p><p>Link jest ważny przez 7 dni. Spendist zapisuje wpisy budżetowe i nie przesyła pieniędzy.</p>`,
      text: `Otrzymujesz zaproszenie do modułu Kieszonkowe w Spendist.\n\n${inviteUrl}\n\nLink jest ważny przez 7 dni. Spendist zapisuje wpisy budżetowe i nie przesyła pieniędzy.`,
    };
  }
  return {
    subject: 'Spendist Allowance invitation',
    html: `<p>You have been invited to connect through the Spendist Allowance module.</p><p><a href="${inviteUrl}">Open the invitation</a></p><p>The link expires in 7 days. Spendist records budget entries and does not transfer money.</p>`,
    text: `You have been invited to the Spendist Allowance module.\n\n${inviteUrl}\n\nThe link expires in 7 days. Spendist records budget entries and does not transfer money.`,
  };
}

function isInvitationResult(value: unknown): value is InvitationResult {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item['invitation_id'] === 'string' &&
    typeof item['token'] === 'string' &&
    typeof item['expires_at'] === 'string'
  );
}

function mapInvitationError(message: string | undefined): string {
  if (message?.includes('rate limit')) {
    return 'rate_limited';
  }
  if (message?.includes('yourself')) {
    return 'self_invitation';
  }
  if (message?.includes('already exists')) {
    return 'already_connected';
  }
  return 'invitation_failed';
}

async function parseBody(request: Request): Promise<InvitationBody> {
  try {
    return (await request.json()) as InvitationBody;
  } catch {
    return {};
  }
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function json(payload: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
