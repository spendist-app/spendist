import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const LOCAL_SUPABASE_PORT = '55321';
const LOCAL_SUPABASE_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function parseSupabaseEnvironment(output) {
  const values = {};

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    values[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2');
  }

  return values;
}

export function resolvePublicSupabaseEnvironment(values) {
  const supabaseUrl =
    values.NG_APP_SUPABASE_URL ?? values.API_URL ?? values.SUPABASE_URL ?? '';
  const publishableKey =
    values.NG_APP_SUPABASE_PUBLISHABLE_KEY ??
    values.PUBLISHABLE_KEY ??
    values.NG_APP_SUPABASE_ANON_KEY ??
    values.ANON_KEY ??
    values.SUPABASE_PUBLISHABLE_KEY ??
    values.SUPABASE_ANON_KEY ??
    '';

  if (!supabaseUrl) {
    throw new Error('Supabase status did not return a local API URL.');
  }
  if (!publishableKey) {
    throw new Error('Supabase status did not return a publishable key.');
  }

  const parsedUrl = new URL(supabaseUrl);
  if (
    parsedUrl.protocol !== 'http:' ||
    !LOCAL_SUPABASE_HOSTS.has(parsedUrl.hostname) ||
    parsedUrl.port !== LOCAL_SUPABASE_PORT
  ) {
    throw new Error(
      `Refusing to start Docker with a non-local Supabase URL: ${supabaseUrl}`
    );
  }

  const normalizedUrl = parsedUrl.toString().replace(/\/$/, '');
  return {
    SPENDIST_DOCKER_SUPABASE_URL: normalizedUrl,
    SPENDIST_DOCKER_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    SPENDIST_DOCKER_SUPABASE_FUNCTIONS_URL: `${normalizedUrl}/functions/v1`,
  };
}

async function run(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: options.env ?? process.env,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  let stdout = '';
  let stderr = '';
  if (options.capture) {
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
  }

  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (exitCode, signal) => {
      if (signal) {
        reject(new Error(`${command} was terminated by ${signal}.`));
        return;
      }
      resolve(exitCode ?? 1);
    });
  });

  if (code !== 0) {
    if (options.capture && !options.quietFailure && stderr.trim()) {
      process.stderr.write(stderr);
    }
    throw new Error(`${command} ${args.join(' ')} exited with code ${code}.`);
  }

  return stdout;
}

async function resolveComposeCommand() {
  try {
    await run('docker', ['compose', 'version'], {
      capture: true,
      quietFailure: true,
    });
    return { command: 'docker', prefix: ['compose'] };
  } catch {
    throw new Error(
      'Docker Compose v2 is unavailable. Install the supported Docker Compose plugin.'
    );
  }
}

async function start() {
  const compose = await resolveComposeCommand();
  await run('npm', ['run', 'supabase:start'], {
    capture: true,
    quietFailure: true,
  });
  console.log('Local Supabase is running.');
  await run('npx', ['supabase', 'db', 'push', '--local']);

  const status = await run('npx', ['supabase', 'status', '--output', 'env'], {
    capture: true,
    quietFailure: true,
  });
  const publicEnvironment = resolvePublicSupabaseEnvironment(
    parseSupabaseEnvironment(status)
  );

  await run(compose.command, [...compose.prefix, 'up', '--build'], {
    env: {
      ...process.env,
      ...publicEnvironment,
    },
  });
}

async function stop() {
  const compose = await resolveComposeCommand();
  let composeError;
  try {
    await run(compose.command, [...compose.prefix, 'down']);
  } catch (error) {
    composeError = error;
  }

  await run('npm', ['run', 'supabase:stop']);

  if (composeError) {
    throw composeError;
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'up') {
    await start();
    return;
  }
  if (command === 'down') {
    await stop();
    return;
  }

  throw new Error('Usage: node tools/docker/docker-local.mjs <up|down>');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
