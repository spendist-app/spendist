import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { DEFAULT_LANGUAGE, LanguageCode, SUPPORTED_LANGUAGES } from '../i18n/languages';

const STORAGE_KEY = 'spendist.language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly activeLanguage = signal<LanguageCode>(this.resolveInitialLanguage());

  readonly currentLanguage = computed(() => this.activeLanguage());
  readonly availableLanguages = SUPPORTED_LANGUAGES;

  constructor() {
    this.setLanguage(this.activeLanguage());
  }

  setLanguage(language: LanguageCode): void {
    if (!SUPPORTED_LANGUAGES.some((option) => option.code === language)) {
      return;
    }

    if (this.activeLanguage() === language) {
      this.transloco.setActiveLang(language);
      this.persistLanguage(language);
      this.updateDocumentLanguage(language);
      return;
    }

    this.activeLanguage.set(language);
    this.transloco.setActiveLang(language);
    this.persistLanguage(language);
    this.updateDocumentLanguage(language);
  }

  private resolveInitialLanguage(): LanguageCode {
    const saved = this.readLanguage();
    if (saved) {
      return saved;
    }

    if (isPlatformBrowser(this.platformId)) {
      const browserLanguage = navigator.language?.split('-')[0]?.toLowerCase() ?? '';
      const match = SUPPORTED_LANGUAGES.find((option) => option.code === browserLanguage);
      if (match) {
        return match.code;
      }
    }

    return DEFAULT_LANGUAGE;
  }

  private persistLanguage(language: LanguageCode): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage errors (e.g., private mode, quotas).
    }
  }

  private readLanguage(): LanguageCode | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return SUPPORTED_LANGUAGES.some((option) => option.code === stored) ? (stored as LanguageCode) : null;
    } catch {
      return null;
    }
  }

  private updateDocumentLanguage(language: LanguageCode): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.documentElement.lang = language;
  }
}
