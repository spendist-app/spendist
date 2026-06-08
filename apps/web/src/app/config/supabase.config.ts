import { SupabaseConfig } from '../core/supabase';

const readEnv = (keys: string[]): string | undefined => {
  if (typeof globalThis !== 'undefined') {
    const globalRecord = globalThis as unknown as Record<string, unknown>;
    for (const key of keys) {
      const globalValue = globalRecord[key];
      if (typeof globalValue === 'string' && globalValue.length) {
        return globalValue;
      }
    }

    for (const sourceName of ['env', '__env']) {
      const source = globalRecord[sourceName] as
        | Record<string, string | undefined>
        | undefined;
      for (const key of keys) {
        const nested = source?.[key];
        if (typeof nested === 'string' && nested.length) {
          return nested;
        }
      }
    }
  }

  try {
    const importMetaEnv =
      (import.meta as { env?: Record<string, string | undefined> }).env ??
      undefined;
    for (const key of keys) {
      const metaValue = importMetaEnv?.[key];
      if (typeof metaValue === 'string' && metaValue.length) {
        return metaValue;
      }
    }
  } catch {
    // ignore environments where import.meta is unsupported
  }

  if (typeof process !== 'undefined') {
    const processEnv =
      (process as unknown as { env?: Record<string, string | undefined> })[
        'env'
      ] ?? undefined;
    for (const key of keys) {
      const fromProcess = processEnv?.[key];
      if (typeof fromProcess === 'string' && fromProcess.length) {
        return fromProcess;
      }
    }
  }

  return undefined;
};

export const supabaseConfig: SupabaseConfig = {
  url:
    readEnv(['SUPABASE_URL', 'NG_APP_SUPABASE_URL']) ??
    'http://127.0.0.1:55321',
  anonKey:
    readEnv([
      'SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
      'NG_APP_SUPABASE_ANON_KEY',
      'NG_APP_SUPABASE_PUBLISHABLE_KEY',
    ]) ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
};
