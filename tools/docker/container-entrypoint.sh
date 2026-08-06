#!/bin/sh

set -eu

supabase_url="${SUPABASE_URL:-${NG_APP_SUPABASE_URL:-}}"
publishable_key="${SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_ANON_KEY:-${NG_APP_SUPABASE_PUBLISHABLE_KEY:-${NG_APP_SUPABASE_ANON_KEY:-}}}}"

if [ -z "$supabase_url" ]; then
  echo "Missing SUPABASE_URL." >&2
  exit 1
fi

if [ -z "$publishable_key" ]; then
  echo "Missing SUPABASE_PUBLISHABLE_KEY." >&2
  exit 1
fi

functions_url="${NG_APP_SUPABASE_FUNCTIONS_URL:-${supabase_url%/}/functions/v1}"
build_commit="${NG_APP_BUILD_COMMIT:-}"
env_file="/usr/share/nginx/html/env.js"
env_temp="${env_file}.tmp"

jq -cn \
  --arg supabaseUrl "$supabase_url" \
  --arg publishableKey "$publishable_key" \
  --arg functionsUrl "$functions_url" \
  --arg buildCommit "$build_commit" \
  '{
    SUPABASE_URL: $supabaseUrl,
    SUPABASE_ANON_KEY: $publishableKey,
    SUPABASE_PUBLISHABLE_KEY: $publishableKey,
    NG_APP_SUPABASE_URL: $supabaseUrl,
    NG_APP_SUPABASE_PUBLISHABLE_KEY: $publishableKey,
    NG_APP_SUPABASE_ANON_KEY: $publishableKey,
    NG_APP_SUPABASE_FUNCTIONS_URL: $functionsUrl,
    NG_APP_BUILD_COMMIT: $buildCommit
  }' |
  {
    printf 'globalThis.__env = '
    cat
    printf ';\nglobalThis.env = globalThis.__env;\n'
  } >"$env_temp"

mv "$env_temp" "$env_file"

exec nginx -g 'daemon off;'
