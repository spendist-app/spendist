# Demo data seeding

Spendist has a repository-managed, deterministic demo dataset intended for screenshots, blog articles, and presentations. It is an operator tool, not an application feature or a general production database seed.

## Dataset

Dataset version `2026-07-v1` contains two dedicated users:

| Locale       | User         | Email                  | Base currency |
| ------------ | ------------ | ---------------------- | ------------- |
| Polish       | Marta Nowak  | `demo-pl@spendist.app` | PLN           |
| English (US) | Emily Carter | `demo-en@spendist.app` | USD           |

Each user has exactly 300 transactions dated from January 1 through July 28, 2026, three wallets, localized category groups and categories, tags, fictional places, recurring payments, recurring occurrences, and notifications. The generator uses stable keys and a seeded pseudorandom sequence, so the same dataset version produces the same domain records.

The initial password is supplied by the operator through `DEMO_SEED_INITIAL_PASSWORD`. It is required only when an account must be created or replaced. A normal `sync` never resets a password that was changed later.

## Dry run

Dry run is the default. It validates and summarizes the generated records without loading credentials or connecting to Supabase:

```bash
npm run demo:seed -- --locale=all
npm run demo:seed:test
```

Use `--locale=pl` or `--locale=en` to inspect one account.

## Secret handling

The apply command reuses the existing ignored `.env` values:

- `SUPABASE_URL`;
- `SUPABASE_PROJECT_REF`;
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, or `SB_SECRET_KEY`.

Copy `.env.demo.example` to the ignored `.env.demo.local` file. It only needs the initial password for newly created demo accounts:

```bash
cp .env.demo.example .env.demo.local
```

The administrative Supabase key has full data access. Keep it in a password manager or deployment secret store, use it only for the duration of the operation, and rotate it if it is exposed. Never paste it into command arguments, shell history, logs, issues, or commits. The tool does not print the service key or password.

For compatibility and explicit local overrides, `DEMO_SEED_SUPABASE_URL`, `DEMO_SEED_SERVICE_ROLE_KEY`, and `DEMO_SEED_PROJECT_REF` take precedence when present. For remote use, the resolved project reference must equal the project reference extracted from the resolved Supabase URL. The URL must be the exact HTTPS Supabase project origin.

## Local apply

Start the local Supabase stack and obtain its service-role key from the local status output. To override the remote values from `.env`, temporarily add the following local-only values to `.env.demo.local`:

```text
DEMO_SEED_SUPABASE_URL=http://127.0.0.1:55321
DEMO_SEED_SERVICE_ROLE_KEY=<local-service-role-key>
DEMO_SEED_PROJECT_REF=local
```

Then run:

```bash
npm run demo:seed:apply -- --locale=all
```

Local writes still require `--apply`. The tool creates missing marked Auth users, rebuilds their domain data, and verifies final record counts.

## Remote sync

Run a dry run first. Schedule the write during a quiet period because the REST operations cannot form one cross-request database transaction. The operation is deterministic and safe to rerun after interruption.

```bash
npm run demo:seed:apply -- \
  --locale=all \
  --allow-remote \
  --confirm-project-ref=YOUR_PROJECT_REF
```

`sync` is the default mode. It preserves the Auth user ID and password, clears only the marked demo user's financial-domain records, recreates the selected dataset version, refreshes the demo metadata, and verifies final counts.

The tool stops before changing data when:

- the remote project reference is not confirmed in both environment and command input;
- the email exists but its `app_metadata.demo_seed_id` or locale marker is missing;
- any insert, delete, or final verification fails.

## Replace

Use replacement only when the Auth identity itself should be recreated. It permanently deletes the selected marked demo Auth user and its cascading data before creating a new identity. It requires the exact selected email addresses as a second confirmation:

```bash
npm run demo:seed:apply -- \
  --mode=replace \
  --locale=pl \
  --allow-remote \
  --confirm-project-ref=YOUR_PROJECT_REF \
  --confirm-replace=demo-pl@spendist.app
```

For `--locale=all`, confirm both emails as the comma-separated value printed by the CLI error/help. Replacement never selects a user by email alone: the expected seed and locale metadata must also match.

## Extending the dataset

When a product feature adds demo-owned data:

1. Extend the localized fixtures and generator.
2. Add deterministic keys and relationship validation for the new records.
3. Increment `DATASET_VERSION`.
4. Update generator and safety tests.
5. Run the local apply twice to prove `sync` remains idempotent.

Prefer `sync` when the existing login should survive. Use `replace` only when the Auth identity or account-level bootstrap behavior must be tested again.
