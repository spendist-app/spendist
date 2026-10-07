import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parse } from 'dotenv';

import { renderSupabaseEdgeSecrets } from './write-supabase-edge-secrets.mjs';

test('writes the internal token once without literal escape characters', () => {
  const secret = 'dummy-Token_123';

  const output = renderSupabaseEdgeSecrets({
    INTERNAL_FUNCTION_SECRET: secret,
    AWS_ACCESS_KEY_ID: 'dummy-key',
    AWS_SECRET_ACCESS_KEY: 'dummy/secret+value=',
    AWS_REGION: 'eu-central-1',
    EMAIL_FROM: 'Spendist <noreply@example.test>',
  });

  const parsed = parse(output);

  assert.equal(parsed.INTERNAL_FUNCTION_SECRET, secret);
  assert.deepEqual(Object.keys(parsed).sort(), [
    'APP_URL',
    'INTERNAL_FUNCTION_SECRET',
  ]);
  assert.equal(parsed.APP_URL, 'https://spendist.app');
  assert.doesNotMatch(parsed.INTERNAL_FUNCTION_SECRET, /[\\"]/);
});

test('uses the fallback token and rejects missing required secrets', () => {
  const environment = {
    ROUTINE_RUNNER_SECRET: 'fallback-token',
    AWS_ACCESS_KEY_ID: 'dummy-key',
    AWS_SECRET_ACCESS_KEY: 'dummy-secret',
    AWS_REGION: 'eu-central-1',
    EMAIL_FROM: 'noreply@example.test',
    CLOUDFLARE_PRODUCTION_URL: 'https://spendist.app/',
  };

  assert.equal(
    parse(renderSupabaseEdgeSecrets(environment)).INTERNAL_FUNCTION_SECRET,
    'fallback-token'
  );
  assert.equal(
    parse(renderSupabaseEdgeSecrets(environment)).APP_URL,
    'https://spendist.app'
  );
  assert.throws(
    () =>
      renderSupabaseEdgeSecrets({ ...environment, ROUTINE_RUNNER_SECRET: '' }),
    /Missing INTERNAL_FUNCTION_SECRET/
  );
});

test('preserves separately provisioned email credentials across deployment', () => {
  const output = renderSupabaseEdgeSecrets({
    INTERNAL_FUNCTION_SECRET: 'existing-runner',
    EMAIL_SENDER_AWS_ACCESS_KEY_ID: 'dummy-sender',
    EMAIL_SENDER_AWS_SECRET_ACCESS_KEY: 'dummy-sender-secret',
    EMAIL_MONITOR_AWS_ACCESS_KEY_ID: 'dummy-monitor',
    EMAIL_MONITOR_AWS_SECRET_ACCESS_KEY: 'dummy-monitor-secret',
    EMAIL_RUNNER_SECRET: 'dummy-email-runner',
    SEND_EMAIL_HOOK_SECRET: 'dummy-hook',
  });

  assert.deepEqual(Object.keys(parse(output)).sort(), [
    'APP_URL',
    'INTERNAL_FUNCTION_SECRET',
  ]);
  assert.doesNotMatch(output, /dummy-|EMAIL_|AWS_/);
});
