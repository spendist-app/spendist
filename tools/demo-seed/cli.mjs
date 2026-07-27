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
  resolveProjectTarget,
  resolveTargetLocales,
} from './safety.mjs';
import { applyDemoSeed } from './supabase-runner.mjs';

const PLACEHOLDER_OWNER_ID = '00000000-0000-4000-8000-000000000001';

function printHelp() {
  console.log(`Spendist demo data seed ${DATASET_VERSION}

Dry run (default, no credentials and no writes):
  npm run demo:seed -- --locale=all

Apply locally:
  DEMO_SEED_SUPABASE_URL=http://127.0.0.1:55321 \\
  DEMO_SEED_SERVICE_ROLE_KEY=... \\
  DEMO_SEED_INITIAL_PASSWORD=... \\
  npm run demo:seed -- --apply --locale=all

Remote sync additionally requires:
  DEMO_SEED_PROJECT_REF=<project-ref>
  --allow-remote --confirm-project-ref=<project-ref>

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

  const url = process.env.DEMO_SEED_SUPABASE_URL;
  const serviceRoleKey = process.env.DEMO_SEED_SERVICE_ROLE_KEY;
  if (!url) throw new Error('DEMO_SEED_SUPABASE_URL is required with --apply.');
  if (!serviceRoleKey)
    throw new Error('DEMO_SEED_SERVICE_ROLE_KEY is required with --apply.');
  const target = resolveProjectTarget(url);
  assertExecutionAllowed(options, target, process.env.DEMO_SEED_PROJECT_REF);
  console.log(
    `Applying ${options.mode} to ${
      target.isRemote ? `remote project ${target.projectRef}` : 'local Supabase'
    } for ${locales.join(', ')}.`
  );
  await applyDemoSeed({
    url,
    serviceRoleKey,
    password: process.env.DEMO_SEED_INITIAL_PASSWORD,
    locales,
    mode: options.mode,
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Demo seed failed: ${message}`);
  process.exitCode = 1;
});
