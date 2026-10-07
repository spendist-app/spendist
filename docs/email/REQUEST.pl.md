# Prompt przekazany przez użytkownika — 2026-10-07

Kontekst Spendist: nadawcy hello@spendist.app i noreply@spendist.app zależnie od celu wiadomości. Panel administratora ma wymagać is_admin=true w bazie; domyślnie false. Priorytet: bezpieczeństwo i ochrona przed nadmierną wysyłką oraz kosztami.

## Oryginalny prompt

Mam drugi projekt i konto na Amazon AWS. Po stronie AWS nie mam jeszcze skonfigurowanej wysyłki maili, alertów ani zabezpieczeń dla tej aplikacji.

Chcę przygotować bezpieczną wysyłkę powiadomień i maili systemowych przez Amazon SES, niezależne alerty przez Amazon SNS oraz prywatny panel administratora pokazujący wykorzystanie limitów i problemy z wysyłką.

Przeczytaj AGENTS.md i sprawdź istniejący kod, technologie, hosting, bazę danych, logowanie oraz obecny sposób wysyłania maili. Dopasuj rozwiązanie do projektu. Zachowaj lokalne zmiany i korzystaj z aktualnej oficjalnej dokumentacji AWS oraz używanych usług.

Najpierw ustal ze mną brakujące informacje:

- domenę i adres nadawcy;
- adres odbiorcy alertów;
- istniejące konto aplikacji, które ma być administratorem;
- region AWS;
- przewidywaną liczbę wiadomości.

Proponowany początkowy cel to 100 odbiorców w ruchomym oknie 24 godzin, łącznie z powiadomieniami, logowaniem i resetami hasła. Wyjaśnij wpływ tego ograniczenia na działanie aplikacji.

1. Bezpieczna konfiguracja AWS

Sprawdź status konta i plan rozliczeniowy, MFA administratora oraz istniejące klucze i uprawnienia. Przygotuj konfigurację SES, weryfikację domeny, DKIM i właściwe ustawienia SPF/DMARC, uwzględniając istniejące rekordy DNS. Sprawdź ograniczenia sandboxa i wymagania dostępu produkcyjnego.

Przygotuj uprawnienia aplikacji zgodnie z zasadą najmniejszych uprawnień: wysyłka wyłącznie z wybranego nadawcy i regionu, odczyt stanu SES oraz publikacja wyłącznie do konkretnego tematu SNS. Preferuj role i krótkotrwałe poświadczenia, jeżeli hosting je obsługuje. Jeśli potrzebne są klucze, przechowuj je wyłącznie po stronie serwera. Nie używaj kluczy konta root.

2. Ochrona przed nadmierną wysyłką

Dodaj kolejkę, ograniczenia na użytkownika, ochronę przed spamowaniem publicznych formularzy i wspólny limit aplikacji. Zabezpiecz równoległe wysyłki i ponawianie, aby nie obchodziły limitów ani nie powodowały niekontrolowanych duplikatów.

Sprawdź osobno maile dostawcy logowania, np. Supabase Auth. Limit kolejki powiadomień nie obejmuje automatycznie logowania i resetów hasła.

Ustal możliwość rzeczywistego ograniczenia SES do 100 odbiorców/24h i odpowiedniego limitu na sekundę. Jeśli AWS wymaga zgłoszenia Support, przygotuj jego treść. Nie przedstawiaj alertu kosztowego ani progu monitorowania jako twardej blokady wydatków. Wyjaśnij, które zabezpieczenia działają również po kradzieży klucza.

3. Monitoring i niezależne alerty

Przygotuj serwerowy odczyt SES co 5 minut, obejmujący API i SMTP w wybranym koncie i regionie.

Wysyłaj ostrzeżenia przez standardowy temat SNS na wskazany adres:

- przy 80% i 95% progu;
- przy wyczerpaniu rzeczywistej kwoty lub wyłączeniu wysyłania;
- przy problemach z wysyłką lub odczytem statystyk;
- gdy rzeczywisty limit AWS różni się od oczekiwanego.

Zapamiętuj aktywne zdarzenia, aby nie wysyłać tego samego ostrzeżenia co 5 minut. Dodaj ograniczone ponawianie i zabezpieczenie równoległych uruchomień. Nie uznawaj błędu odczytu za zerowe zużycie. Wyraźnie zaznacz opóźnienie monitorowania i jego ograniczenia podczas awarii.

4. Prywatny panel administratora

Pokaż wykorzystanie ruchomych 24 godzin, rzeczywisty limit AWS, próg ostrzeżeń, czas ostatniego odczytu, stan kolejki i historię alertów.

Uprawnienia administratora muszą być sprawdzane po stronie serwera i bazy. Możesz użyć osobnej tabeli administratorów albo chronionego pola is_admin. Użytkownik nie może sam nadać sobie uprawnień przez profil, metadane, API ani RPC. Sam guard przeglądarkowy nie wystarcza.

Panel otrzymuje wyłącznie dane zbiorcze, bez sekretów, treści maili i adresów odbiorców.

5. Kontrola poświadczeń i testy

Sprawdź kod, historię Git, logowanie, konfigurację CI/CD, pliki środowiskowe oraz wynikowy kod przeglądarkowy pod kątem ujawnienia sekretów. Nie drukuj znalezionych wartości. Jeśli poświadczenie było ujawnione, wskaż potrzebną rotację.

Przetestuj odmowę dostępu zwykłemu użytkownikowi, brak możliwości samodzielnego nadania administratora, limity przy równoległych wysyłkach, ponawianie i progi alertów. Używaj izolowanej bazy testowej; nie resetuj danych produkcyjnych.

Wykonaj lokalny kod, dokumentację i wymagane kontrole. Przed konfiguracją produkcyjną przedstaw konkretne zasoby, uprawnienia i aktualny szacunek dodatkowych kosztów, oddzielając SES, SNS i hosting monitora. Uzyskaj zatwierdzenie przed uruchomieniem płatnych zasobów, zmianami uprawnień oraz publikacją i wdrożeniem.

Po zatwierdzonym wdrożeniu sprawdź panel, harmonogram, potwierdzenie subskrypcji SNS i odbiór testowego alertu. W raporcie rozróżnij to, co przygotowano, wdrożono i rzeczywiście zweryfikowano.
