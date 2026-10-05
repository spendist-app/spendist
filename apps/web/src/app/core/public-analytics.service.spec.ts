import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import {
  ANALYTICS_CONSENT_DURATION,
  ANALYTICS_CONSENT_KEY,
  PublicAnalyticsService,
} from './public-analytics.service';

class AuthStub {
  readonly loading = signal(true);
  readonly isAuthenticated = signal(false);
}

class RouterStub {
  readonly events = new Subject<NavigationStart | NavigationEnd>();
  navigated = true;
  url = '/';

  navigate(url: string): void {
    this.events.next(new NavigationStart(1, url));
    this.url = url;
    this.events.next(new NavigationEnd(1, url, url));
  }
}

function analyticsFrame(): HTMLIFrameElement | null {
  return document.querySelector('iframe[src="/analytics/frame.html"]');
}

describe('PublicAnalyticsService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthStub,
        RouterStub,
        { provide: AuthService, useExisting: AuthStub },
        { provide: Router, useExisting: RouterStub },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('blocks before auth resolves and before consent, and remembers refusal', () => {
    const service = TestBed.inject(PublicAnalyticsService);
    const auth = TestBed.inject(AuthStub);
    TestBed.tick();
    expect(analyticsFrame()).toBeNull();
    expect(service.visible()).toBe(false);

    auth.loading.set(false);
    TestBed.tick();
    expect(service.visible()).toBe(true);
    expect(analyticsFrame()).toBeNull();

    service.choose('rejected');
    TestBed.tick();
    expect(service.visible()).toBe(false);
    expect(analyticsFrame()).toBeNull();
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toContain('rejected');

    service.openPreferences();
    expect(service.visible()).toBe(true);
  });

  it('tracks only allowlisted public paths and stops synchronously at navigation start', () => {
    const service = TestBed.inject(PublicAnalyticsService);
    const auth = TestBed.inject(AuthStub);
    const router = TestBed.inject(RouterStub);
    service.choose('accepted');
    TestBed.tick();
    expect(analyticsFrame()).toBeNull();

    auth.loading.set(false);
    TestBed.tick();
    const frame = analyticsFrame();
    expect(frame).not.toBeNull();

    router.events.next(new NavigationStart(2, '/login?token=secret'));
    expect(analyticsFrame()).toBeNull();
    expect(frame?.contentWindow).toHaveProperty(
      'ga-disable-G-WY8ZY07NGW',
      true
    );

    for (const url of [
      '/login',
      '/signup',
      '/auth/confirm?token=secret',
      '/reset-password',
      '/allowance/invite?token=secret',
      '/oauth/consent',
      '/transactions',
      '/pl/blog/unknown',
    ]) {
      router.navigate(url);
      TestBed.tick();
      expect(analyticsFrame()).toBeNull();
    }

    router.navigate('/regulamin?email=private@example.test#secret');
    TestBed.tick();
    expect(analyticsFrame()?.src).not.toContain('private');
    expect(analyticsFrame()).not.toBeNull();
  });

  it('sends only the public path through a verified ready handshake', () => {
    const auth = TestBed.inject(AuthStub);
    const router = TestBed.inject(RouterStub);
    auth.loading.set(false);
    router.url = '/en/blog?token=secret#email';
    TestBed.inject(PublicAnalyticsService).choose('accepted');
    TestBed.tick();
    const frame = analyticsFrame();
    const runtime = frame?.contentWindow;

    if (!runtime) {
      throw new Error('Expected an isolated analytics frame');
    }

    const send = vi.spyOn(runtime, 'postMessage');
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        source: runtime,
        data: { type: 'spendist-analytics-ready' },
      })
    );
    expect(send).not.toHaveBeenCalled();

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: location.origin,
        source: runtime,
        data: { type: 'spendist-analytics-ready' },
      })
    );
    expect(send).toHaveBeenCalledWith(
      { type: 'spendist-analytics-start', path: '/en/blog' },
      location.origin
    );
  });

  it('removes the runtime on login and refuses late ready callbacks', () => {
    const auth = TestBed.inject(AuthStub);
    auth.loading.set(false);
    TestBed.inject(PublicAnalyticsService).choose('accepted');
    TestBed.tick();
    const runtime = analyticsFrame()?.contentWindow;

    auth.isAuthenticated.set(true);
    TestBed.tick();
    expect(analyticsFrame()).toBeNull();

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: location.origin,
        source: runtime,
        data: { type: 'spendist-analytics-ready' },
      })
    );
    expect(analyticsFrame()).toBeNull();
  });

  it('withdraws consent, clears only its own cookies and handles another tab revoking it', () => {
    const auth = TestBed.inject(AuthStub);
    auth.loading.set(false);
    const service = TestBed.inject(PublicAnalyticsService);
    service.choose('accepted');
    TestBed.tick();
    document.cookie = '_ga=visitor; Path=/';
    document.cookie = '_ga_WY8ZY07NGW=session; Path=/';
    document.cookie = 'unrelated=keep; Path=/';

    service.choose('rejected');
    expect(analyticsFrame()).toBeNull();
    expect(document.cookie).not.toContain('_ga');
    expect(document.cookie).toContain('unrelated=keep');

    service.choose('accepted');
    TestBed.tick();
    expect(analyticsFrame()).not.toBeNull();

    localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    window.dispatchEvent(
      new StorageEvent('storage', { key: ANALYTICS_CONSENT_KEY })
    );
    TestBed.tick();
    expect(analyticsFrame()).toBeNull();
    expect(service.choice()).toBeNull();
  });

  it('expires an accepted decision even without navigation', () => {
    vi.useFakeTimers();
    const auth = TestBed.inject(AuthStub);
    auth.loading.set(false);
    const service = TestBed.inject(PublicAnalyticsService);
    service.choose('accepted');
    TestBed.tick();
    expect(analyticsFrame()).not.toBeNull();

    vi.advanceTimersByTime(ANALYTICS_CONSENT_DURATION);
    TestBed.tick();
    expect(analyticsFrame()).toBeNull();
    expect(service.visible()).toBe(true);
  });

  it.each([
    'invalid',
    JSON.stringify({ version: 1, choice: 'accepted', expiresAt: 1 }),
  ])('fails closed for malformed or expired storage: %s', (stored) => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, stored);
    TestBed.inject(AuthStub).loading.set(false);
    const service = TestBed.inject(PublicAnalyticsService);
    TestBed.tick();
    expect(analyticsFrame()).toBeNull();
    expect(service.choice()).toBeNull();
  });

  it('does not access storage or create frames on the server', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const read = vi.spyOn(Storage.prototype, 'getItem');
    TestBed.inject(PublicAnalyticsService);
    TestBed.tick();
    expect(read).not.toHaveBeenCalled();
    expect(analyticsFrame()).toBeNull();
  });
});
