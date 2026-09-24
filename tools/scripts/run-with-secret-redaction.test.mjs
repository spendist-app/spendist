import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  redactSensitiveText,
  run,
  secretVariants,
} from './run-with-secret-redaction.mjs';

test('redacts raw, encoded, base64, and URL password variants', () => {
  const secret = 'postgresql://user:p%40ssword@example.test/postgres';
  const variants = secretVariants([secret]);
  const output = variants.join('\n');
  const redacted = redactSensitiveText(output, [secret]);

  assert.doesNotMatch(redacted, /p%40ssword|p@ssword/);
  assert.equal(
    redacted.split('\n').every((line) => line === '[REDACTED]'),
    true
  );
});

test('redacts SQL-escaped and JSON-escaped secret variants', () => {
  const secret = "line one's secret\nnext line";
  const output = `${secret.replaceAll("'", "''")}\n${JSON.stringify(
    secret
  ).slice(1, -1)}`;
  const redacted = redactSensitiveText(output, [secret]);

  assert.doesNotMatch(redacted, /one''s|\\nnext line/);
});

test('wrapper redacts child output and preserves its exit code', () => {
  const secret = 'ci-password-value';
  let stdout = '';
  let stderr = '';
  let receivedArguments;

  const status = run(
    [
      '--secret-env',
      'TEST_SECRET',
      '--',
      'example-command',
      '{ENV:TEST_SECRET}',
    ],
    { TEST_SECRET: secret },
    (command, args) => {
      receivedArguments = { command, args };
      return {
        status: 23,
        stdout: secret,
        stderr: Buffer.from(secret).toString('base64'),
      };
    },
    { write: (value) => (stdout += value) },
    { write: (value) => (stderr += value) }
  );

  assert.deepEqual(receivedArguments, {
    command: 'example-command',
    args: [secret],
  });
  assert.equal(status, 23);
  assert.equal(stdout, '[REDACTED]');
  assert.equal(stderr, '[REDACTED]');
  assert.doesNotMatch(`${stdout}${stderr}`, new RegExp(secret));
});
