# Spendist repository guide

## Purpose and product boundaries

Spendist is a GPL-3.0, open-source personal-finance application. It helps an authenticated user record and understand income, expenses, wallets, categories, places, recurring payments, and currencies. It is not a bank, payment initiator, accounting office, tax adviser, or investment adviser.

- Preserve data portability: users can import history and export Spendist data.
- Do not introduce advertising, data selling, or a feature gate that blocks a user from their own financial data without explicit product approval.
- Treat the production database and user financial data as sensitive. Never use production data for local testing.

## Workspace map

- `apps/web/` — Angular application, Cloudflare Worker, and deployed public assets.
- `apps/web/src/app/` — standalone pages, stores, core services, shared UI, and translations.
- `apps/web-e2e/` — Playwright E2E tests with an isolated database.
- `libs/data-access-*` — generated/shared data-access libraries.
- `supabase/migrations/` and `supabase/functions/` — versioned backend changes.
- `doc/` — English, LLM-oriented feature knowledge base; start at `doc/README.md`.
- `llm.txt` — concise English project map for LLMs.
- `llm-full.txt` — detailed English LLM reference and feature index.
- `apps/web/content/blog/` — independent English and Polish Markdown blog collections and category catalogs.
- `apps/web/public/` — origin assets, including generated blog RSS feeds, `robots.txt`, and `sitemap.xml`.

## Documentation, LLM knowledge, and public SEO

Documentation is part of a product change, not a later task.

When adding, removing, or materially changing a user-visible feature:

1. Update or add its English page in `doc/features/`. Cover current behavior, user-visible rules, data it owns, and deliberate limits.
2. Update both `llm.txt` and `llm-full.txt`. Keep `llm.txt` concise; retain detailed behavior, route ownership, and architecture pointers in `llm-full.txt`.
3. If the change adds or changes a public, indexable route, update `apps/web/public/sitemap.xml` and `apps/web/public/robots.txt` in the same PR. For blog routes, run `npm run blog:generate`; do not hand-edit generated SEO or RSS files.
4. Never add authenticated or utility-only routes (login, password recovery, dashboard, settings, transactions, or modules) to the sitemap. When a route changes visibility, review both SEO files and keep private/utility routes disallowed.

All content in `doc/`, `llm.txt`, and `llm-full.txt` is English. Document current behavior only; label future work as **Planned**.

### Blog authoring contract

- Read `apps/web/content/blog/README.md` before adding an article.
- Polish and English are separate collections. Never invent or require a translated counterpart, and never add article-level `hreflang` unless an explicit translation relationship is introduced later.
- Add Markdown to `apps/web/content/blog/{pl|en}/{slug}.md`, categories to that locale's `categories.json`, and cover images to `apps/web/public/blog/`.
- Keep drafts as `draft: true`; only `draft: false` enters public output. Run `npm run blog:generate` after every content, category, public-blog-route, or generator change.
- Commit the source content and all generated outputs together: `blog-content.generated.ts`, `sitemap.xml`, `robots.txt`, and both locale RSS feeds. The Nx build must keep `blog-content-check` enabled.
- Keep tags as query-string filters with `noindex,follow`; only published articles, valid pagination, and non-empty category archives belong in the sitemap.
- There is no blog CMS, comment system, or database dependency. Do not add one without explicit product approval.

## Application architecture

- Angular uses standalone components, signals, lazy routes, SSR/hydration, and zoneless change detection. Prefer signal-based state and native callbacks; do not rely on `NgZone`-patched behavior.
- Routing lives in `apps/web/src/app/app.routes.ts`. Public content includes `/`, `/pl/blog`, `/en/blog`, and generated localized blog routes; auth pages are reachable but deliberately not indexable. Authenticated product routes use `requireAuthGuard`.
- Page-local data orchestration belongs beside its page in a store. Cross-cutting services, guards, Supabase setup, notifications, language, and theme belong in `core/`.
- The backend is Supabase Auth, Postgres, RLS, Storage, Realtime, Edge Functions, `pg_cron`, `pg_net`, and Vault. Scheduled jobs belong in this Supabase ecosystem unless the user explicitly chooses another runtime.
- Production runs through `apps/web/worker.ts` and `wrangler.toml`, not necessarily `apps/web/src/server.ts`. Verify Worker behavior when changing headers, assets, routing, or runtime configuration.

## UI, i18n, and icons

- Use Tailwind 4 and DaisyUI 5. Build mobile-first and keep repeated patterns in shared components or `apps/web/src/styles.css`.
- Keep the Spendist light/dark palette aligned with Tailwind/DaisyUI theme tokens.
- English and Polish use Transloco. Add matching keys to both translation files; do not hard-code user-facing copy in a component.
- `LanguageService` persists language and updates `document.lang`; `ThemeService` persists the light/dark choice.
- Use `@ng-icons/core` and Heroicons. Persist canonical `hero...` names through `HeroIconPickerComponent` and normalize them with `canonicalHeroIconName` in `settings.store.ts`.

## Database and security rules

- The app is in production. Do not make breaking database changes, destructive migrations, column renames, type changes, or data deletion without an approved migration/backfill plan.
- Prefer additive, backwards-compatible migrations. Synchronize migration history before a remote push.
- Commit every new migration or Edge Function with the code that needs it.
- Keep RLS ownership boundaries intact. Do not log secrets, access tokens, or financial payloads.
- For CSP/security work, inspect generated output and the Cloudflare Worker runtime path. Local Supabase Realtime requires supported localhost WebSocket origins in `connect-src`.

## Development and verification

- First verify the current date; do not infer it from memory.
- Use the `nx-workspace` skill before exploring workspace configuration. Use `nx-generate` before scaffolding. Use `supabase` for every schema, migration, RLS, Edge Function, or local Supabase task.
- Run tasks through Nx and npm: `npm exec -- nx run web:lint`, `npm exec -- nx run web:test`, `npm exec -- nx run web:build`, and `npm exec -- nx run web-e2e:e2e` as applicable. Check help or Nx documentation before unfamiliar flags.
- Unit specs live next to source. E2E tests live in `apps/web-e2e` and must use `.local_env.e2e` or `.env.e2e` with `SUPABASE_E2E_DB_URL`, never a remote or production database.
- Add focused regression coverage for user-visible behavior. Add/update E2E coverage when auth or guards change.
- Before hand-off, run the smallest relevant Nx checks and `git diff --check`. State any check that could not run and why.

## Delivery conventions

- Use Conventional Commits with the affected scope, for example `feat(web): add spending dashboard`.
- Record meaningful progress in `.agent/`. For complex features or significant refactors, create an ExecPlan in `.agent/` following `.agent/PLANS.md`.
- Preserve unrelated changes in a dirty tree; never reset, overwrite, or delete them.
- Technical updates use caveman-lite: direct and complete, without filler. Use full caveman only on request or when output would otherwise exceed roughly 2,000 tokens. Keep code, commits, user-facing documentation, safety warnings, and irreversible-action notices in normal style.
