import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { AuthService } from './auth.service';
import { requireAuthWithReturnUrlGuard } from './auth.guard';

const consentUrl = '/oauth/consent?authorization_id=authorization-1';

function configure(platform: 'browser' | 'server') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: platform },
      {
        provide: AuthService,
        useValue: { authState: signal({ loading: false, session: null }) },
      },
    ],
  });
}

function activate() {
  // SAFETY: the guard reads only `url` from the router state snapshot.
  const state = { url: consentUrl } as RouterStateSnapshot;

  return TestBed.runInInjectionContext(() =>
    requireAuthWithReturnUrlGuard(new ActivatedRouteSnapshot(), state)
  );
}

describe('requireAuthWithReturnUrlGuard', () => {
  it('lets prerendering render the page instead of a query-less redirect', () => {
    configure('server');

    expect(activate()).toBe(true);
  });

  it('keeps the full query string in the browser login return URL', async () => {
    configure('browser');

    const result = activate();

    if (!isObservable(result)) throw new Error('Expected an async guard');

    const tree = await firstValueFrom(result);

    if (!(tree instanceof UrlTree)) throw new Error('Expected a redirect');

    expect(TestBed.inject(Router).serializeUrl(tree)).toBe(
      `/login?returnUrl=${encodeURIComponent(consentUrl)}`
    );
  });
});
