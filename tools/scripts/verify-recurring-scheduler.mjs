#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateSupabaseFunctionsUrl } from './validate-supabase-functions-url.mjs';

const PROBE_RECURRING_ID = '00000000-0000-0000-0000-000000000000';

function firstEnv(environment, ...names) {
  return names.map((name) => environment[name]?.trim()).find(Boolean) ?? '';
}

function readVaultSecretMatch(dbUrl, expectedSecret) {
  const digest = createHash('sha256').update(expectedSecret).digest('hex');
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'spendist-scheduler-'));
  const sqlFile = join(temporaryDirectory, 'query.sql');

  writeFileSync(
    sqlFile,
    `select encode(sha256(convert_to(decrypted_secret, 'UTF8')), 'hex') = '${digest}' as matches
from vault.decrypted_secrets
where name = 'spendist_internal_function_secret';\n`,
    { mode: 0o600 }
  );

  let result;

  try {
    result = spawnSync(
      'node_modules/.bin/supabase',
      ['db', 'query', '--db-url', dbUrl, '--file', sqlFile],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  if (result.error || result.status !== 0) {
    throw new Error('Could not verify the scheduled function secret in Vault');
  }

  let rows;

  try {
    rows = JSON.parse(result.stdout).rows;
  } catch {
    throw new Error('Unexpected response from Supabase database query');
  }

  return rows?.length === 1 && rows[0].matches === true;
}

export async function verifyRecurringScheduler(
  environment = process.env,
  dependencies = {
    readVaultSecretMatch,
    fetch,
  }
) {
  const secret = firstEnv(
    environment,
    'INTERNAL_FUNCTION_SECRET',
    'ROUTINE_RUNNER_SECRET',
    'RECURRING_PAYMENTS_SECRET'
  );

  const dbUrl = firstEnv(
    environment,
    'SUPABASE_REMOTE_DB_URL',
    'SUPABASE_PSQL_DB_URL'
  );

  const supabaseUrl = firstEnv(
    environment,
    'NG_APP_SUPABASE_URL',
    'SUPABASE_URL'
  );

  const functionsUrl =
    environment.NG_APP_SUPABASE_FUNCTIONS_URL?.trim() ||
    `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

  if (!secret || !dbUrl || !supabaseUrl) {
    throw new Error('Missing scheduled function verification configuration');
  }

  validateSupabaseFunctionsUrl(functionsUrl, supabaseUrl);

  if (!dependencies.readVaultSecretMatch(dbUrl, secret)) {
    throw new Error('Vault secret differs from the scheduled function secret');
  }

  const response = await dependencies.fetch(
    `${functionsUrl.replace(/\/$/, '')}/process-recurring-payments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recurringId: PROBE_RECURRING_ID }),
    }
  );

  const body = await response.json().catch(() => null);

  if (
    response.status !== 404 ||
    body?.error !== 'Recurring transaction not found'
  ) {
    throw new Error(
      `Scheduled recurring function verification failed (HTTP ${response.status})`
    );
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    await verifyRecurringScheduler();
    console.log('Recurring scheduler Vault and Edge Function authentication verified.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
