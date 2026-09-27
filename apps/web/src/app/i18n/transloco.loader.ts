import { Injectable } from '@angular/core';
import { TranslocoLoader, type Translation } from '@ngneat/transloco';
import { from, Observable } from 'rxjs';
import { DEFAULT_LANGUAGE, LanguageCode } from './languages';

type TranslationMap = Translation;

const TRANSLATION_IMPORTS: Record<LanguageCode, () => Promise<TranslationMap>> =
  {
    en: () =>
      import('./translations/en.translation').then((module) => module.default),
    pl: () =>
      import('./translations/pl.translation').then((module) => module.default),
  };

@Injectable({ providedIn: 'root' })
export class AppTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<TranslationMap> {
    const language = lang === 'en' || lang === 'pl' ? lang : DEFAULT_LANGUAGE;

    return from(TRANSLATION_IMPORTS[language]());
  }
}
