import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanPublicAssets } from './check-public-assets-secrets.mjs';

test('allows public browser configuration across generated files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spendist-public-assets-'));

  try {
    await writeFile(
      join(directory, 'env.js'),
      'globalThis.__env = { SUPABASE_URL: "https://example.invalid", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fake" };'
    );

    const result = await scanPublicAssets(directory, {
      SUPABASE_REMOTE_DB_URL:
        'postgresql://postgres:FAKE_DB_PASSWORD@db.invalid/postgres',
    });

    assert.equal(result.filesScanned, 1);
    assert.deepEqual(result.findings, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('finds fake privileged values in nested chunks and source maps without returning values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spendist-public-assets-'));
  const databasePassword = 'FAKE_DB_PASSWORD_FOR_REGRESSION';
  const awsSecret = 'FAKE_AWS_SECRET_FOR_REGRESSION';
  const awsAccessKey = 'AKIAFAKECIACCESSKEY1';
  const internalSecret = 'FAKE_INTERNAL_SECRET_FOR_REGRESSION';
  const supabaseSecret = 'sb_secret_FAKE_SUPABASE_SECRET_FOR_REGRESSION';

  try {
    await mkdir(join(directory, 'chunks'));
    await writeFile(
      join(directory, 'chunks', 'lazy.js'),
      `const credentials = ["${databasePassword}", "${awsSecret}", "${awsAccessKey}"];`
    );
    await writeFile(
      join(directory, 'chunks', 'lazy.js.map'),
      JSON.stringify({ sourcesContent: [internalSecret, supabaseSecret] })
    );

    const result = await scanPublicAssets(directory, {
      SUPABASE_REMOTE_DB_URL: `postgresql://postgres:${databasePassword}@db.invalid/postgres`,
      AWS_SECRET_ACCESS_KEY: awsSecret,
      AWS_ACCESS_KEY_ID: awsAccessKey,
      INTERNAL_FUNCTION_SECRET: internalSecret,
      SUPABASE_SECRET_KEY: supabaseSecret,
    });

    assert.equal(result.filesScanned, 2);
    assert.deepEqual(
      new Set(result.findings.map(({ rule }) => rule)),
      new Set([
        'SUPABASE_REMOTE_DB_URL',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_ACCESS_KEY_ID',
        'AWS access key ID',
        'INTERNAL_FUNCTION_SECRET',
        'SUPABASE_SECRET_KEY',
        'Supabase secret key',
      ])
    );
    assert.equal(JSON.stringify(result).includes(databasePassword), false);
    assert.equal(JSON.stringify(result).includes(awsSecret), false);
    assert.equal(JSON.stringify(result).includes(internalSecret), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('detects the separate email credentials without returning secret values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spendist-email-assets-'));
  const secret = 'FAKE_EMAIL_RUNNER_SECRET_FOR_REGRESSION';

  try {
    await writeFile(
      join(directory, 'chunk.js'),
      'const unsafe = "' + secret + '";'
    );

    const result = await scanPublicAssets(directory, {
      EMAIL_RUNNER_SECRET: secret,
    });

    assert.equal(
      result.findings.some(({ rule }) => rule === 'EMAIL_RUNNER_SECRET'),
      true
    );
    assert.equal(JSON.stringify(result).includes(secret), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
