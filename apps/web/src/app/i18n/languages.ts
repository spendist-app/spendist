export type LanguageCode = 'en' | 'pl';

export interface LanguageOption {
  readonly code: LanguageCode;
  readonly labelKey: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', labelKey: 'common.language.english' },
  { code: 'pl', labelKey: 'common.language.polish' },
] as const;

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
