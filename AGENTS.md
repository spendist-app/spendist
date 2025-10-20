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
