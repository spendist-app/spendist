import { SupabaseConfig } from '../core/supabase';
import { readEnv } from './read-env';

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
