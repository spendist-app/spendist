# spendist

## Prerequisites
- Node.js 22.x (matches the version used by Nx)
- Docker Desktop or Docker Engine running locally
- Git and npm (ships with Node.js)

## Initial Setup
1. Install dependencies: `npm install`.
2. Initialize local Supabase assets (generates `supabase/config.toml`): `npm run supabase:init`.
3. Start Supabase once to let it scaffold credentials: `npm run supabase:start` (press `Ctrl+C` after the stack is healthy if you only want the generated files).
4. Open `supabase/.env` and copy `SUPABASE_ANON_KEY` and `SUPABASE_URL` into `apps/web/public/env.js`. Those values are read by the Angular app at runtime.

## Daily Workflow
- **Start Supabase**: `npm run supabase:start`
  - Wait for the CLI to report `Started supabase local development stack`. The stack runs in Docker containers on the default ports (API: 54321, Studio: 54323).
- **Check Supabase status**: `npm run supabase:status`
- **Stop Supabase**: `npm run supabase:stop`

Keep the Supabase process running in its own terminal while developing the UI.

## Running the Web App
1. Ensure Supabase is running locally (`npm run supabase:start`).
2. In a new terminal, launch the Angular dev server: `npm run start`.
3. Open `http://localhost:4200` in the browser. Tailwind CSS 4 and DaisyUI are pre-configured, and Supabase is available through the injected client (`provideSupabase`).

## Testing & Linting
- Unit tests: `npm run test`
- Linting: `npm run lint`
- Formatting: `npm run format:check`

## Troubleshooting
- If the Nx daemon becomes stale after dependency changes, run `nx reset`.
- If the Angular app cannot connect to Supabase, re-check the values in `apps/web/public/env.js` and confirm the Docker containers are healthy via `npm run supabase:status`.
