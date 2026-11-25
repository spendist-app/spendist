import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logError } from './logger';

export type InstallOutcome = 'installed' | 'canceled' | 'failed';

/** Chromium's install prompt event (not in the DOM typings). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

/**
 * In-page app installation (modern-web-guidance `install-web-app`).
 *
 * Uses the Web Install API (`navigator.install()`) where available, and
 * otherwise Chromium's `beforeinstallprompt` event. `canInstall` stays false
 * where neither exists (Firefox, Safari) or the app already runs installed,
 * so no non-functional button is shown; browsers keep their own install UI.
 * Create it early (the navbar injects it): `beforeinstallprompt` can fire
 * before any install button renders.
 */
@Injectable({ providedIn: 'root' })
export class InstallAppService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly deferredPrompt = signal<InstallPromptEvent | null>(null);
  private readonly webInstall = this.browser && supportsWebInstall();

  readonly canInstall = signal(false);

  constructor() {
    const view = this.document.defaultView;

    if (!this.browser || !view || this.runsInstalled(view)) {
      return;
    }

    this.canInstall.set(this.webInstall);

    const onPrompt = (event: Event) => {
      if (!isInstallPromptEvent(event)) {
        return;
      }

      // Keep the browser's automatic prompt for our own button.
      event.preventDefault();
      this.deferredPrompt.set(event);
      this.canInstall.set(true);
    };

    const onInstalled = () => this.canInstall.set(false);

    view.addEventListener('beforeinstallprompt', onPrompt);
    view.addEventListener('appinstalled', onInstalled);
    inject(DestroyRef).onDestroy(() => {
      view.removeEventListener('beforeinstallprompt', onPrompt);
      view.removeEventListener('appinstalled', onInstalled);
    });
  }

  /** Call straight from a click handler: installing needs user activation. */
  async install(): Promise<InstallOutcome> {
    try {
      if (this.webInstall) {
        await webInstall(this.document);
        this.canInstall.set(false);

        return 'installed';
      }

      const prompt = this.deferredPrompt();

      if (!prompt) {
        return 'failed';
      }

      // The event is single-use.
      this.deferredPrompt.set(null);
      this.canInstall.set(false);
      await prompt.prompt();

      const { outcome } = await prompt.userChoice;

      return outcome === 'accepted' ? 'installed' : 'canceled';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'canceled';
      }

      logError('[InstallAppService] Installation could not start', error);

      return 'failed';
    }
  }

  private runsInstalled(view: Window): boolean {
    try {
      return view.matchMedia('(display-mode: standalone)').matches;
    } catch {
      return false;
    }
  }
}

function supportsWebInstall(): boolean {
  return 'install' in Navigator.prototype;
}

async function webInstall(document: Document): Promise<void> {
  const navigator = document.defaultView?.navigator;

  if (navigator && 'install' in navigator) {
    const install: unknown = navigator.install;

    if (install instanceof Function) {
      await install.call(navigator);
    }
  }
}

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && 'userChoice' in event;
}
