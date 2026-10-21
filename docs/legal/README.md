# Dokumenty prawne Spendist

| Dokument | Polski | English |
| --- | --- | --- |
| Regulamin | [REGULAMIN.md](./REGULAMIN.md) | [TERMS.en.md](./TERMS.en.md) |
| Polityka prywatności | [POLITYKA-PRYWATNOSCI.md](./POLITYKA-PRYWATNOSCI.md) | [PRIVACY-POLICY.en.md](./PRIVACY-POLICY.en.md) |

Pliki Markdown są źródłem treści. `npm run legal:generate` aktualizuje moduł HTML i wspólny numer wersji. `npm run legal:check` wykrywa rozbieżność. Każda merytoryczna zmiana wymaga aktualizacji obu języków i numeru wersji. Istniejące adresy publiczne udostępniają angielską treść przez `?lang=en`; bez parametru pozostają polskie.

Commit na `develop` nie jest publikacją w serwisie produkcyjnym. Dokumenty zaczynają obowiązywać po udostępnieniu danej wersji w serwisie, a nie od samego commitu.

Wersje dokumentów, klientowy czas potwierdzenia i oświadczenie 18+ są zapisywane w Supabase Auth `user_metadata.legal_acceptance`. To deklaracja Użytkownika, nie weryfikacja wieku ani niezmienialny rejestr prawny; metadane nie służą autoryzacji ani RLS.
