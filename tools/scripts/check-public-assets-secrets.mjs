import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const PRIVATE_ENV_KEYS = [
  'SUPABASE_DB_URL',
  'SUPABASE_REMOTE_DB_URL',
  'SUPABASE_PSQL_DB_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_JWT_SECRET',
  'SUPABASE_ACCESS_TOKEN',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'EMAIL_RUNNER_SECRET',
  'SEND_EMAIL_HOOK_SECRET',
  'EMAIL_SENDER_AWS_ACCESS_KEY_ID',
  'EMAIL_SENDER_AWS_SECRET_ACCESS_KEY',
  'EMAIL_SENDER_AWS_SESSION_TOKEN',
  'EMAIL_MONITOR_AWS_ACCESS_KEY_ID',
  'EMAIL_MONITOR_AWS_SECRET_ACCESS_KEY',
  'EMAIL_MONITOR_AWS_SESSION_TOKEN',

  'INTERNAL_FUNCTION_SECRET',
  'ROUTINE_RUNNER_SECRET',
  'RECURRING_PAYMENTS_SECRET',
  'EXCHANGE_RATES_SYNC_SECRET',
  'CLOUDFLARE_API_TOKEN',
  'VITE_PRIVATE_CANARY',
];

const DB_URL_KEYS = new Set([
  'SUPABASE_DB_URL',
  'SUPABASE_REMOTE_DB_URL',
  'SUPABASE_PSQL_DB_URL',
]);

const PRIVATE_PATTERNS = [
  {
    name: 'password-bearing PostgreSQL URL',
    pattern: /\bpostgres(?:ql)?:\/\/[^\s"'<>`]*:[^\s"'<>`@]+@[^\s"'<>`]+/i,
  },
  { name: 'Supabase secret key', pattern: /\bsb_secret_[\w-]{12,}\b/ },
  { name: 'AWS access key ID', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
];

function valueVariants(key, value) {
  const variants = new Set([
    value,
    JSON.stringify(value).slice(1, -1),
    encodeURIComponent(value),
    Buffer.from(value).toString('base64'),
  ]);

  if (DB_URL_KEYS.has(key)) {
    try {
      const password = new URL(value).password;

      if (password) {
        variants.add(password);
        variants.add(decodeURIComponent(password));
      }
    } catch {
      // A malformed connection string still has its literal value checked.
    }
  }

  return [...variants].filter(Boolean);
}

function privateValues(environment) {
  return PRIVATE_ENV_KEYS.flatMap((key) => {
    const value = environment[key];

    const parsed = z.string().min(1).safeParse(value);

    return parsed.success
      ? [{ key, variants: valueVariants(key, parsed.data) }]
      : [];
  });
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(
        `Public asset directory contains a symbolic link: ${path}`
      );
    }

    if (entry.isDirectory()) {
      files.push(...(await filesUnder(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

export async function scanPublicAssets(directory, environment = process.env) {
  const root = resolve(directory);
  const files = await filesUnder(root);
  const sensitiveValues = privateValues(environment);
  const findings = [];

  if (files.length === 0) {
    throw new Error('Public asset directory is empty.');
  }

  for (const file of files) {
    const content = await readFile(file);
    const path = relative(root, file);

    for (const { key, variants } of sensitiveValues) {
      if (variants.some((variant) => content.includes(Buffer.from(variant)))) {
        findings.push({ path, rule: key });
      }
    }

    const text = content.toString('utf8');

    for (const { name, pattern } of PRIVATE_PATTERNS) {
      if (pattern.test(text)) {
        findings.push({ path, rule: name });
      }
    }
  }

  return { filesScanned: files.length, findings };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const directory = process.argv[2] ?? 'dist/apps/web/browser';

  try {
    const { filesScanned, findings } = await scanPublicAssets(directory);

    for (const { path, rule } of findings) {
      console.error(`Public asset contains ${rule}: ${path}`);
    }

    if (findings.length > 0) {
      process.exitCode = 1;
    } else {
      console.log(`Public asset scan passed (${filesScanned} files).`);
    }
  } catch {
    console.error('Public asset scan could not complete.');
    process.exitCode = 1;
  }
}
