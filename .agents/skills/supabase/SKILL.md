---
name: supabase
description: "Work with Supabase in this Spendist workspace. USE WHEN creating, editing, syncing, debugging, or reviewing Supabase migrations, SQL functions, Edge Functions, generated types, local Supabase services, or Supabase CLI commands. ALSO USE WHEN a task mentions database schema changes, RLS policies, auth.uid(), db push/pull/reset, migration history drift, or supabase/functions."
---

# Supabase Workflow

Use this skill for Supabase database and function work in Spendist.

## First Checks

1. Check the real current date with `date` before naming migrations or writing progress.
2. Inspect `supabase/config.toml` for local ports and project settings.
3. Check `package.json` scripts before invoking Supabase directly.
4. Check `git status --short` and do not overwrite unrelated user changes.

## Local Project Facts

- Supabase config: `supabase/config.toml`
- Migrations: `supabase/migrations`
- Local config uses project id `spendist-app`
- Local ports are intentionally in the `55320` range.
- Do not edit `supabase/.temp` or `supabase/.branches` unless the user explicitly asks.

Prefer repo scripts when available:

```bash
npm run supabase:ensure
npm run supabase:start
npm run supabase:status
npm run supabase:stop
npm run db:reset:local
npm run db:push:local
npm run db:pull:local
npm run db:types:local
npm run db:push:remote
npm run db:pull:remote
npm run db:types:remote
```

If using raw CLI commands, invoke the local package with `npx supabase ...`. When unsure about flags, run `npx supabase <command> --help`; do not guess.

## Migrations

For every database schema, policy, trigger, view, RPC, or SQL function change:

1. Create or update a SQL file in `supabase/migrations`.
2. Use a timestamped filename ordered after existing migrations, for example:

```text
YYYYMMDDHHMM_descriptive_name.sql
```

3. Keep migrations idempotent where practical with `create or replace function`, guarded `alter table`, or explicit `drop policy if exists` before recreating policies.
4. For user-scoped data, enforce ownership through RLS and `auth.uid()`.
5. Prefer SQL comments only where they clarify a non-obvious policy, trigger, or function contract.
6. After changes, run a local validation path appropriate to scope:

```bash
npm run db:reset:local
npm run db:types:local
```

Use `npm run db:push:local` only when pushing pending migrations to an already-running local database is more appropriate than a reset.

## Remote Sync

Before pushing remote migrations or when history drift is suspected, compare local and remote history:

```bash
npx supabase migration list --local
dotenv -e .env -- sh -c 'npx supabase migration list --db-url "$SUPABASE_REMOTE_DB_URL"'
```

If remote-only migrations exist, capture them into `.agent/*` for analysis first, then add matching files under `supabase/migrations` before proceeding. Never leave required production migrations only in the remote database.

Remote reset is destructive. Do not run `npm run db:reset:remote` unless the user explicitly asks for that exact operation and understands the impact.

## Edge Functions

When adding a Supabase Edge Function:

1. Put the function under `supabase/functions/<function-name>`.
2. Commit the function with any migrations it depends on.
3. Keep secrets in environment variables, never committed files.
4. Add local invocation or deployment commands to the final response when relevant.

## Generated Types

When migrations alter tables, views, enums, or RPC signatures used by Angular code, regenerate types:

```bash
npm run db:types:local
```

If the application is wired to remote-generated types for the change, use:

```bash
npm run db:types:remote
```

Then inspect the generated diff and adjust Angular code to the new contracts.

## Progress Notes

Record meaningful Supabase work in `.agent/*`, including the checked date, migration names, commands run, and any remote/local drift findings.
