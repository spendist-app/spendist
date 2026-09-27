import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const run = spawnSync(
  process.execPath,
  [join(root, 'node_modules/oxlint/bin/oxlint'), '--deny-warnings', '.'],
  { cwd: root, stdio: 'inherit' }
);

if (run.error) console.error(run.error);

process.exit(run.error ? 1 : run.status ?? 1);
