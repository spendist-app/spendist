# Spendist

Spendist is a personal finance app for tracking everyday money, recurring payments, wallets, categories, imports, and spending insights in one place.

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![Nx](https://img.shields.io/badge/Nx-22-143055?logo=nx&logoColor=white)](https://nx.dev/)
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

## Product Surface

- **Landing page**: public product introduction and authentication entry point.
- **Dashboard**: monthly totals, category cash flow, recurring-payment context, and place summaries.
- **Transactions**: searchable and filterable transaction list with a focused creation flow.
- **Settings**: profile, avatar upload, wallets, category groups, categories, imports, and exports.
- **Modules**: recurring payments and places.
- **Notifications**: user-scoped notification menu in the app shell.

## Tech Stack

- **Frontend**: Angular 21, standalone components, signals, zoneless change detection, Angular Router, SSR-ready build.
- **Workspace**: Nx 22 with inferred targets, Vitest, Playwright, ESLint, and Prettier.
- **UI**: Tailwind CSS 4, DaisyUI 5, `@ng-icons/core`, and Heroicons.
- **Backend**: Supabase Auth, Postgres, RLS, Storage, Realtime, Edge Functions, `pg_cron`, `pg_net`, and Vault-backed scheduled jobs.
- **Runtime**: Cloudflare Worker serving the Angular build from `dist/apps/web/browser`.
- **i18n**: Transloco with Polish and English translations.

## Repository Layout

```text
apps/web/                 Angular app, Cloudflare Worker, public runtime env
apps/web-e2e/             Playwright end-to-end tests
libs/data-access-*        Generated/shared data access libraries
supabase/migrations/      Versioned database schema and RPC changes
supabase/functions/       Supabase Edge Functions
tools/scripts/            Local Supabase, type generation, and maintenance scripts
```

## Local Development

### Prerequisites

- Node.js 22.x
- npm
- Docker Desktop or Docker Engine
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

## Common Commands

```bash
npm run start              # guarded local Supabase startup + Angular dev server
npm run build              # production Angular build
npm run build:worker       # Cloudflare Worker-ready production build
npm run test               # Vitest unit tests for web
npm run lint               # ESLint for web
npm run e2e                # Playwright E2E suite
npm run format:check       # Prettier check
```

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
