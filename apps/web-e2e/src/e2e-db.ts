import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { workspaceRoot } from '@nx/devkit';

type ResetPhase = 'setup' | 'teardown';

const DEFAULT_RESET_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 5000;
const DEFAULT_EMAIL = 'e2e-shared-user@spendist.dev';
const DEFAULT_PASSWORD = 'Test1234!';

type AuthSessionResponse = {
  access_token?: string;
  user?: {
    id?: string;
  };
};

type BootstrapRow = {
  id: string;
};

export async function resetDatabase(phase: ResetPhase): Promise<void> {
  const envFile = resolveEnvFile();
  const dbUrl =
    process.env['SUPABASE_E2E_DB_URL'] ??
    (envFile ? readEnvValue(envFile, 'SUPABASE_E2E_DB_URL') : null);

  if (!dbUrl) {
    throw new Error(
      `Missing SUPABASE_E2E_DB_URL for e2e ${phase}. Set SUPABASE_E2E_DB_URL or provide an env file via E2E_ENV_FILE.`
    );
  }

  const localDbUrl =
    process.env['SUPABASE_DB_URL'] ??
    (envFile ? readEnvValue(envFile, 'SUPABASE_DB_URL') : null);
  if (localDbUrl && areSameDatabaseUrl(dbUrl, localDbUrl)) {
    throw new Error(
      'Refusing to reset database: SUPABASE_E2E_DB_URL points to SUPABASE_DB_URL.'
    );
  }

  const remoteDbUrl =
    process.env['SUPABASE_REMOTE_DB_URL'] ??
    (envFile ? readEnvValue(envFile, 'SUPABASE_REMOTE_DB_URL') : null);
  if (remoteDbUrl && areSameDatabaseUrl(dbUrl, remoteDbUrl)) {
    throw new Error(
      'Refusing to reset database: SUPABASE_E2E_DB_URL points to SUPABASE_REMOTE_DB_URL.'
    );
  }

  await resetDatabaseWithRetry(dbUrl, phase);
}

export async function ensureE2EAccount(): Promise<void> {
  const envFile = resolveEnvFile();
  const supabaseUrl =
    readFirstAvailableEnvValue(
      ['NG_APP_SUPABASE_URL', 'SUPABASE_URL', 'API_URL'],
      envFile
    ) ?? 'http://127.0.0.1:55321';
  const publishableKey = readFirstAvailableEnvValue(
    [
      'NG_APP_SUPABASE_PUBLISHABLE_KEY',
      'NG_APP_SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_ANON_KEY',
      'PUBLISHABLE_KEY',
      'ANON_KEY',
    ],
    envFile
  );

  if (!publishableKey) {
    throw new Error('Missing Supabase publishable/anon key for e2e bootstrap.');
  }

  const email = envValueOrDefault('E2E_AUTH_EMAIL', DEFAULT_EMAIL);
  const password = envValueOrDefault('E2E_AUTH_PASSWORD', DEFAULT_PASSWORD);
  const baseUrl = supabaseUrl.replace(/\/+$/, '');

  const signedIn = await signIn(baseUrl, publishableKey, email, password);
  if (!signedIn.ok) {
    await signUp(baseUrl, publishableKey, email, password);
  }

  const session = await signIn(baseUrl, publishableKey, email, password);
  if (!session.ok) {
    throw new Error(
      `[e2e-db] Failed to sign in e2e auth user: ${truncateForLog(
        session.body
      )}`
    );
  }

  const data = JSON.parse(session.body) as AuthSessionResponse;
  if (!data.access_token || !data.user?.id) {
    throw new Error(
      '[e2e-db] Missing access token or user id in auth response.'
    );
  }

  await ensureUserBootstrapData(
    baseUrl,
    publishableKey,
    data.access_token,
    data.user.id
  );
}

