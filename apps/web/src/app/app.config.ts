import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import { provideSupabase } from './core/supabase';
import { supabaseConfig } from './config/supabase.config';
import { provideAppTransloco } from './i18n/transloco.providers';
import { provideServiceWorker } from '@angular/service-worker';
import { onViewTransitionCreated } from './core/view-transitions';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withNoIncrementalHydration()),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated,
      })
    ),
    provideSupabase(supabaseConfig),
    ...provideAppTransloco(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
