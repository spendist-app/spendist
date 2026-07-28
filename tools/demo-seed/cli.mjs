#!/usr/bin/env node
import { DATASET_VERSION, FIXTURES } from './fixtures.mjs';
import {
  generateDemoDataset,
  summarizeDataset,
  validateDataset,
} from './generator.mjs';
import {
  assertExecutionAllowed,
  parseArgs,
  resolveDemoSeedEnvironment,
  resolveProjectTarget,
  resolveTargetLocales,
} from './safety.mjs';
import { applyDemoSeed } from './supabase-runner.mjs';

const PLACEHOLDER_OWNER_ID = '00000000-0000-4000-8000-000000000001';

function printHelp() {
  console.log(`Spendist demo data seed ${DATASET_VERSION}

Dry run (default, no credentials and no writes):
  npm run demo:seed -- --locale=all

Apply to the configured Supabase target:
  npm run demo:seed:apply -- --locale=all

Remote sync additionally requires:
  SUPABASE_PROJECT_REF=<project-ref>
  --allow-remote --confirm-project-ref=<project-ref>

Shared remote Supabase configuration is loaded from .env by demo:seed:apply.
Only DEMO_SEED_INITIAL_PASSWORD needs to be stored in .env.demo.local.

Replace additionally requires:
  --mode=replace --confirm-replace=<exact comma-separated demo emails>

Options:
  --locale=pl|en|all
  --mode=sync|replace
  --apply
  --allow-remote
  --confirm-project-ref=<project-ref>
  --confirm-replace=<emails>
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const locales = resolveTargetLocales(options.locale);
  if (!options.apply) {
    console.log(
      `Dry run only. Dataset version: ${DATASET_VERSION}. No database connection will be made.`
    );
    for (const locale of locales) {
      const dataset = generateDemoDataset(locale, PLACEHOLDER_OWNER_ID);
      validateDataset(dataset);
      console.log(`${FIXTURES[locale].email}:`, summarizeDataset(dataset));
    }
    console.log(
      'Use --apply and the documented environment variables to write data.'
    );
    return;
  }

  const environment = resolveDemoSeedEnvironment();
  const { url, serviceRoleKey } = environment;
  if (!url)
    throw new Error(
      'SUPABASE_URL or DEMO_SEED_SUPABASE_URL is required with --apply.'
    );
  if (!serviceRoleKey)
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, SB_SECRET_KEY, or DEMO_SEED_SERVICE_ROLE_KEY is required with --apply.'
    );
  const target = resolveProjectTarget(url);
  assertExecutionAllowed(options, target, environment.projectRef);
  console.log(
    `Applying ${options.mode} to ${
      target.isRemote ? `remote project ${target.projectRef}` : 'local Supabase'
    } for ${locales.join(', ')}.`
  );
  await applyDemoSeed({
    url,
    serviceRoleKey,
    password: environment.password,
    locales,
    mode: options.mode,
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Demo seed failed: ${message}`);
  process.exitCode = 1;
});
