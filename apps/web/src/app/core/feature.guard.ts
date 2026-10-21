import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { FeatureFlagsService } from './feature-flags.service';
import { SUPABASE_CLIENT } from './supabase';

// Checks the administrator role itself because AdminAccessService reports false until its request settles.
export const requirePreviewFeatureGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const supabase = inject(SUPABASE_CLIENT);
  const flags = inject(FeatureFlagsService);
  const router = inject(Router);

  return toObservable(auth.authState).pipe(
    filter((state) => !state.loading),
    take(1),
    switchMap(async (state) => {
      if (!state.session) return router.parseUrl('/login');

      if (flags.previewHidden()) return router.parseUrl('/dashboard');

      try {
        const { error } = await supabase.rpc('email_admin_status');

        return error ? router.parseUrl('/dashboard') : true;
      } catch {
        return router.parseUrl('/dashboard');
      }
    })
  );
};
