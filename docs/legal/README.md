# Dokumenty prawne Spendist

Pierwsza wersja robocza dokumentów:

- [Regulamin](./REGULAMIN.md)
- [Polityka prywatności](./POLITYKA-PRYWATNOSCI.md)

## Przed publikacją

- [x] Ustawiono `hello@spendist.app` jako wspólny adres Operatora/Administratora, reklamacji, prywatności i bezpieczeństwa.
- [x] Potwierdzono, że hostowaną wersję Aplikacji prowadzi Bartłomiej Borzucki jako osoba fizyczna; imię, nazwisko i adres pocztowy uzupełniono w obu dokumentach.
- [ ] Zlecić prawnikowi weryfikację dokumentów pod kątem modelu Operatora i użytkowników docelowych.
- [ ] Potwierdzić lokalizację przetwarzania oraz umowy powierzenia z Supabase, Cloudflare, Google i dostawcą poczty.
- [ ] Potwierdzić i technicznie wdrożyć okresy retencji: 30 dni na usunięcie danych produkcyjnych, 90 dni kopii/logów i 14 miesięcy w GA4.
- [ ] Wdrożyć banner zgody, domyślnie blokujący Google Analytics, oraz łatwe wycofanie zgody.
- [ ] Zagwarantować, że tag Google Analytics nie jest ładowany po zalogowaniu ani na trasach prywatnych i nie otrzymuje danych identyfikujących.
- [ ] Wyłączyć w GA4 Google Signals, funkcje reklamowe, remarketing i personalizację reklam.
- [x] Dodano publiczne trasy HTML dla obu draftów oraz aktywne linki w stopce i rejestracji.
- [ ] Po zakończeniu draftów zmienić tekst rejestracji na akceptację obowiązującego Regulaminu i potwierdzenie zapoznania się z Polityką prywatności; dodać linki również w ustawieniach.
- [ ] Zapewnić mechanizm usunięcia Konta i eksportu danych zgodny z opisem.

## Podstawy wykorzystane w szkicu

- RODO, w szczególności art. 6, 12–22 i 32: `https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=pl`
- Ustawa o świadczeniu usług drogą elektroniczną: `https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20240001513`
- Prawo komunikacji elektronicznej, w szczególności art. 399: `https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20240001221/O/D20241221.pdf`
- Informacje Google o danych zbieranych przez GA4: `https://support.google.com/analytics/answer/11593727`
- Informacje Google o ochronie danych i zgodach: `https://support.google.com/analytics/answer/6004245`
