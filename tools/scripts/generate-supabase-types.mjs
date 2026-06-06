import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const OUTPUT_PATH = resolve(
  'libs',
  'data-access',
  'supabase-types',
  'src',
  'generated',
  'database.types.ts',
);

function ensureOutDir(path) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
}

function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('[supabase-types] Missing SUPABASE_DB_URL environment variable.');
    process.exit(1);
  }

  ensureOutDir(OUTPUT_PATH);

  const result = spawnSync(
    'npx',
    [
      'supabase',
      'gen',
      'types',
      'typescript',
      '--db-url',
      dbUrl,
      '--schema',
      'public,storage',
    ],
    {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: process.env,
    },
  );

  if (result.error) {
    console.error('[supabase-types] Failed to run Supabase CLI:', result.error);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }

  const header = `/**
 * This file is auto-generated via Supabase CLI.
 * Run \`npm run db:types:local\` to refresh the types.
 */
`;

  writeFileSync(OUTPUT_PATH, header + result.stdout.toString('utf8'));
  console.log(`[supabase-types] Wrote database types to ${OUTPUT_PATH}`);
}

main();
