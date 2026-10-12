import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

type GuardResult = boolean | UrlTree;

const waitForAuthState = (
  predicate: (isAuthenticated: boolean) => GuardResult
) => {
  const auth = inject(AuthService);

  return toObservable(auth.authState).pipe(
    filter((state) => !state.loading),
    take(1),
    map((state) => predicate(!!state.session))
  );
};

export const redirectAuthenticatedToHomeGuard: CanActivateFn = () => {
  const router = inject(Router);

  return waitForAuthState((isAuthenticated) =>
    isAuthenticated ? router.parseUrl('/dashboard') : true
  );
};

export const requireAuthGuard: CanActivateFn = () => {
  const router = inject(Router);

  return waitForAuthState((isAuthenticated) =>
    isAuthenticated ? true : router.parseUrl('/')
  );
};

/**
 * Prerendering has no session and no request query string. Redirecting there
 * would bake a static login stub that drops query parameters such as the OAuth
 * `authorization_id`, so the check runs in the browser, where `state.url`
 * keeps the full query.
 */
export const requireAuthWithReturnUrlGuard: CanActivateFn = (_route, state) => {
  if (isPlatformServer(inject(PLATFORM_ID))) return true;

  const router = inject(Router);

  return waitForAuthState((isAuthenticated) =>
    isAuthenticated
      ? true
      : router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url },
        })
  );
};
