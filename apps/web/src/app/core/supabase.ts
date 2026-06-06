import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>('SUPABASE_CONFIG');

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT');

export function provideSupabase(config: SupabaseConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SUPABASE_CONFIG, useValue: config },
    {
      provide: SUPABASE_CLIENT,
      deps: [SUPABASE_CONFIG],
      useFactory: (supabaseConfig: SupabaseConfig) =>
        createClient(supabaseConfig.url, supabaseConfig.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        }),
    },
  ]);
}
