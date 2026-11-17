import { inject, Injectable, computed, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemeName = 'spendistLight' | 'spendistDark';

const STORAGE_KEY = 'spendist-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Browser toolbar colour per theme: the navbar background (base-100). */
const THEME_COLORS: Record<ThemeName, string> = {
  spendistLight: '#ffffff',
  spendistDark: '#161a1d',
};

function colorSchemeFor(override: ThemeName | null): string {
  if (override === null) return 'light dark';

  return override === 'spendistDark' ? 'dark' : 'light';
}

/**
 * Follows the system colour scheme unless the user picked the opposite one.
 * `public/theme-init.js` applies the same rules before the first paint.
 *
 * A stored theme is an explicit override. Toggling back to the scheme the
 * system currently uses removes the override, so the app follows the system
 * again. An override is never dropped just because the system later matches
 * it: systems that switch by time of day would otherwise make pinning a theme
 * impossible.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly view = this.document.defaultView;

  private readonly systemTheme = signal<ThemeName>(this.readSystemTheme());
  private readonly storedTheme = signal<ThemeName | null>(
    this.readStoredTheme()
  );

  readonly theme = computed(() => this.storedTheme() ?? this.systemTheme());
  /** True while the theme follows the system colour scheme. */
  readonly followsSystem = computed(() => this.storedTheme() === null);

  constructor() {
    this.apply();
    this.watchSystemTheme();
    this.watchOtherTabs();
  }

  toggleTheme(): void {
    const target: ThemeName =
      this.theme() === 'spendistLight' ? 'spendistDark' : 'spendistLight';

    const override = target === this.systemTheme() ? null : target;

    this.storedTheme.set(override);
    this.persist(override);
    this.apply();
  }

  private apply(): void {
    const root = this.document.documentElement;
    const theme = this.theme();
    const override = this.storedTheme();

    root.setAttribute('data-theme', theme);

    const colorScheme = this.document.querySelector<HTMLMetaElement>(
      'meta[name="color-scheme"]'
    );

    if (colorScheme) {
      colorScheme.content = colorSchemeFor(override);
    }

    for (const meta of this.document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]'
    )) {
      const media = meta.getAttribute('media') ?? '';
      const schemeTheme: ThemeName = media.includes('dark')
        ? 'spendistDark'
        : 'spendistLight';

      meta.content = THEME_COLORS[override ?? schemeTheme];
    }
  }

  private watchSystemTheme(): void {
    const query = this.matchDarkQuery();

    query?.addEventListener('change', (event) => {
      this.systemTheme.set(event.matches ? 'spendistDark' : 'spendistLight');
      this.apply();
    });
  }

  private watchOtherTabs(): void {
    this.view?.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) {
        return;
      }

      this.storedTheme.set(this.readStoredTheme());
      this.apply();
    });
  }

  private matchDarkQuery(): MediaQueryList | null {
    try {
      return this.view?.matchMedia?.(DARK_QUERY) ?? null;
    } catch {
      return null;
    }
  }

  private readSystemTheme(): ThemeName {
    return this.matchDarkQuery()?.matches ? 'spendistDark' : 'spendistLight';
  }

  private persist(theme: ThemeName | null): void {
    try {
      if (theme === null) {
        this.view?.localStorage.removeItem(STORAGE_KEY);
      } else {
        this.view?.localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
  }

  private readStoredTheme(): ThemeName | null {
    try {
      const stored = this.view?.localStorage.getItem(STORAGE_KEY);

      return stored === 'spendistLight' || stored === 'spendistDark'
        ? stored
        : null;
    } catch {
      return null;
    }
  }
}
