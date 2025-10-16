import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

type GuardResult = boolean | UrlTree;

const waitForAuthState = (predicate: (isAuthenticated: boolean) => GuardResult) => {
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
    isAuthenticated ? router.parseUrl('/home') : true
  );
};

export const requireAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  return waitForAuthState((isAuthenticated) =>
    isAuthenticated ? true : router.parseUrl('/')
  );
};
