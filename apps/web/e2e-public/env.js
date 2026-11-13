// Served instead of public/env.js by web:build:e2e (web:serve:e2e, port 4300):
// points the browser at the separate local E2E Supabase stack.

globalThis.__env = globalThis.__env || {};

globalThis.__env.SUPABASE_URL =
  globalThis.__env.SUPABASE_URL || 'http://127.0.0.1:53321';

globalThis.__env.NG_APP_SUPABASE_URL =
  globalThis.__env.NG_APP_SUPABASE_URL || globalThis.__env.SUPABASE_URL;

globalThis.__env.SUPABASE_PUBLISHABLE_KEY =
  globalThis.__env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

globalThis.__env.NG_APP_SUPABASE_PUBLISHABLE_KEY =
  globalThis.__env.NG_APP_SUPABASE_PUBLISHABLE_KEY ||
  globalThis.__env.SUPABASE_PUBLISHABLE_KEY;

globalThis.__env.SUPABASE_ANON_KEY =
  globalThis.__env.SUPABASE_ANON_KEY ||
  globalThis.__env.SUPABASE_PUBLISHABLE_KEY;

globalThis.__env.NG_APP_SUPABASE_ANON_KEY =
  globalThis.__env.NG_APP_SUPABASE_ANON_KEY ||
  globalThis.__env.SUPABASE_ANON_KEY;

globalThis.env = globalThis.__env;
