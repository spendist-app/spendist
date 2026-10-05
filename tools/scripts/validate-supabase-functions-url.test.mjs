import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateSupabaseFunctionsUrl } from './validate-supabase-functions-url.mjs';

test('accepts the functions URL of the same Supabase project', () => {
  assert.doesNotThrow(() =>
    validateSupabaseFunctionsUrl(
      'https://production.supabase.co/functions/v1',
      'https://production.supabase.co'
    )
  );
});

test('rejects a functions URL from another Supabase project', () => {
  assert.throws(
    () =>
      validateSupabaseFunctionsUrl(
        'https://staging.supabase.co/functions/v1',
        'https://production.supabase.co'
      ),
    /different project/
  );
});
