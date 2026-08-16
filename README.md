# Spendist

Spendist is a personal finance app for tracking everyday money, recurring payments, wallets, categories, imports, and spending insights in one place.

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![Nx](https://img.shields.io/badge/Nx-23-143055?logo=nx&logoColor=white)](https://nx.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

## What It Does

Spendist helps you build a clear picture of personal cash flow without locking your data into a black box.

- Track income and expenses with categories, tags, wallets, dates, notes, and currencies.
- Review monthly cash flow, category summaries, recurring commitments, and recent activity from the dashboard.
- Manage multiple wallets and currencies, including default-wallet behavior for faster entry.
- Create nested categories with custom colors and Heroicons.
- Automate subscriptions, bills, and other recurring payments through Supabase Edge Functions and scheduled jobs.
- Import historical data from Kontomierz or Spendist CSV exports, then export your data again when needed.
- Store places connected with spending patterns and expose them in the dashboard.
- Use the app in Polish or English with light and dark themes.
- Connect compatible AI clients through a user-authorized MCP server without bypassing Supabase RLS.

## Product Surface

- **Landing page**: public product introduction and authentication entry point.
- **Dashboard**: monthly totals, category cash flow, recurring-payment context, and place summaries.
- **Transactions**: searchable and filterable transaction list with a focused creation flow.
- **Settings**: profile, avatar upload, wallets, category groups, categories, imports, and exports.
- **Modules**: recurring payments and places.
- **Notifications**: user-scoped notification menu in the app shell.

## Tech Stack

- **Frontend**: Angular 22, standalone components, signals, zoneless change detection, Angular Router, SSR-ready build, and TypeScript 6.
- **Workspace**: Nx 23 with inferred targets, Vitest, Playwright, ESLint, and Prettier.
- **UI**: Tailwind CSS 4, DaisyUI 5, `@ng-icons/core`, and Heroicons.
- **Backend**: Supabase Auth, Postgres, RLS, Storage, Realtime, Edge Functions, `pg_cron`, `pg_net`, and Vault-backed scheduled jobs.
- **Runtime**: Cloudflare Worker in production or the production-like Docker image serving `dist/apps/web/browser`.
- **i18n**: Transloco with Polish and English translations.

## Repository Layout

```text
apps/web/                 Angular app, Cloudflare Worker, public runtime env
apps/web-e2e/             Playwright end-to-end tests
apps/mcp/                 MCP tools, resources, prompts, STDIO, and HTTP Worker
libs/data-access-*        Generated/shared data access libraries
supabase/migrations/      Versioned database schema and RPC changes
supabase/functions/       Supabase Edge Functions
tools/scripts/            Local Supabase, type generation, and maintenance scripts
tools/docker/             Container runtime and guarded local orchestration
```

## Local Development

### Prerequisites

- Node.js 22.x or 24.x (CI uses Node.js 24; the Docker build uses Node.js 22)
- npm
- Docker Desktop or Docker Engine with the supported Docker Compose v2 plugin
- Git

### First Run

```bash
npm install
npm run supabase:init
npm run supabase:start
npm run db:push:local
npm run db:types:local
npm run start
```

The web app runs at `http://localhost:4200`.

Local Supabase uses an isolated project id (`spendist-app`) and ports:

- API: `55321`
- Database: `55322`
- Studio: `55323`
- Inbucket: `55324`

The `npm run start` script checks whether the local Supabase stack is available before starting `nx serve web`.

### Local Docker

The Docker workflow runs the production Angular build locally while keeping the
existing Supabase CLI configuration as the source of truth for migrations,
Auth, Storage, Realtime, and Edge Functions.

Install the repository dependencies once, then start the full local stack:

```bash
npm install
npm run docker:up
```

The command starts the isolated local Supabase project, applies pending local
migrations, obtains its public browser configuration, builds the web image, and
runs it through Docker Compose. It rejects remote Supabase URLs and never reads
production credentials.

Local services are available at:

- Spendist: `http://localhost:4200`
- Supabase API: `http://127.0.0.1:55321`
- Supabase Studio: `http://127.0.0.1:55323`
- Mailpit: `http://127.0.0.1:55324`

Stop the app and Supabase without deleting local database volumes:

```bash
npm run docker:down
```

Useful diagnostics:

```bash
docker compose ps
docker compose logs -f web
npm run supabase:status
```

`SPENDIST_PORT` changes the host port and `SPENDIST_IMAGE` changes the image
name used by Compose. The guarded npm script supplies the Compose-only
`SPENDIST_DOCKER_SUPABASE_*` variables so an unrelated repository `.env` cannot
silently select a remote backend. The runtime image itself accepts
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`;
`NG_APP_SUPABASE_FUNCTIONS_URL` and `NG_APP_BUILD_COMMIT` are optional. Never
pass a service-role or secret key to the browser image.

GitHub Actions validates the image for pull requests and publishes
`linux/amd64` and `linux/arm64` variants to
`ghcr.io/spendist-app/spendist`. The `master` image is tagged `latest`,
`develop` is tagged `develop`, and `v*` Git tags produce semantic-version tags.

## Common Commands

```bash
npm run start              # guarded local Supabase startup + Angular dev server
npm run docker:up          # local Supabase + production web image
npm run docker:down        # stop local containers and preserve database data
npm run docker:test        # Docker orchestration unit tests
npm run build              # production Angular build
npm run build:worker       # Cloudflare Worker-ready production build
npm run test               # Vitest unit tests for web
npm run test:recurring-edge # recurring scheduling unit tests
npm run lint               # ESLint for web
npm run e2e                # Playwright E2E suite
npm run format:check       # Prettier check
npm run mcp:build          # build the local STDIO MCP server
npm run mcp:test           # focused MCP unit tests
npm run mcp:worker:check   # production-config Cloudflare Worker dry-run
```

## MCP clients

Build the local server with `npm run mcp:build`. The STDIO process needs `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and a user access token in `SPENDIST_ACCESS_TOKEN`; optional `MCP_CLIENT_ID` labels metadata-only mutation audit entries. Keep the token in the MCP host's secret environment settings, never in a committed config file.

Example command for Codex and other clients that support a command-based STDIO server:

```text
node /absolute/path/to/spendist/dist/apps/mcp/main.mjs
```

The production remote endpoint is `https://mcp.spendist.app/mcp` and advertises OAuth protected-resource metadata. Compatible clients should discover Supabase OAuth, dynamically register, use authorization code with PKCE, and send the resulting bearer token. At this early product stage there is no separate staging Worker: local tests protect development, while a small invited group validates OAuth, reads, audited mutations, and guarded deletion directly on production before access is expanded.

The integration supports profiles, reference data, transactions, recurring payments, summaries, places, notifications, read-only Allowance, audit metadata, and portable JSON export. Imports, account credentials, avatars, account deletion, and Allowance mutations remain application-only. MCP entity deletion always requires `prepare_delete` followed by `confirm_delete`.

Supabase workflow:

```bash
npm run supabase:status
npm run db:push:local
npm run db:reset:local
npm run db:types:local
npm run supabase:vault:local
```

## Deployment

Production is configured for Cloudflare Workers in `wrangler.toml`:

- Worker name: `spendist-app`
- Route: `spendist.app/*`
- Entry point: `apps/web/worker.ts`
- Static assets: `dist/apps/web/browser`

Deploy with:

```bash
npm run build:worker
npm run deploy:worker
```

Remote Supabase schema changes are managed through versioned files in `supabase/migrations` and should be synced with the configured remote database before deployment.

## Quality Checks

Before opening a PR, run the relevant checks:

```bash
npm run lint
npm run test
npm run build
```

For database or generated-type changes, also run:

```bash
npm run db:push:local
npm run db:types:local
```

## License

Spendist is released under the [GNU General Public License v3.0](LICENSE).