async function ensureUserBootstrapData(
  baseUrl: string,
  publishableKey: string,
  accessToken: string,
  userId: string
): Promise<void> {
  const headers = {
    apikey: publishableKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  await fetch(`${baseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      full_name: 'Spendist E2E',
      language: 'en',
      timezone: 'UTC',
    }),
  });

  const categories = await fetch(
    `${baseUrl}/rest/v1/categories?select=id&owner_id=eq.${userId}&limit=1`,
    { headers }
  );
  const existingCategories = await parseJsonArray<BootstrapRow>(
    categories,
    'load bootstrap categories'
  );
  if (existingCategories.length > 0) {
    return;
  }

  const group =
    (await findBootstrapRowByName(
      baseUrl,
      headers,
      'categories_group',
      userId,
      'Essentials'
    )) ??
    (await createBootstrapGroup(baseUrl, headers, userId));
  if (!group?.id) {
    throw new Error('[e2e-db] Failed to create bootstrap category group.');
  }

  const category =
    (await findBootstrapRowByName(
      baseUrl,
      headers,
      'categories',
      userId,
      'Groceries'
    )) ??
    (await createBootstrapCategory(baseUrl, headers, userId, group.id));
  if (!category?.id) {
    throw new Error('[e2e-db] Failed to create bootstrap category.');
  }
}

async function findBootstrapRowByName(
  baseUrl: string,
  headers: Record<string, string>,
  table: 'categories_group' | 'categories',
  userId: string,
  name: string
): Promise<BootstrapRow | null> {
  const response = await fetch(
    `${baseUrl}/rest/v1/${table}?select=id&owner_id=eq.${encodeURIComponent(
      userId
    )}&name=eq.${encodeURIComponent(name)}&limit=1`,
    { headers }
  );
  const rows = await parseJsonArray<BootstrapRow>(
    response,
    `load bootstrap ${table}`
  );
  return rows[0] ?? null;
}

async function createBootstrapGroup(
  baseUrl: string,
  headers: Record<string, string>,
  userId: string
): Promise<BootstrapRow | null> {
  const response = await fetch(`${baseUrl}/rest/v1/categories_group?select=id`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      owner_id: userId,
      name: 'Essentials',
      color: '#0EA5A5',
      icon: 'heroHome',
    }),
  });
  const rows = await parseJsonArray<BootstrapRow>(
    response,
    'create bootstrap category group'
  );
  return rows[0] ?? null;
}

async function createBootstrapCategory(
  baseUrl: string,
  headers: Record<string, string>,
  userId: string,
  groupId: string
): Promise<BootstrapRow | null> {
  const response = await fetch(`${baseUrl}/rest/v1/categories?select=id`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      owner_id: userId,
      group_id: groupId,
      name: 'Groceries',
      color: '#0EA5A5',
      icon: 'heroShoppingCart',
    }),
  });
  const rows = await parseJsonArray<BootstrapRow>(
    response,
    'create bootstrap category'
  );
  return rows[0] ?? null;
}

async function parseJsonArray<T>(
  response: Response,
  action: string
): Promise<T[]> {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `[e2e-db] Failed to ${action} (${response.status}): ${truncateForLog(
        body
      )}`
    );
  }

  const parsed = body ? (JSON.parse(body) as unknown) : [];
  if (!Array.isArray(parsed)) {
    throw new Error(
      `[e2e-db] Expected array while trying to ${action}: ${truncateForLog(
        body
      )}`
    );
  }

  return parsed as T[];
}

async function signUp(
  baseUrl: string,
  publishableKey: string,
  email: string,
  password: string
): Promise<void> {
  const response = await fetch(`${baseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: authHeaders(publishableKey),
    body: JSON.stringify({
      email,
      password,
      data: {
        username: 'spendist_e2e',
        full_name: 'Spendist E2E',
        language: 'en',
        timezone: 'UTC',
        default_currency_id: 1,
        wallet_currency_id: 1,
      },
    }),
  });

  const body = await response.text();
  if (!response.ok && !body.toLowerCase().includes('already registered')) {
    throw new Error(
      `[e2e-db] Failed to create e2e auth user (${
        response.status
      }): ${truncateForLog(body)}`
    );
  }
}

async function signIn(
  baseUrl: string,
  publishableKey: string,
  email: string,
  password: string
): Promise<{ ok: boolean; body: string }> {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders(publishableKey),
    body: JSON.stringify({ email, password }),
  });

  return {
    ok: response.ok,
    body: await response.text(),
  };
}

function authHeaders(publishableKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };
}

async function resetDatabaseWithRetry(
  dbUrl: string,
  phase: ResetPhase
): Promise<void> {
  const attempts = resolveResetAttempts();
  const resetArgs = resolveResetArgs(dbUrl);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await runCommand('npx', ['supabase', 'db', 'reset', ...resetArgs]);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= attempts) {
        break;
      }

      const delayMs = RETRY_BASE_DELAY_MS * attempt;
      console.warn(
        `[e2e-db] supabase db reset failed during ${phase} (attempt ${attempt}/${attempts}): ${lastError.message}`
      );
      await wait(delayMs);
    }
  }

  throw new Error(
    `[e2e-db] Failed to reset database during ${phase} after ${attempts} attempts. Last error: ${
      lastError?.message ?? 'Unknown error'
    }`
  );
}

function resolveResetAttempts(): number {
  const fromEnv = Number(process.env['E2E_DB_RESET_ATTEMPTS'] ?? '');
  return Number.isInteger(fromEnv) && fromEnv > 0
    ? fromEnv
    : DEFAULT_RESET_ATTEMPTS;
}

function resolveResetArgs(dbUrl: string): string[] {
  if (isLocalDatabaseUrl(dbUrl)) {
    return [];
  }
  return ['--db-url', dbUrl];
}

function isLocalDatabaseUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1'
    );
  } catch {
    return false;
  }
}

function areSameDatabaseUrl(left: string, right: string): boolean {
  return normalizeDatabaseUrl(left) === normalizeDatabaseUrl(right);
}

function normalizeDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port || defaultPort(protocol);
    const pathname = parsed.pathname || '/';
    return `${protocol}//${hostname}:${port}${pathname}`;
  } catch {
    return trimmed;
  }
}

function defaultPort(protocol: string): string {
  if (protocol === 'postgresql:' || protocol === 'postgres:') {
    return '5432';
  }
  return '';
}

function readFirstAvailableEnvValue(
  keys: readonly string[],
  envFile: string | null
): string | null {
  for (const key of keys) {
    const value =
      process.env[key] ?? (envFile ? readEnvValue(envFile, key) : null);
    if (value) {
      return value;
    }
  }
  return null;
}

function readEnvValue(file: string, key: string): string | null {
  const fullPath = resolve(workspaceRoot, file);
  const content = readFileSync(fullPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const name = trimmed.slice(0, separator).trim();
    if (name !== key) {
      continue;
    }
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return null;
}

function envValueOrDefault(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    return fallback;
  }

  if (key.endsWith('_EMAIL') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return fallback;
  }

  return value;
}

function resolveEnvFile(): string | null {
  const explicit = process.env['E2E_ENV_FILE'];
  if (explicit) {
    return explicit;
  }

  for (const file of ['.env.e2e', '.local_env.e2e']) {
    if (existsSync(resolve(workspaceRoot, file))) {
      return file;
    }
  }
  return null;
}

function runCommand(command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
      }
    });
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function truncateForLog(value: string): string {
  return value.length > 500 ? `${value.slice(0, 500)}...` : value;
}
