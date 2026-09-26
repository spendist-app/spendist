import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baselinePath = join(root, '.oxlint-baseline.json');
const oxlintPath = join(root, 'node_modules/oxlint/bin/oxlint');
const sourcePaths = ['apps', 'libs', 'tools', 'supabase/functions'];
const writeBaseline = process.argv.includes('--write');

const run = spawnSync(
  process.execPath,
  [oxlintPath, '--format', 'json', ...sourcePaths],
  { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
);

if (run.error || !run.stdout) {
  console.error(run.error ?? run.stderr ?? 'Oxlint produced no JSON output.');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  console.error(run.stderr || 'Could not parse Oxlint JSON output.');
  process.exit(1);
}

const sourceLines = new Map();
const warningCounts = new Map();
const warningDetails = new Map();
const errors = [];

for (const diagnostic of report.diagnostics) {
  const filename = relative(
    root,
    resolve(root, diagnostic.filename)
  ).replaceAll('\\', '/');

  const line = diagnostic.labels?.[0]?.span?.line ?? 0;
  const location = `${filename}:${line} ${diagnostic.code}`;

  if (diagnostic.severity === 'error') {
    errors.push(location);
    continue;
  }

  if (!sourceLines.has(filename)) {
    sourceLines.set(
      filename,
      readFileSync(join(root, filename), 'utf8').split(/\r?\n/)
    );
  }

  const source =
    sourceLines.get(filename)?.[line - 1]?.trim() ?? diagnostic.message;
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([filename, diagnostic.code, source]))
    .digest('hex');

  warningCounts.set(fingerprint, (warningCounts.get(fingerprint) ?? 0) + 1);
  warningDetails.set(fingerprint, location);
}

if (errors.length > 0 || run.status !== 0) {
  console.error(`Oxlint found ${errors.length} errors.`);
  for (const error of errors.slice(0, 20)) console.error(`  ${error}`);
  if (run.stderr) console.error(run.stderr);
  process.exit(1);
}

if (writeBaseline) {
  const fingerprints = Object.fromEntries(
    [...warningCounts].sort(([left], [right]) => left.localeCompare(right))
  );
  writeFileSync(
    baselinePath,
    `${JSON.stringify({ version: 1, fingerprints }, null, 2)}\n`
  );
  console.log(
    `Saved ${report.diagnostics.length} existing warnings from ${report.number_of_files} files.`
  );
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
if (baseline.version !== 1) {
  console.error('Unsupported Oxlint baseline version.');
  process.exit(1);
}

const newWarnings = [...warningCounts]
  .filter(
    ([fingerprint, count]) => count > (baseline.fingerprints[fingerprint] ?? 0)
  )
  .map(([fingerprint, count]) => ({
    location: warningDetails.get(fingerprint),
    count: count - (baseline.fingerprints[fingerprint] ?? 0),
  }));

if (newWarnings.length > 0) {
  console.error(`Oxlint found ${newWarnings.length} new warning patterns:`);
  for (const warning of newWarnings.slice(0, 20)) {
    console.error(`  ${warning.location} (${warning.count})`);
  }
  process.exit(1);
}

console.log(
  `Oxlint passed: ${report.number_of_files} files, ${report.diagnostics.length} baselined warnings, no new findings.`
);
