# Polityka prywatności aplikacji Spendist

**Wersja 1.1 — 2026-09-30**

Dokument dotyczy hostowanej wersji `https://spendist.app` i jej integracji MCP. Obowiązuje od udostępnienia tej wersji w serwisie. [English version](/polityka-prywatnosci?lang=en).

## 1. Administrator i kontakt

Administratorem danych jest **Bartłomiej Borzucki**, osoba fizyczna prowadząca bezpłatny, hobbystyczny projekt Spendist, adres: **ul. Zakładowa 11u/5, 50-231 Wrocław**, e-mail: **hello@spendist.app**. Pod tym adresem można zgłaszać pytania o prywatność, żądania dotyczące danych i incydenty bezpieczeństwa.

Polityka nie dotyczy własnych instancji oprogramowania prowadzonych przez osoby trzecie. Konta w hostowanej wersji są przeznaczone dla osób, które ukończyły 18 lat. Serwis nie ogranicza dostępności do określonego kraju.

## 2. Jakie dane i po co przetwarzamy

| Cel | Dane | Podstawa prawna |
| --- | --- | --- |
| Utworzenie Konta i działanie Aplikacji | e-mail, nazwa profilu, nazwa użytkownika, identyfikator Konta, język, strefa czasowa, waluta, opcjonalny avatar; transakcje, kwoty, daty, opisy, portfele, kategorie, grupy, tagi, miejsca, płatności cykliczne, dane modułów i powiadomienia | wykonanie umowy — art. 6 ust. 1 lit. b RODO |
| Potwierdzenie rejestracji | oświadczenie o ukończeniu 18 lat, wersje dokumentów i czas ich zaakceptowania/zapoznania się z nimi | wykonanie umowy oraz uzasadniony interes w dokumentowaniu jej zawarcia — art. 6 ust. 1 lit. b i f RODO |
| Logowanie i bezpieczeństwo | informacje o sesji i uwierzytelnianiu, adres IP, czas żądania, urządzenie i przeglądarka, logi techniczne; metadane autoryzacji i audytu MCP | wykonanie umowy oraz uzasadniony interes w zabezpieczeniu i utrzymaniu usługi — art. 6 ust. 1 lit. b i f RODO |
| Kontakt i reklamacje | adres nadawcy, treść korespondencji i informacje potrzebne do obsługi zgłoszenia | wykonanie umowy oraz uzasadniony interes w obsłudze zgłoszeń — art. 6 ust. 1 lit. b i f RODO |
| Statystyki publicznych treści po zgodzie | odsłony, publiczna ścieżka strony, identyfikatory cookies i dane techniczne przeglądarki | zgoda — art. 6 ust. 1 lit. a RODO |
| Obowiązki prawne i roszczenia | dane niezbędne do wykonania konkretnego obowiązku lub obsługi roszczenia | art. 6 ust. 1 lit. c RODO albo uzasadniony interes w ustaleniu, dochodzeniu lub obronie roszczeń — art. 6 ust. 1 lit. f RODO |

Podanie danych wymaganych przez formularz jest dobrowolne, ale konieczne do utworzenia Konta. Nazwa profilu nie musi być prawdziwym imieniem i nazwiskiem. Nie zbieramy daty urodzenia ani dokumentu tożsamości przy rejestracji. Hasła obsługuje Supabase Auth; nie przechowujemy ich w postaci jawnej.

Import plików odbywa się w przeglądarce: zapisujemy wybrane przez Użytkownika rekordy, a nie przesłany plik źródłowy. Eksport pozwala zachować własną kopię danych. Nie sprzedajemy danych, nie używamy wpisów finansowych do reklamy i nie udostępniamy publicznie zawartości Kont. Automatyczne wyliczenia i zaplanowane transakcje nie stanowią profilowania ani decyzji wywołujących skutki prawne w rozumieniu art. 22 RODO.

## 3. Kieszonkowe i podłączone aplikacje

**Kieszonkowe** łączy dwa Konta po przyjęciu zaproszenia. Przetwarzamy e-mail zapraszanej osoby, identyfikatory uczestników, status relacji oraz powiązane wpisy i harmonogramy. Powiązanie umożliwia zapis odpowiadającego wydatku i przychodu. Płatnik może również przeglądać, zmieniać i usuwać wydatki, które sam zapisał na Koncie odbiorcy w tym module. Nie daje mu to dostępu do pozostałych transakcji, sald ani portfeli odbiorcy. Rozłączenie zachowuje historię, wstrzymuje przyszłe harmonogramy i odbiera płatnikowi dostęp do takich wydatków. Token zaproszenia jest przechowywany jako skrót, jest jednorazowy i wygasa po siedmiu dniach. Moduł nie wykonuje przelewów i także podlega zasadzie 18+.

