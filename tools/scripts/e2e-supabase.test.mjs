import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildE2ESupabaseConfig, readSectionPort } from './e2e-supabase.mjs';

const devConfig = readFileSync(
  new URL('../../supabase/config.toml', import.meta.url),
  'utf8'
);

test('gives the E2E stack its own project id', () => {
  const config = buildE2ESupabaseConfig(devConfig);

  assert.match(config, /^project_id = "spendist-app-e2e"$/m);
});

test('moves every service port away from the development stack', () => {
  const config = buildE2ESupabaseConfig(devConfig);

  for (const section of ['api', 'db', 'studio', 'inbucket', 'analytics']) {
    const devPort = readSectionPort(devConfig, section);

    assert.ok(devPort, `development ${section} port`);
    assert.equal(readSectionPort(config, section), devPort - 2000, section);
  }

  assert.match(config, /^shadow_port = 53320$/m);
  assert.match(config, /^inspector_port = 53383$/m);
});

test('points Auth at the E2E dev server and keeps comments intact', () => {
  const config = buildE2ESupabaseConfig(devConfig);

  assert.match(config, /^site_url = "http:\/\/localhost:4300"$/m);
  assert.match(config, /# port = 587/);
});

test('allows the E2E dev server in the shared redirect allow-list', () => {
  assert.match(devConfig, /"http:\/\/localhost:4300\/auth\/confirm"/);
  assert.match(devConfig, /"http:\/\/localhost:4300\/reset-password"/);
});
