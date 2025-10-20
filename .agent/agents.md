# Notatki dla agentów

## Ikony
- W projekcie używamy biblioteki `@ng-icons/core` oraz zestawów Heroicons (`outline`, `solid`, `mini`, `micro`).
- Ikony są rejestrowane dynamicznie w komponentach dzięki `HeroIconPickerComponent`, który udostępnia wyszukiwalną listę ikon i zwraca kanoniczne nazwy (`hero...`).
- Normalizacja nazw ikon po stronie store'u odbywa się w `apps/web/src/app/pages/settings/settings.store.ts` przez helper `canonicalHeroIconName`, co zapewnia spójne przechowywanie w Supabase.

## Transloco (i18n)
- Wielojęzyczność (EN/PL) jest dostarczana przez `@ngneat/transloco`; konfiguracja globalna w `app.config.ts` korzysta z `provideAppTransloco()`.
- Loader tłumaczeń (`AppTranslocoLoader`) ładuje katalogi z `apps/web/src/app/i18n/translations/`.
- Preferencja języka jest zapisywana w localStorage (`LanguageService`), domyślny język wybierany jest na podstawie poprzedniego zapisu lub języka przeglądarki.
- Navbar udostępnia selektor języka, który przełącza translacje w locie i aktualizuje atrybut `lang` w dokumencie.
