import { Provider } from '@angular/core';
import { provideTransloco, translocoConfig } from '@ngneat/transloco';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';
import { AppTranslocoLoader } from './transloco.loader';

const AVAILABLE_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((language) => language.code);

export function provideAppTransloco(): Provider[] {
  const isDevMode = typeof ngDevMode !== 'undefined' && !!ngDevMode;

  return [
    provideTransloco({
      config: translocoConfig({
        availableLangs: AVAILABLE_LANGUAGE_CODES,
        defaultLang: DEFAULT_LANGUAGE,
        fallbackLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode,
      }),
      loader: AppTranslocoLoader,
    }),
  ];
}
