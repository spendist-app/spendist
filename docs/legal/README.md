# Dokumenty prawne Spendist

Wersja 1.1 z 2026-09-30 opisuje bezpłatną, hobbystyczną usługę prowadzoną przez Bartłomieja Borzuckiego. Nie była sprawdzana przez prawnika; nie stanowi potwierdzenia zgodności z każdym prawem lokalnym. Operator zaakceptował przygotowanie i publikację bez uzależniania ich od płatnej konsultacji.

| Dokument | Polski | English |
| --- | --- | --- |
| Regulamin | [REGULAMIN.md](./REGULAMIN.md) | [TERMS.en.md](./TERMS.en.md) |
| Polityka prywatności | [POLITYKA-PRYWATNOSCI.md](./POLITYKA-PRYWATNOSCI.md) | [PRIVACY-POLICY.en.md](./PRIVACY-POLICY.en.md) |

Pliki Markdown są źródłem treści. `npm run legal:generate` aktualizuje moduł HTML i wspólny numer wersji. `npm run legal:check` wykrywa rozbieżność. Każda merytoryczna zmiana wymaga aktualizacji obu języków i numeru wersji. Istniejące adresy publiczne udostępniają angielską treść przez `?lang=en`; bez parametru pozostają polskie. Commit na develop nie jest publikacją w serwisie produkcyjnym. Dokumenty zaczynają obowiązywać po udostępnieniu tej wersji w serwisie, a nie od samego commitu.

## Potwierdzone fakty i wdrożone zasady

- Operator: osoba fizyczna, dane kontaktowe i adres potwierdzone 2026-09-30. Jedyny administrator projektu.
- Konta 18+, bez ograniczenia kraju. Rejestracja wymaga dwóch oświadczeń: pełnoletności oraz akceptacji Regulaminu i zapoznania się z Polityką. Bez daty urodzenia, skanu dokumentu i zgody rodzica.
- Supabase Free, główna baza eu-west-2 (Londyn, Wielka Brytania). Operator nie robi obecnie własnych kopii bazy. Skrypt kopii w repozytorium nie oznacza aktywnej procedury backupu. Nie deklarujemy niepotwierdzonych limitów 30/90 dni ani pełnej lokalizacji w UE.
- Cloudflare hostuje aplikację i przekierowuje pocztę z domeny do prywatnego Gmaila. Korespondencja wychodząca korzysta z Gmaila; SES nie jest jeszcze skonfigurowany.
- Samodzielne usuwanie Konta i eksport istnieją. Polityka opisuje trwałe usunięcie produkcyjnych rekordów, odrębność korespondencji/logów i danych drugiego uczestnika Kieszonkowego.
- Kieszonkowe, OAuth/MCP, odwołanie grantów i ograniczenia tokenów są uwzględnione. Nie obiecujemy usunięcia kopii pobranych przez zewnętrzną aplikację.
- Własny fallback inicjałów zastępuje automatyczne DiceBear, także dla wcześniejszych Kont, bez modyfikowania ich zapisanych danych.
- Wersje dokumentów, klientowy czas potwierdzenia i oświadczenie 18+ są zapisywane w Supabase Auth `user_metadata.legal_acceptance`. To deklaracja Użytkownika, nie weryfikacja wieku ani niezmienialny rejestr prawny. Metadane Auth są edytowalne przez właściciela Konta; nie służą autoryzacji ani RLS. Nie uzupełniamy historii akceptacji za wcześniejszych Użytkowników.
- Istniejący Użytkownik bez aktualnego potwierdzenia widzi informację w Aplikacji i może potwierdzić zasady. Informacja nie blokuje dostępu do danych i eksportu. Linki są dostępne także w ustawieniach.
- GA4 `G-WY8ZY07NGW` działa po zgodzie i tylko dla niezalogowanych na wygenerowanej liście publicznych stron. Przed zgodą i po odmowie brak tagu i pingów. Równorzędne przyciski, możliwość wycofania, decyzja i hostowe cookies do 180 dni. Tag działa w usuwanym iframe bez DOM formularzy i historii SPA aplikacji; Worker dopuszcza Google wyłącznie w tym dokumencie pomocniczym.

## Czynności w kontach dostawców

Warunki dostawców sprawdzono w publicznych źródłach; nie zweryfikowano, jakie wersje zaakceptowano na kontach Operatora. Nie oznaczamy tego jako wykonanej kontroli umów.

- Supabase publikuje DPA jako część warunków usługi, a Cloudflare DPA jako część głównej umowy. Operator powinien zapoznać się z warunkami właściwymi dla swojego konta i zachować informację o ich akceptacji; zwykle nie wymaga to osobnej negocjacji ani płatnego planu.
- Prywatny Gmail nie jest Google Workspace. Nie deklarujemy zawartej umowy Google Workspace ani przypisujemy jej prywatnej skrzynce. Nie wysyłać zbędnych danych finansowych pocztą; ewentualna zmiana skrzynki wymaga aktualizacji polityki.
- Przed uruchomieniem SES: zweryfikować nadawcę, ustawić region i SMTP/Edge Function, sprawdzić faktyczną wysyłkę oraz uaktualnić politykę. Nie włączać przez ten commit dostawcy, którego konfiguracja nie jest gotowa.
- Przed dodaniem kopii: ustalić plan, faktyczny zakres (baza/Storage), retencję i możliwość odtworzenia; zaktualizować politykę. Nie uruchamiać ani nie usuwać kopii produkcyjnych w ramach tej zmiany.

## Ustawienia w Google Analytics

Identyfikator strumienia przekazano 2026-09-30. Implementacja i publiczne dokumenty opisują aktywną integrację po wdrożeniu, ale nie mamy dostępu administracyjnego do konta GA4. Przed wdrożeniem Operator powinien:

1. W strumieniu WWW wyłączyć **Pomiar zaawansowany (Enhanced measurement)**. Aplikacja wysyła odsłony ręcznie; iframe nie ma formularzy ani historii aplikacji, ale nie potrzebujemy dodatkowych automatycznych zdarzeń.
2. Pozostawić Google Signals, personalizację reklam, remarketing i połączenia z Google Ads wyłączone. Kod odmawia zgód reklamowych i wyłącza te sygnały niezależnie od konta.
3. Ustawić retencję danych zdarzeń i użytkowników na **2 miesiące** oraz wyłączyć odnawianie przy nowej aktywności, jeśli dostępne. To zalecana konfiguracja, nie potwierdzony stan konta; sprawdzić i podać faktyczny okres w politykach po ustawieniu. Raporty zbiorcze podlegają odrębnym zasadom Google.
4. Sprawdzić warunki Analytics i dodatek o przetwarzaniu danych na swoim koncie. Wdrożenie kodu nie akceptuje umów za Operatora.

Testy przeglądarkowe zastępują skrypt i endpointy Google kontrolowanym stubem, aby nie zanieczyszczać rzeczywistych statystyk. Nie wykonują operacji na bazie produkcyjnej.


## Źródła

- [RODO, art. 6, 12–22, 28 i 32](https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX%3A32016R0679).
- [Supabase: regiony](https://supabase.com/docs/guides/platform/regions), [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [backupy](https://supabase.com/docs/guides/platform/backups).
- [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/).
- [Polityka prywatności Google](https://policies.google.com/privacy?hl=pl).
- [GA4: podstawowy i zaawansowany tryb zgody](https://support.google.com/analytics/answer/10000067?hl=en).
- [AWS: DPA jako część warunków](https://aws.amazon.com/compliance/gdpr-center/).
