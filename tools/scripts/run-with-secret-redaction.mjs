#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REDACTION = '[REDACTED]';

function addVariant(variants, value) {
  if (typeof value === 'string' && value.length > 0) {
    variants.add(value);
  }
}

export function secretVariants(values) {
  const variants = new Set();

  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0) continue;

    addVariant(variants, value);
    addVariant(variants, encodeURIComponent(value));
    addVariant(variants, value.replaceAll("'", "''"));
    addVariant(variants, JSON.stringify(value).slice(1, -1));
    addVariant(variants, Buffer.from(value).toString('base64'));
    addVariant(variants, Buffer.from(value).toString('base64url'));

    try {
      addVariant(variants, decodeURIComponent(value));
    } catch {
      // The value is not percent-encoded.
    }

    try {
      const url = new URL(value);
      addVariant(variants, url.password);
      addVariant(variants, decodeURIComponent(url.password));
    } catch {
      // The value is not a URL.
    }
  }

  return [...variants].sort((left, right) => right.length - left.length);
}

export function redactSensitiveText(text, values) {
  let redacted = String(text ?? '');

  for (const variant of secretVariants(values)) {
    redacted = redacted.split(variant).join(REDACTION);
  }

  return redacted;
}

function parseArguments(args, environment) {
  const secretNames = [];
  let index = 0;

  while (index < args.length && args[index] !== '--') {
    if (args[index] !== '--secret-env' || !args[index + 1]) {
      throw new Error(
        'Usage: run-with-secret-redaction.mjs --secret-env NAME [...] -- command [args...]'
      );
    }

    const name = args[index + 1];
    if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid environment variable name: ${name}`);
    }

    secretNames.push(name);
    index += 2;
  }

  if (args[index] !== '--' || !args[index + 1]) {
    throw new Error('Missing command after --');
  }

  const secretValues = secretNames
    .map((name) => environment[name] ?? '')
    .filter(Boolean);
  const commandArgs = args.slice(index + 2).map((argument) =>
    argument.replaceAll(/\{ENV:([A-Z_][A-Z0-9_]*)\}/g, (_, name) => {
      if (!secretNames.includes(name)) {
        throw new Error(
          `Environment placeholder ${name} must be declared with --secret-env`
        );
      }

      const value = environment[name];
      if (!value) throw new Error(`Missing environment variable: ${name}`);
      return value;
    })
  );

  return {
    command: args[index + 1],
    commandArgs,
    secretValues,
  };
}

export function run(
  args = process.argv.slice(2),
  environment = process.env,
  execute = spawnSync,
  stdout = process.stdout,
  stderr = process.stderr
) {
  const { command, commandArgs, secretValues } = parseArguments(
    args,
    environment
  );
  const result = execute(command, commandArgs, {
    env: environment,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.stdout)
    stdout.write(redactSensitiveText(result.stdout, secretValues));
  if (result.stderr)
    stderr.write(redactSensitiveText(result.stderr, secretValues));

  if (result.error) {
    stderr.write(
      `${redactSensitiveText(result.error.message, secretValues)}\n`
    );
    return 1;
  }

  return result.status ?? 1;
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
