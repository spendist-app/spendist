# Repository Guidelines

## Project Structure & Module Organization

Spendist is an Nx-managed Angular workspace. Application code lives under `apps/web`, with standalone components in `apps/web/src/app` and shared assets in `apps/web/public`. Server-side rendering entry points sit in `apps/web/src/main.server.ts` and `apps/web/src/server.ts`, while Tailwind and PostCSS configs reside alongside the app in `apps/web/tailwind.config.js` and `apps/web/postcss.config.cjs`. Global utility styles are layered in `apps/web/src/styles.css`, and build artifacts land in `dist/apps/web`.

## Framework Version

- Target the latest Angular release (currently v20) and prefer modern signal-based APIs, control flow, and routing patterns in new code.

## Build, Test, and Development Commands

- `npm install`: restore dependencies before running Nx targets.
- `npx nx serve web`: launch the dev server with hot reload; Tailwind + DaisyUI classes are rebuilt automatically.
- `npx nx build web`: produce the SSR-ready bundle in `dist/apps/web` using the configured Tailwind pipeline.
- `npx nx test web`: execute the Vitest-powered unit suite in zoneless mode.
- `npx nx lint web`: run ESLint with Nx module-boundary checks.

## Styling Toolkit (Tailwind + DaisyUI)

Utility-first styling is enabled through Tailwind 4 and DaisyUI 5. Extend the design system by editing `apps/web/tailwind.config.js` (e.g., `daisyui: { themes: ['emerald'] }`) and keep component-level styles minimal. Use shared utility classes in templates (`<button class="btn btn-primary">`) and add custom layers in `styles.css` if a pattern repeats across features.

- Mobile-first layouts are the default UX rule—build for small screens first, then enhance for larger breakpoints.
- Spendist palettes (keep these in sync with the Tailwind/DaisyUI theme tokens):
  - Light — Background `#FFFDFB`, Surface `#FFFFFF`, Text `#111827`, Primary `#0EA5A5`, Secondary `#F59E0B`, Accent `#EA580C`, Success `#16A34A`, Warning `#D97706`, Danger `#DC2626`.
  - Dark — Background `#111315`, Surface `#161A1D`, Text `#E5E7EB`, Primary `#2DD4BF`, Secondary `#FBBF24`, Accent `#FB923C`.

## Change Detection & Zoneless Runtime

The app boots with `provideZonelessChangeDetection()` (`apps/web/src/app/app.config.ts`), so avoid APIs that assume `NgZone` patches DOM events. Prefer `run()` and signal-based patterns over zone hooks, and wire third-party libraries through their native callbacks. Vitest mirrors this setup by registering a `ZonelessTestModule` inside `apps/web/src/test-setup.ts`.

## Testing Guidelines

Unit specs live beside their sources with the `*.spec.ts` suffix. Use Angular TestBed helpers, keep DOM expectations explicit (see `app.spec.ts`), and prefer focused signal-based assertions. Run `npx nx test web --coverage` after logic changes; coverage data is written to `coverage/apps/web`. Seed shared mocks or snapshot serializers in `apps/web/src/test-setup.ts` instead of duplicating boilerplate.

## Commit & Pull Request Guidelines

Adopt Conventional Commits to keep Nx inference effective (e.g., `feat(web): add spending dashboard`). Scope messages to the affected project, mention linked GitHub issues, and describe Tailwind or zoneless implications in the PR body. Ensure lint, test, and build targets pass locally (`npx nx affected --target=test,lint,build`) before requesting review, and include screenshots or terminal output when UI or CLI behavior changes.

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in .agent/PLANS.md) from design to implementation. Write new plans to the .agent dir. Place any temporary research, clones, etc., in a .gitignored subdirectory of .agent.

## Ikony

- W projekcie używamy biblioteki `@ng-icons/core` oraz zestawów Heroicons (`outline`, `solid`, `mini`, `micro`).
- Ikony są rejestrowane dynamicznie w komponentach dzięki `HeroIconPickerComponent`, który udostępnia wyszukiwalną listę ikon i zwraca kanoniczne nazwy (`hero...`).
- Normalizacja nazw ikon po stronie store'u odbywa się w `apps/web/src/app/pages/settings/settings.store.ts` przez helper `canonicalHeroIconName`, co zapewnia spójne przechowywanie w Supabase.

## Transloco (i18n)

- Wielojęzyczność (EN/PL) jest dostarczana przez `@ngneat/transloco`; konfiguracja globalna w `app.config.ts` korzysta z `provideAppTransloco()`.
- Loader tłumaczeń (`AppTranslocoLoader`) ładuje katalogi z `apps/web/src/app/i18n/translations/`.
- Preferencja języka jest zapisywana w localStorage (`LanguageService`), domyślny język wybierany jest na podstawie poprzedniego zapisu lub języka przeglądarki.
- Navbar udostępnia selektor języka, który przełącza translacje w locie i aktualizuje atrybut `lang` w dokumencie.

## Progress

Notuj progress w plikach .agent/\*

## Supabase Migrations & Functions

- Każda nowa migracja lub funkcja tworzona w Supabase musi równolegle trafić do katalogu `supabase/migrations` w repozytorium (commit razem z kodem, który jej potrzebuje).
- Synchronizuj historię (`supabase migration list --local/--db-url`) przed push, żeby uniknąć rozjazdów między bazą a repo.

## Inne

Zawsze sprawdzaj jaka jest data. Nie wierz swojej intuicji. Np poprzez new Date().now()

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
