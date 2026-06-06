import { Injectable } from '@angular/core';
import { TranslocoLoader } from '@ngneat/transloco';
import { from, Observable } from 'rxjs';
import { DEFAULT_LANGUAGE, LanguageCode } from './languages';

type TranslationMap = Record<string, unknown>;

const TRANSLATION_IMPORTS: Record<LanguageCode, () => Promise<TranslationMap>> = {
  en: () => import('./translations/en.translation').then((module) => module.default),
  pl: () => import('./translations/pl.translation').then((module) => module.default),
};

@Injectable({ providedIn: 'root' })
export class AppTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<TranslationMap> {
    const language = (lang as LanguageCode) in TRANSLATION_IMPORTS ? (lang as LanguageCode) : DEFAULT_LANGUAGE;
    return from(TRANSLATION_IMPORTS[language]());
  }
}
