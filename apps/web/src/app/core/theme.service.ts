import { inject, Injectable, computed, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemeName = 'spendistLight' | 'spendistDark';

const STORAGE_KEY = 'spendist-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = typeof window !== 'undefined';

  private readonly themeSignal = signal<ThemeName>(this.getInitialTheme());

  readonly theme = computed(() => this.themeSignal());

  constructor() {
    this.applyTheme(this.themeSignal());
  }

  toggleTheme(): void {
    const nextTheme = this.themeSignal() === 'spendistLight' ? 'spendistDark' : 'spendistLight';
    this.setTheme(nextTheme);
  }

  setTheme(theme: ThemeName): void {
    if (this.themeSignal() === theme) {
      return;
    }

    this.themeSignal.set(theme);
    this.applyTheme(theme);
    this.persistTheme(theme);
  }

  private getInitialTheme(): ThemeName {
    const storedTheme = this.readStoredTheme();
    if (storedTheme) {
      return storedTheme;
    }

    if (this.isBrowser) {
      try {
        const prefersDark = typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false;
        return prefersDark ? 'spendistDark' : 'spendistLight';
      } catch {
        return 'spendistLight';
      }
    }

    return 'spendistLight';
  }

  private applyTheme(theme: ThemeName): void {
    const documentElement = this.document?.documentElement;
    if (!documentElement) {
      return;
    }
    documentElement.setAttribute('data-theme', theme);
  }

  private persistTheme(theme: ThemeName): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      window.localStorage?.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore storage failures
    }
  }

  private readStoredTheme(): ThemeName | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const stored = window.localStorage?.getItem(STORAGE_KEY);
      return stored === 'spendistLight' || stored === 'spendistDark' ? stored : null;
    } catch {
      return null;
    }
  }
}
