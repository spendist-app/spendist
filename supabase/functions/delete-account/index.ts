import { createClient } from '@supabase/supabase-js';

type DeleteAccountBody = {
  password?: unknown;
};

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BATCHES = 20;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
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
  const password =
    typeof body.password === 'string' ? body.password : '';
  if (!password || password.length > 1024) {
    return json({ code: 'password_required' }, 400);
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

  if (!serviceKey || !publicKey) {
    return json({ code: 'server_configuration_error' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { data: userData, error: userError } =
    await admin.auth.getUser(token);
  const user = userData.user;

  if (userError || !user?.email) {
    return json({ code: 'unauthorized' }, 401);
  }

  const passwordClient = createClient(supabaseUrl, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { data: passwordData, error: passwordError } =
    await passwordClient.auth.signInWithPassword({
      email: user.email,
      password,
    });

  if (
    passwordError ||
    !passwordData.user ||
    passwordData.user.id !== user.id
  ) {
    return json({ code: 'invalid_password' }, 403);
  }

  const avatarError = await deleteAvatarObjects(admin, user.id);
  if (avatarError) {
    return json({ code: 'avatar_cleanup_failed' }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(
    user.id,
    false,
  );
  if (deleteError) {
    return json({ code: 'account_deletion_failed' }, 500);
  }

  return json({ deleted: true }, 200);
});

async function deleteAvatarObjects(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<unknown | null> {
  for (let batch = 0; batch < MAX_AVATAR_BATCHES; batch += 1) {
    const { data, error } = await admin.storage
      .from(AVATAR_BUCKET)
      .list(userId, { limit: 1000 });

    if (error) {
      return error;
    }

    const paths = (data ?? [])
      .filter((object) => object.id !== null)
      .map((object) => `${userId}/${object.name}`);
    if (paths.length === 0) {
      return null;
    }

    const { error: removeError } = await admin.storage
      .from(AVATAR_BUCKET)
      .remove(paths);
    if (removeError) {
      return removeError;
    }
  }

  return new Error('Avatar cleanup exceeded the batch limit.');
}

async function parseBody(request: Request): Promise<DeleteAccountBody> {
  try {
    return (await request.json()) as DeleteAccountBody;
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

function json(
  payload: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}
