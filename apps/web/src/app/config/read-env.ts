/// <reference types="vite/client" />
import { z } from 'zod';

declare global {
  interface ImportMetaEnv {
    SUPABASE_URL?: string;
    NG_APP_SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    NG_APP_SUPABASE_ANON_KEY?: string;
    NG_APP_SUPABASE_PUBLISHABLE_KEY?: string;
    NG_APP_BUILD_COMMIT?: string;
  }
}

function buildEnv() {
  try {
    // Vite SSR requires explicit property access on its import.meta.env proxy.
    return {
      SUPABASE_URL: import.meta.env?.SUPABASE_URL,
      NG_APP_SUPABASE_URL: import.meta.env?.NG_APP_SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env?.SUPABASE_ANON_KEY,
      SUPABASE_PUBLISHABLE_KEY: import.meta.env?.SUPABASE_PUBLISHABLE_KEY,
      NG_APP_SUPABASE_ANON_KEY: import.meta.env?.NG_APP_SUPABASE_ANON_KEY,
      NG_APP_SUPABASE_PUBLISHABLE_KEY: import.meta.env
        ?.NG_APP_SUPABASE_PUBLISHABLE_KEY,
      NG_APP_BUILD_COMMIT: import.meta.env?.NG_APP_BUILD_COMMIT,
    };
  } catch {
    // Node and Worker runtimes may expose no import.meta.env source.
    return undefined;
  }
}

/** Resolve validated strings in the same source and alias order in every runtime. */
export function readEnv(keys: readonly string[]): string | undefined {
  const nested = z
    .object({ env: z.unknown().optional(), __env: z.unknown().optional() })
    .safeParse(globalThis);

  const sources = [
    globalThis,
    nested.success ? nested.data.env : undefined,
    nested.success ? nested.data.__env : undefined,
    buildEnv(),
    typeof process !== 'undefined' ? process.env : undefined,
  ];

  for (const source of sources) {
    for (const key of keys) {
      const parsed = z.object({ [key]: z.string().min(1) }).safeParse(source);

      if (parsed.success) return parsed.data[key];
    }
  }

  return undefined;
}
