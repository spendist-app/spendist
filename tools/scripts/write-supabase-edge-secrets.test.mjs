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
  assert.equal(parsed.AWS_SECRET_ACCESS_KEY, 'dummy/secret+value=');
  assert.equal(parsed.EMAIL_FROM, 'Spendist <noreply@example.test>');
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
  assert.equal(parse(renderSupabaseEdgeSecrets(environment)).APP_URL, 'https://spendist.app');
  assert.throws(
    () => renderSupabaseEdgeSecrets({ ...environment, AWS_SECRET_ACCESS_KEY: '' }),
    /Missing AWS_SECRET_ACCESS_KEY/
  );
});
