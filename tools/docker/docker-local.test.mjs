import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseSupabaseEnvironment,
  resolvePublicSupabaseEnvironment,
} from './docker-local.mjs';

test('parses quoted and unquoted Supabase status values', () => {
  assert.deepEqual(
    parseSupabaseEnvironment(`
API_URL="http://127.0.0.1:55321"
PUBLISHABLE_KEY=public-key
# ignored
DB_URL="private-database-value"
`),
    {
      API_URL: 'http://127.0.0.1:55321',
      PUBLISHABLE_KEY: 'public-key',
      DB_URL: 'private-database-value',
    }
  );
});

test('selects only browser-safe local Supabase values', () => {
  assert.deepEqual(
    resolvePublicSupabaseEnvironment({
      API_URL: 'http://127.0.0.1:55321',
      PUBLISHABLE_KEY: 'public-key',
      SECRET_KEY: 'must-not-leak',
      DB_URL: 'private-database-value',
    }),
    {
      SPENDIST_DOCKER_SUPABASE_URL: 'http://127.0.0.1:55321',
      SPENDIST_DOCKER_SUPABASE_PUBLISHABLE_KEY: 'public-key',
      SPENDIST_DOCKER_SUPABASE_FUNCTIONS_URL:
        'http://127.0.0.1:55321/functions/v1',
    }
  );
});

test('accepts localhost but rejects a remote Supabase URL', () => {
  assert.equal(
    resolvePublicSupabaseEnvironment({
      API_URL: 'http://localhost:55321/',
      ANON_KEY: 'public-key',
    }).SPENDIST_DOCKER_SUPABASE_URL,
    'http://localhost:55321'
  );

  assert.throws(
    () =>
      resolvePublicSupabaseEnvironment({
        API_URL: 'https://example.supabase.co',
        PUBLISHABLE_KEY: 'public-key',
      }),
    /Refusing to start Docker with a non-local Supabase URL/
  );
});

test('requires both the local URL and publishable key', () => {
  assert.throws(
    () => resolvePublicSupabaseEnvironment({ PUBLISHABLE_KEY: 'public-key' }),
    /did not return a local API URL/
  );
  assert.throws(
    () =>
      resolvePublicSupabaseEnvironment({
        API_URL: 'http://127.0.0.1:55321',
      }),
    /did not return a publishable key/
  );
});
