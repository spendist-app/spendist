import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from './supabase';

export const requireAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const supabase = inject(SUPABASE_CLIENT);
  const router = inject(Router);

  return toObservable(auth.authState).pipe(
    filter((state) => !state.loading),
    take(1),
    switchMap(async (state) => {
      if (!state.session) return router.parseUrl('/login');

      try {
        const { error } = await supabase.rpc('email_admin_status');

        return error ? router.parseUrl('/dashboard') : true;
      } catch {
        return router.parseUrl('/dashboard');
      }
    })
  );
};
