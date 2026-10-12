import { createClient } from 'npm:@supabase/supabase-js@2.89.0';
import { createHash } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) throw new Error('Email configuration unavailable');

  return value;
}

export function emailDatabase() {
  return createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export function runnerAuthorized(request: Request): boolean {
  const secret = Deno.env.get('EMAIL_RUNNER_SECRET');
  const authorization = request.headers.get('authorization');

  if (!secret || !authorization) return false;

  const expected = createHash('sha256')
    .update('Bearer ' + secret)
    .digest();

  const received = createHash('sha256').update(authorization).digest();

  return timingSafeEqual(expected, received);
}

export function awsCredentials(prefix: string) {
  return {
    accessKeyId: requiredEnv(prefix + '_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnv(prefix + '_SECRET_ACCESS_KEY'),
    sessionToken: Deno.env.get(prefix + '_SESSION_TOKEN'),
  };
}

export function emailResponse(status: number, code: string): Response {
  return Response.json(
    { code },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function readEmailBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();

  if (!reader) throw new Error('Missing body');

  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) break;

    size += chunk.value.byteLength;

    if (size > 32768) {
      await reader.cancel();
      throw new Error('Body too large');
    }

    chunks.push(chunk.value);
  }

  const combined = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}
