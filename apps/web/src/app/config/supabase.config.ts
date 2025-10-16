import { SupabaseConfig } from '../core/supabase';

type SupabaseEnvKey = 'SUPABASE_URL' | 'SUPABASE_ANON_KEY';

const readEnv = (key: SupabaseEnvKey): string | undefined => {
  if (typeof globalThis !== 'undefined') {
    const globalRecord = globalThis as unknown as Record<string, unknown>;
    const globalValue = globalRecord[key];
    if (typeof globalValue === 'string' && globalValue.length) {
      return globalValue;
    }

    const globalEnv = globalRecord['env'] as { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string } | undefined;
    const nested = key === 'SUPABASE_URL' ? globalEnv?.SUPABASE_URL : globalEnv?.SUPABASE_ANON_KEY;
    if (typeof nested === 'string' && nested.length) {
      return nested;
    }
  }

  try {
    const importMetaEnv =
      (import.meta as { env?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string } }).env ?? undefined;
    const metaValue =
      key === 'SUPABASE_URL' ? importMetaEnv?.SUPABASE_URL : importMetaEnv?.SUPABASE_ANON_KEY;
    if (typeof metaValue === 'string' && metaValue.length) {
      return metaValue;
    }
  } catch {
    // ignore environments where import.meta is unsupported
  }

  if (typeof process !== 'undefined') {
    const processEnv =
      (process as unknown as { env?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string } })['env'] ?? undefined;
    const fromProcess =
      key === 'SUPABASE_URL' ? processEnv?.SUPABASE_URL : processEnv?.SUPABASE_ANON_KEY;
    if (typeof fromProcess === 'string' && fromProcess.length) {
      return fromProcess;
    }
  }

  return undefined;
};

export const supabaseConfig: SupabaseConfig = {
  url: readEnv('SUPABASE_URL') ?? 'http://localhost:54321',
  anonKey:
    readEnv('SUPABASE_ANON_KEY') ??
    'supabase-anon-key-change-me-for-production',
};
