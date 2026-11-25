#!/usr/bin/env node
// Runs a second local Supabase stack for E2E tests, so `supabase db reset`
// during E2E never touches the development database.
//
// The E2E project lives in `.supabase-e2e/supabase/`: a config generated from
// `supabase/config.toml` (own project id, ports shifted by PORT_OFFSET, app
// URLs on the E2E dev server port) and symlinks to the shared migrations,
// functions and other sources.
//
// Usage: node tools/scripts/e2e-supabase.mjs <prepare|start|stop|status>

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const E2E_WORKDIR = '.supabase-e2e';

export const E2E_PROJECT_SUFFIX = '-e2e';

// Below the Windows/Hyper-V dynamic port range (49152-65535), whose reserved
// blocks change between reboots and make Docker port bindings fail.
export const PORT_OFFSET = -2000;

export const DEV_APP_PORT = 4200;

export const E2E_APP_PORT = 4300;

const PORT_KEYS = new Set(['port', 'shadow_port', 'inspector_port']);

// Services E2E does not use; skipping them saves memory and start-up time.
const EXCLUDED_SERVICES = ['studio', 'imgproxy', 'vector', 'logflare'];

/**
 * Derives the E2E Supabase config from the development config.
 *
 * @param {string} toml development `supabase/config.toml`
 * @returns {string}
 */
export function buildE2ESupabaseConfig(toml) {
  const devAppHost = new RegExp(
    `(localhost|127\\.0\\.0\\.1):${DEV_APP_PORT}\\b`,
    'g'
  );

  return toml
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*#/.test(line)) {
        return line;
      }

      const projectId = /^(\s*project_id\s*=\s*")([^"]+)(".*)$/.exec(line);

      if (projectId) {
        return `${projectId[1]}${projectId[2]}${E2E_PROJECT_SUFFIX}${projectId[3]}`;
      }

      const port = /^(\s*)([a-z_]+)(\s*=\s*)(\d+)(.*)$/.exec(line);

      if (port && PORT_KEYS.has(port[2])) {
        const shifted = Number(port[4]) + PORT_OFFSET;

        return `${port[1]}${port[2]}${port[3]}${shifted}${port[5]}`;
      }

      if (/^\s*site_url\s*=/.test(line)) {
        return line.replace(devAppHost, `$1:${E2E_APP_PORT}`);
      }

      return line;
    })
    .join('\n');
}

/**
 * Reads a top-level-section port from a Supabase config.
 *
 * @param {string} toml
 * @param {string} section
 * @returns {number | undefined}
 */
export function readSectionPort(toml, section) {
  let current = '';

  for (const rawLine of toml.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const header = /^\[([^\]]+)\]$/.exec(line);

    if (header) {
      current = header[1];

      continue;
    }

    const port = /^port\s*=\s*(\d+)$/.exec(line);

    if (current === section && port) {
      return Number(port[1]);
    }
  }

  return undefined;
}

function prepare(rootDir) {
  const sourceDir = join(rootDir, 'supabase');
  const targetDir = join(rootDir, E2E_WORKDIR, 'supabase');

  mkdirSync(targetDir, { recursive: true });

  const config = buildE2ESupabaseConfig(
    readFileSync(join(sourceDir, 'config.toml'), 'utf8')
  );

  writeFileSync(join(targetDir, 'config.toml'), config);

  // Share sources; keep CLI state (.temp, .branches) per project.
  for (const entry of readdirSync(sourceDir)) {
    if (entry === 'config.toml' || entry.startsWith('.')) {
      continue;
    }

    const link = join(targetDir, entry);

    if (existsSync(link) || isDanglingLink(link)) {
      continue;
    }

    symlinkSync(relative(targetDir, join(sourceDir, entry)), link);
  }

  return config;
}

function isDanglingLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function supabase(rootDir, args) {
  const result = spawnSync(
    'npx',
    ['supabase', ...args, '--workdir', E2E_WORKDIR],
    { cwd: rootDir, stdio: 'inherit' }
  );

  return result.status ?? 1;
}

function main() {
  const rootDir = process.cwd();
  const command = process.argv[2] ?? 'start';

  if (command === 'prepare') {
    prepare(rootDir);

    return 0;
  }

  if (command === 'start') {
    const config = prepare(rootDir);

    const status = supabase(rootDir, [
      'start',
      '--exclude',
      EXCLUDED_SERVICES.join(','),
    ]);

    if (status === 0) {
      const apiPort = readSectionPort(config, 'api');
      const dbPort = readSectionPort(config, 'db');
      const mailPort = readSectionPort(config, 'inbucket');

      console.log(
        [
          '',
          `E2E Supabase API: http://127.0.0.1:${apiPort}`,
          `E2E database:     postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres`,
          `E2E Mailpit:      http://127.0.0.1:${mailPort}`,
        ].join('\n')
      );
    }

    return status;
  }

  if (command === 'stop' || command === 'status') {
    prepare(rootDir);

    return supabase(rootDir, [command]);
  }

  console.error(
    `Unknown command "${command}". Use prepare, start, stop or status.`
  );

  return 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