**Podłączone aplikacje i MCP** otrzymują dostęp dopiero po autoryzacji Użytkownika. Zależnie od dostępnych narzędzi klient może odczytywać dane finansowe, eksportować je oraz wykonywać obsługiwane zmiany i usunięcia. Zakres dostępu jest opisany na ekranie autoryzacji. Uprawnienia można odwołać w **Ustawieniach → Podłączone aplikacje**, co odbiera możliwość odświeżania dostępu; już wydany token może działać do wygaśnięcia. Odwołanie nie usuwa kopii pobranych wcześniej przez zewnętrzną aplikację. Użytkownik powinien sprawdzić jej własne zasady prywatności, w tym zasady dostawcy AI, jeżeli korzysta z takiego klienta.

Audyt zmian MCP zapisuje identyfikator klienta, narzędzie, identyfikatory obiektów, czas i wynik działania; nie zapisuje argumentów narzędzi, kwot, opisów transakcji, tokenów ani treści eksportu. Lokalny pomocnik tworzenia promptów nie wysyła sam danych do AI; skopiowanie promptu lub danych do zewnętrznej usługi zależy od Użytkownika.

## 4. Dostawcy i odbiorcy

- **Supabase** — uwierzytelnianie, baza danych, pliki avatarów i backend. Główna baza projektu znajduje się w regionie **eu-west-2, Londyn, Wielka Brytania**. Nie oznacza to, że wszystkie operacje dostawcy odbywają się tylko w tym regionie. [Warunki przetwarzania Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum).
- **Cloudflare** — hosting, obsługa i ochrona ruchu, a także przekierowanie wiadomości przychodzących do `@spendist.app` do skrzynki Administratora. [Warunki przetwarzania Cloudflare](https://www.cloudflare.com/cloudflare-customer-dpa/).
- **Google / Gmail** — odbieranie korespondencji i wysyłanie wiadomości przez prywatną skrzynkę Administratora. Nie jest to obecnie Google Workspace. Wiadomości i ich metadane są obsługiwane również zgodnie z [polityką prywatności Google](https://policies.google.com/privacy?hl=pl). Nie należy przesyłać pocztą haseł ani pełnych eksportów finansowych, jeśli nie jest to potrzebne do zgłoszenia.
- **Google Analytics** — statystyki publicznych treści po zgodzie, opisane w pkt 7. [Polityka prywatności Google](https://policies.google.com/privacy?hl=pl) i [informacje o danych w Analytics](https://support.google.com/analytics/answer/6004245?hl=pl).
- **Zewnętrzni klienci autoryzowani przez Użytkownika** oraz drugi uczestnik Kieszonkowego — tylko w zakresie opisanym w pkt 3.

Amazon SES jest przygotowywany do wiadomości transakcyjnych, ale nie jest jeszcze skonfigurowany. Przed jego uruchomieniem zaktualizujemy informacje o używanej usłudze. Nie traktujemy planowanej konfiguracji jako działającej.

Nowe Konta nie pobierają automatycznych avatarów z DiceBear; wcześniejsze domyślne adresy DiceBear są zastępowane w interfejsie lokalnymi inicjałami. Jeżeli Użytkownik ma avatar z innego zewnętrznego adresu, pobranie obrazka może ujawnić temu serwerowi adres IP i dane techniczne przeglądarki.

Dostęp administracyjny do projektu ma obecnie wyłącznie Administrator. Dane mogą zostać udostępnione właściwym organom, jeżeli wymaga tego prawo.

## 5. Przetwarzanie poza EOG

Wielka Brytania znajduje się poza Europejskim Obszarem Gospodarczym. Dostawcy korzystający z globalnej infrastruktury mogą przetwarzać dane także w innych państwach, w tym w USA. Podstawy takich transferów wynikają z mających zastosowanie decyzji o odpowiednim stopniu ochrony lub zabezpieczeń umownych, w szczególności standardowych klauzul umownych, opisanych w warunkach danego dostawcy. Nie gwarantujemy przechowywania wszystkich danych wyłącznie w UE. Informacje o stosowanych zabezpieczeniach można uzyskać, kontaktując się z Administratorem.

## 6. Jak długo przechowujemy dane

- Dane Konta i własne rekordy finansowe przechowujemy przez czas istnienia Konta. Samodzielne usunięcie Konta w ustawieniach usuwa Konto, pliki avatarów i przypisane mu rekordy produkcyjne po poprawnym zakończeniu operacji. Nie ma okresu przywracania Konta. Niektóre informacje stanowiące własne rekordy drugiego uczestnika Kieszonkowego mogą pozostać na jego Koncie.
- Wniosek o usunięcie lub realizację innych praw można również przesłać e-mailem. Odpowiadamy bez zbędnej zwłoki, zasadniczo w ciągu miesiąca; jeżeli przepisy pozwalają na przedłużenie, poinformujemy o przyczynie i terminie. Nie jest to okres automatycznego odroczenia samodzielnego usunięcia Konta.
- Logi infrastruktury są przechowywane zgodnie z konfiguracją i aktualnym planem dostawcy. Dane diagnostyczne, które wyodrębnimy w związku z awarią lub incydentem, zachowujemy przez czas wyjaśniania i zabezpieczenia sprawy. Audyt dostępu MCP jest związany z Kontem. Nie deklarujemy wspólnego, niezweryfikowanego okresu 90 dni dla wszystkich logów.
- Korespondencję zachowujemy przez czas potrzebny do obsługi sprawy, a gdy jest niezbędna do udokumentowania obowiązku lub roszczenia — przez właściwy okres wynikający z prawa i przedawnienia. Niepotrzebną korespondencję usuwamy.
- Administrator nie tworzy obecnie własnych kopii bazy. Używany jest plan Supabase Free, bez gwarancji dostępnej Administratorowi automatycznej kopii do odtworzenia. Dostawca może utrzymywać własne kopie techniczne zgodnie ze swoimi warunkami. Uruchomienie dodatkowych kopii i ich retencja wymagają aktualizacji tej informacji; nie obiecujemy obecnie 90-dniowego cyklu kopii.

## 7. Pamięć przeglądarki i analityka

Aplikacja zapisuje dane sesji oraz preferencje języka i motywu w pamięci przeglądarki. Dane sesji służą logowaniu i bezpieczeństwu; są usuwane lub zastępowane przy wylogowaniu lub wygaśnięciu sesji. Preferencje pozostają do zmiany lub usunięcia przez Użytkownika. Usunięcie pamięci przeglądarki może wylogować Użytkownika lub przywrócić ustawienia domyślne.

**Google Analytics 4 uruchamiamy wyłącznie po dobrowolnej zgodzie**, dla niezalogowanych odwiedzających stronę główną, blog i dokumenty prawne. Przed zgodą i po odmowie nie ładujemy tagu Google ani nie wysyłamy pingów analitycznych. Wykluczamy panel, logowanie, rejestrację, odzyskiwanie hasła, zaproszenia i autoryzację zewnętrznych aplikacji. Pomiar zatrzymuje się po zalogowaniu i przy opuszczeniu mierzonej strony.

Celem jest poznanie odwiedzalności publicznych treści. Google otrzymuje adres publicznej strony bez parametrów i fragmentu, zdarzenie odsłony oraz dane techniczne przeglądarki i urządzenia, w tym adres IP potrzebny do komunikacji i identyfikatory cookies. Nie przekazujemy danych Konta, e-maila, finansów, treści formularzy ani adresu poprzedniej strony. W konfiguracji tagu wyłączamy Google Signals i personalizację reklam oraz odmawiamy zgód reklamowych. Nie wykorzystujemy tych statystyk do reklamy.

Odmowa jest równie dostępna jak zgoda i nie ogranicza działania Spendist. Zgodę można wycofać przez **Ustawienia analityki** na dole każdej strony i przycisk **Odmów / wycofaj**. Wycofanie zatrzymuje przyszły pomiar i usuwa cookies tej integracji; nie zmienia zgodności z prawem wcześniejszego przetwarzania ani automatycznie nie usuwa danych już otrzymanych przez Google. W sprawie ich usunięcia można skontaktować się z Administratorem.

Decyzję zapisujemy lokalnie pod kluczem `spendist.analytics-consent` na **180 dni** — również odmowę. Nie łączymy jej z Kontem. Po zgodzie tag może ustawić hostowe cookies `_ga` i `_ga_WY8ZY07NGW` na maksymalnie **180 dni**, bez przedłużania przy każdym pomiarze. Można je także usunąć w przeglądarce. Dane otrzymane przez Google podlegają retencji skonfigurowanej w usłudze GA4 oraz zasadom Google; okres cookies nie jest okresem przechowywania raportów. Informację o aktualnych ustawieniach retencji można uzyskać od Administratora.


## 8. Prawa i bezpieczeństwo

W zakresie przewidzianym przez RODO przysługuje prawo dostępu i kopii danych, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych, sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie oraz wycofania zgody, gdy jest podstawą przetwarzania. Można wnieść skargę do **Prezesa Urzędu Ochrony Danych Osobowych**. Dodatkowe bezwzględnie obowiązujące prawa lokalne pozostają zachowane.

Wnioski kieruj na **hello@spendist.app**. Przy uzasadnionych wątpliwościach możemy poprosić o informacje niezbędne do potwierdzenia tożsamości, aby nie udostępnić danych osobie nieuprawnionej.

Stosujemy HTTPS, uwierzytelnianie i kontrolę dostępu izolującą dane użytkowników. Projekt hobbystyczny nie gwarantuje braku awarii ani odzyskania usuniętych danych. Chroń hasło i skrzynkę pocztową oraz korzystaj z eksportu, jeśli potrzebujesz własnej kopii.

## 9. Zmiany

Aktualizujemy Politykę, gdy zmieniają się funkcje, dostawcy lub sposób przetwarzania. Wersja i data wydania są wskazane na początku. O istotnych zmianach informujemy w Aplikacji lub e-mailem. Zapoznanie się z Polityką przy rejestracji jest potwierdzeniem otrzymania informacji, a nie zbiorczą zgodą na przetwarzanie danych.
