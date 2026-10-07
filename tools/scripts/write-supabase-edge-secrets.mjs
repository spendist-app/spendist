#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function firstEnv(environment, ...names) {
  return names.map((name) => environment[name]?.trim()).find(Boolean) ?? '';
}

export function renderSupabaseEdgeSecrets(environment) {
  const internalSecret = firstEnv(
    environment,
    'INTERNAL_FUNCTION_SECRET',
    'ROUTINE_RUNNER_SECRET',
    'RECURRING_PAYMENTS_SECRET'
  );

  const values = {
    INTERNAL_FUNCTION_SECRET: internalSecret,
    APP_URL: (
      environment.CLOUDFLARE_PRODUCTION_URL?.trim() || 'https://spendist.app'
    ).replace(/\/$/, ''),
  };

  for (const [name, value] of Object.entries(values)) {
    if (!value) {
      throw new Error(`Missing ${name} for Supabase Edge secrets`);
    }
  }

  return (
    Object.entries(values)
      .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
      .join('\n') + '\n'
  );
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const destination = process.argv[2];

  if (!destination) {
    console.error('Missing destination for Supabase Edge secrets');
    process.exitCode = 1;
  } else {
    try {
      writeFileSync(destination, renderSupabaseEdgeSecrets(process.env), {
        mode: 0o600,
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}
