import { spawnSync } from 'node:child_process';

const LOCAL_INTERNAL_FUNCTION_SECRET = 'local-internal-function-secret';
const LOCAL_FUNCTIONS_BASE_URL = 'http://kong:8000/functions/v1';

function isLocalDatabaseUrl(value) {
  return /127\.0\.0\.1|localhost|supabase_db_spendist-app|db\.supabase\.internal/.test(value);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function resolveDbUrl() {
  return process.env.SUPABASE_DB_URL?.trim() || process.env.SUPABASE_REMOTE_DB_URL?.trim() || '';
}

function resolveFunctionsBaseUrl(isLocal) {
  const explicit =
    process.env.SUPABASE_FUNCTIONS_INTERNAL_URL?.trim() ||
    process.env.NG_APP_SUPABASE_FUNCTIONS_URL?.trim();

  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  if (isLocal) {
    return LOCAL_FUNCTIONS_BASE_URL;
  }

  const supabaseUrl = process.env.NG_APP_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error('Missing NG_APP_SUPABASE_FUNCTIONS_URL or NG_APP_SUPABASE_URL');
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function renderSecretBlock(name, value, description) {
  return `
do $$
declare
  v_secret_id uuid;
begin
  select id
    into v_secret_id
  from vault.secrets
  where name = ${sqlString(name)}
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(${sqlString(value)}, ${sqlString(name)}, ${sqlString(description)});
  else
    perform vault.update_secret(v_secret_id, ${sqlString(value)}, ${sqlString(name)}, ${sqlString(description)});
  end if;
end;
$$;`;
}

function runSql(dbUrl, sql) {
  const result = spawnSync('npx', ['supabase', 'db', 'query', '--db-url', dbUrl, sql], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const dbUrl = resolveDbUrl();
  if (!dbUrl) {
    throw new Error('Missing SUPABASE_DB_URL or SUPABASE_REMOTE_DB_URL');
  }

  const isLocal = isLocalDatabaseUrl(dbUrl);
  const functionsBaseUrl = resolveFunctionsBaseUrl(isLocal);
  const internalFunctionSecret = firstEnv(
    'INTERNAL_FUNCTION_SECRET',
    'ROUTINE_RUNNER_SECRET',
    'RECURRING_PAYMENTS_SECRET',
    'EXCHANGE_RATES_SYNC_SECRET',
  );

  if (!internalFunctionSecret && !isLocal) {
    throw new Error('Missing INTERNAL_FUNCTION_SECRET');
  }

  const scheduledFunctionSecret = internalFunctionSecret || LOCAL_INTERNAL_FUNCTION_SECRET;

  runSql(dbUrl, 'create extension if not exists supabase_vault with schema vault');
  runSql(
    dbUrl,
    renderSecretBlock(
      'spendist_functions_base_url',
      functionsBaseUrl,
      'Base URL for Spendist scheduled Edge Function invocations.',
    ),
  );
  runSql(
    dbUrl,
    renderSecretBlock(
      'spendist_internal_function_secret',
      scheduledFunctionSecret,
      'Bearer token for Spendist scheduled Edge Function invocations.',
    ),
  );

  console.log(`[supabase-vault] Synced scheduled function secrets for ${isLocal ? 'local' : 'remote'} database.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
