import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { PUBLIC_ANALYTICS_PATHS } from '../pages/blog/analytics-paths.generated';

export const ANALYTICS_CONSENT_KEY = 'spendist.analytics-consent';

export const ANALYTICS_CONSENT_DURATION = 180 * 24 * 60 * 60 * 1000;

const consentSchema = z.object({
  version: z.literal(1),
  choice: z.enum(['accepted', 'rejected']),
  expiresAt: z.number().finite(),
});

const readySchema = z.object({ type: z.literal('spendist-analytics-ready') });

const allowedPaths = new Set(PUBLIC_ANALYTICS_PATHS);

@Injectable({ providedIn: 'root' })
export class PublicAnalyticsService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly window = this.browser ? this.document.defaultView : null;
  private readonly path = signal<string | null>(null);
  private readonly consent = signal<z.infer<typeof consentSchema> | null>(null);
  private readonly editing = signal(false);
  private frame: HTMLIFrameElement | null = null;
  private framePath: string | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly visible = computed(
    () =>
      this.browser &&
      (this.editing() ||
        (!this.auth.loading() &&
          !this.auth.isAuthenticated() &&
          this.path() !== null &&
          this.consent() === null))
  );
  readonly choice = computed(() => this.consent()?.choice ?? null);

  constructor() {
    if (!this.window) {
      return;
    }

    this.readConsent();
    this.path.set(
      this.router.navigated ? this.publicPath(this.router.url) : null
    );
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Stop before history or private DOM can change, even for cancelled routes.
        this.stop();
        this.path.set(null);
      }

      if (event instanceof NavigationEnd) {
        this.path.set(this.publicPath(event.urlAfterRedirects));
      }
    });

    const storageListener = (event: StorageEvent) => {
      if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) {
        this.stop();
        this.readConsent();
      }
    };

    const messageListener = (event: MessageEvent<unknown>) => {
      if (
        event.source !== this.frame?.contentWindow ||
        event.origin !== this.window?.location.origin ||
        !readySchema.safeParse(event.data).success ||
        !this.canMeasure()
      ) {
        return;
      }

      this.frame?.contentWindow?.postMessage(
        { type: 'spendist-analytics-start', path: this.path() },
        event.origin
      );
    };

    this.window.addEventListener('storage', storageListener);
    this.window.addEventListener('message', messageListener);
    this.destroyRef.onDestroy(() => {
      this.stop();
      this.clearExpiryTimer();
      this.window?.removeEventListener('storage', storageListener);
      this.window?.removeEventListener('message', messageListener);
    });

    effect(() => {
      if (this.canMeasure()) {
        this.start();
      } else {
        this.stop(this.consent()?.choice !== 'accepted');
      }
    });
  }

  openPreferences(): void {
    this.editing.set(true);
  }

  choose(choice: 'accepted' | 'rejected'): void {
    const consent: z.infer<typeof consentSchema> = {
      version: 1,
      choice,
      expiresAt: Date.now() + ANALYTICS_CONSENT_DURATION,
    };

    this.stop(choice === 'rejected');
    this.consent.set(consent);
    this.editing.set(false);

    try {
      this.window?.localStorage.setItem(
        ANALYTICS_CONSENT_KEY,
        JSON.stringify(consent)
      );
    } catch {
      // A blocked browser store preserves the decision only in this document.
    }

    this.scheduleExpiry(consent.expiresAt);
  }

  private publicPath(url: string): string | null {
    const path = url.split(/[?#]/, 1)[0];

    return allowedPaths.has(path) ? path : null;
  }

  private canMeasure(): boolean {
    return (
      !this.auth.loading() &&
      !this.auth.isAuthenticated() &&
      this.path() !== null &&
      this.consent()?.choice === 'accepted' &&
      (this.consent()?.expiresAt ?? 0) > Date.now()
    );
  }

  private start(): void {
    const path = this.path();

    if (!this.window || !path || this.framePath === path) {
      return;
    }

    this.stop();
    const frame = this.document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'Spendist analytics';
    frame.setAttribute('aria-hidden', 'true');
    frame.referrerPolicy = 'no-referrer';
    frame.src = '/analytics/frame.html';
    this.frame = frame;
    this.framePath = path;
    this.document.body.append(frame);
  }

  private stop(clearCookies = false): void {
    const runtime = this.frame?.contentWindow;

    if (runtime) {
      // The frame is same-origin. Disable synchronously before its unload handlers.
      Reflect.set(runtime, 'ga-disable-G-WY8ZY07NGW', true);
    }

    this.frame?.remove();
    this.frame = null;
    this.framePath = null;

    if (clearCookies) {
      this.document.cookie = '_ga=; Max-Age=0; Path=/';
      this.document.cookie = '_ga_WY8ZY07NGW=; Max-Age=0; Path=/';
    }
  }

  private readConsent(): void {
    let parsed: z.infer<typeof consentSchema> | null = null;

    try {
      const stored = this.window?.localStorage.getItem(ANALYTICS_CONSENT_KEY);

      const result = consentSchema.safeParse(
        stored ? JSON.parse(stored) : null
      );

      if (result.success && result.data.expiresAt > Date.now()) {
        parsed = result.data;
      }
    } catch {
      // Missing, malformed or inaccessible storage never grants consent.
    }

    this.consent.set(parsed);

    if (parsed) {
      this.scheduleExpiry(parsed.expiresAt);
    } else {
      this.clearExpiryTimer();
    }
  }

  private scheduleExpiry(expiresAt: number): void {
    this.clearExpiryTimer();
    // Timers are bounded to avoid the browser's signed 32-bit delay overflow.
    this.expiryTimer = setTimeout(() => {
      if (Date.now() < expiresAt) {
        this.scheduleExpiry(expiresAt);

        return;
      }

      this.stop(true);
      this.consent.set(null);
    }, Math.min(expiresAt - Date.now(), 2_147_483_647));
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
