# Spendist

Spendist is a free, open-source app for tracking personal income and expenses. Use it to see where your money goes, organize spending across wallets and categories, and keep a record of recurring bills.

**[Open Spendist](https://spendist.app/)** · [Getting started](#getting-started) · [Run locally](#local-development) · [Documentation](doc/README.md) · [Report a problem](https://github.com/spendist-app/spendist/issues)

## Is Spendist for you?

Spendist is for people who want to record everyday spending and understand their household finances. It works in Polish and English, with light and dark themes. You can use the hosted application or run the open-source code yourself under the [GPL-3.0 license](LICENSE).

There are no ads or data sales. You enter transactions yourself or import supported files; Spendist does not connect to your bank or make payments on your behalf.

## Getting started

1. [Create a free account](https://spendist.app/signup), choose the currency for your first wallet, and confirm your email.
2. Open **Transactions** and add an expense: amount, date, wallet, and category. You can start with today's purchases; you do not need to enter your entire history.
3. Open **Dashboard** to review recorded income and expenses by month and category. Add more entries as you go.

Already have records? Import **Spendist CSV** or **Kontomierz XLSX** in Settings. The Transactions import also accepts **Biedronka e-receipt JSON**. These are specific formats, not a general bank-statement importer. You can export transactions as Spendist CSV from Settings.

## What you can do

- **Understand monthly spending:** compare recorded income and expenses and review category totals on the dashboard.
- **Keep money organized:** use multiple wallets and currencies, categories, category groups, tags, and places.
- **Enter several expenses together:** add transactions individually or use bulk entry with clipboard column parsing.
- **Record recurring bills:** schedule transaction records for subscriptions and other recurring costs. Spendist does not send money or pay those bills.
- **Keep your data portable:** import supported files, review them before saving, and export transactions again.
- **Use optional integrations:** connect compatible AI clients through the user-authorized [MCP integration](doc/features/model-context-protocol.md).

Spendist is actively developed. If something is confusing or fails, [open an issue](https://github.com/spendist-app/spendist/issues) with the steps to reproduce it. Remove financial records, personal information, and tokens from anything you share publicly.

## Tech Stack

- **Frontend**: Angular 22, standalone components, signals, zoneless change detection, Angular Router, SSR-ready build, and TypeScript 6.
- **Workspace**: Nx 23.2 with inferred targets, Vitest, Playwright, ESLint, Oxlint with vendored anti-slop rules, and Prettier.
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
npm run lint:oxlint       # Nx Oxlint tasks plus strict repository-wide checks
npm run e2e                # Playwright E2E suite
npm run format:check       # Prettier check
npm run mcp:build          # build the local STDIO MCP server
npm run mcp:test           # focused MCP unit tests
npm run mcp:worker:check   # production-config Cloudflare Worker dry-run
npm run mcp:worker:deploy  # deploy the authenticated remote MCP Worker
```

## MCP clients

Build the local server with `npm run mcp:build`. The STDIO process needs `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and a user access token in `SPENDIST_ACCESS_TOKEN`; optional `MCP_CLIENT_ID` labels metadata-only mutation audit entries. Keep the token in the MCP host's secret environment settings, never in a committed config file.

Example command for Codex and other clients that support a command-based STDIO server:

```text
node /absolute/path/to/spendist/dist/apps/mcp/main.mjs
```

The production remote endpoint is `https://mcp.spendist.app/mcp` and advertises OAuth protected-resource metadata. It serves the stable MCP `2026-07-28` stateless protocol and keeps a stateless 2025-era fallback for older compatible clients; STDIO negotiates either era per connection. Compatible remote clients should discover Supabase OAuth, dynamically register, use authorization code with PKCE, and send the resulting bearer token. At this early product stage there is no separate staging Worker: local tests protect development, while a small invited group validates OAuth, reads, audited mutations, and guarded deletion directly on production before access is expanded.

`mcp.spendist.app` is a proxied Cloudflare DNS hostname with a zone Worker Route attached to the separate `spendist-mcp` Worker, not an alias to the web application. The DNS record is managed in the zone, while `npm run mcp:worker:deploy` deploys the Worker and attaches its route. The production workflow supplies the Supabase URL, publishable key, and derived OAuth issuer through an ephemeral secrets file during the same deploy, then verifies the health and OAuth metadata endpoints.

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
npm run lint:oxlint
npm run test
npm run build
```

Oxlint runs beside ESLint; ESLint still checks Angular templates. All enabled
anti-slop rules are errors, and `npm run lint:oxlint` requires zero errors and
warnings across the repository, including tools and Supabase Edge Functions. The rules
are vendored under `tools/oxlint/anti-slop/` with their upstream revision and
license. Type assertions require a specific `SAFETY:` comment describing the
invariant checked by the code. There is no warning baseline.

For database or generated-type changes, also run:

```bash
npm run db:push:local
npm run db:types:local
```

## License

Spendist is released under the [GNU General Public License v3.0](LICENSE).
