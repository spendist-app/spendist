import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  parseSupabaseQueryRows,
  verifyRecurringScheduler,
} from './verify-recurring-scheduler.mjs';

const environment = {
  INTERNAL_FUNCTION_SECRET: 'test-secret',
  SUPABASE_REMOTE_DB_URL: 'postgresql://example.test/postgres',
  NG_APP_SUPABASE_URL: 'https://production.supabase.co',
  NG_APP_SUPABASE_FUNCTIONS_URL:
    'https://production.supabase.co/functions/v1',
};

test('parses CLI JSON rows in GitHub Actions and agent mode', () => {
  assert.deepEqual(parseSupabaseQueryRows('[{"matches":true}]'), [
    { matches: true },
  ]);
  assert.deepEqual(
    parseSupabaseQueryRows('{"rows":[{"matches":false}]}'),
    [{ matches: false }]
  );
  assert.throws(
    () => parseSupabaseQueryRows(' matches\n---------\n t'),
    /Unexpected response/
  );
});

test('accepts matching Vault and a scoped authenticated Edge response', async () => {
  let requestedBody;

  await verifyRecurringScheduler(environment, {
    readVaultSecretMatch: () => true,
    fetch: async (_url, options) => {
      requestedBody = JSON.parse(options.body);

      return {
        status: 404,
        json: async () => ({ error: 'Recurring transaction not found' }),
      };
    },
  });

  assert.deepEqual(requestedBody, {
    recurringId: '00000000-0000-0000-0000-000000000000',
  });
});

test('rejects a stale Vault secret before calling the Edge Function', async () => {
  let called = false;

  await assert.rejects(
    verifyRecurringScheduler(environment, {
      readVaultSecretMatch: () => false,
      fetch: async () => {
        called = true;
      },
    }),
    /Vault secret differs/
  );

  assert.equal(called, false);
});

test('rejects an unauthorized Edge Function response', async () => {
  await assert.rejects(
    verifyRecurringScheduler(environment, {
      readVaultSecretMatch: () => true,
      fetch: async () => ({
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      }),
    }),
    /HTTP 401/
  );
});

test('rejects a functions URL from a different project', async () => {
  await assert.rejects(
    verifyRecurringScheduler({
      ...environment,
      NG_APP_SUPABASE_FUNCTIONS_URL:
        'https://staging.supabase.co/functions/v1',
    }),
    /different project/
  );
});
