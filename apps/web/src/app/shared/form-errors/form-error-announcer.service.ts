import { DOCUMENT, Injectable, inject } from '@angular/core';

// Let the screen reader finish announcing the field that receives focus next.
const ANNOUNCE_DELAY_MS = 500;

/**
 * One polite live region for the whole app that announces a field error when
 * the user leaves the field. Error messages themselves are not live regions:
 * a live region that is inserted, rather than changed, is not announced
 * reliably.
 */
@Injectable({ providedIn: 'root' })
export class FormErrorAnnouncer {
  private readonly document = inject(DOCUMENT);
  private region: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private owner: HTMLElement | null = null;

  /**
   * Announces the text `message()` returns after a short delay, unless it
   * returns null by then.
   */
  schedule(owner: HTMLElement, message: () => string | null): void {
    this.clear();
    this.owner = owner;
    this.timer = setTimeout(() => {
      this.timer = undefined;

      const text = message();

      if (text) {
        this.ensureRegion().textContent = text;
      }
    }, ANNOUNCE_DELAY_MS);
  }

  /** Drops a pending or current announcement (only `owner`'s, if given). */
  clear(owner?: HTMLElement): void {
    if (owner && owner !== this.owner) {
      return;
    }

    clearTimeout(this.timer);
    this.timer = undefined;
    this.owner = null;

    if (this.region) {
      // A fixed field's error should not be found later when reading the page.
      this.region.textContent = '';
    }
  }

  private ensureRegion(): HTMLElement {
    if (this.region?.isConnected) {
      return this.region;
    }

    const region = this.document.createElement('div');

    region.setAttribute('aria-live', 'polite');
    region.setAttribute('data-testid', 'form-error-announcer');
    region.className = 'sr-only';
    this.document.body.append(region);
    this.region = region;

    return region;
  }
}
