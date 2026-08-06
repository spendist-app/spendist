---
title: Jak uruchomić Spendist lokalnie z Docker Compose
slug: jak-uruchomic-spendist-lokalnie-docker-compose
description: Uruchom Spendist lokalnie z Docker Compose i izolowanym Supabase. Poznaj wymagania, komendy, porty oraz sposób bezpiecznego zatrzymania.
publishedAt: 2026-07-30
category: spendist
tags:
  - docker
  - docker-compose
  - supabase
  - self-hosting
  - open-source
coverImageId: blog/pl/jak-uruchomic-spendist-lokalnie-docker-compose/cover
coverImageAlt: 'TODO: uzupełnić po przygotowaniu grafiki okładkowej'
draft: true
---

Spendist jest projektem open source, dlatego kod aplikacji można pobrać, sprawdzić i uruchomić na własnym komputerze. Lokalny start przydaje się nie tylko osobom rozwijającym projekt. Pozwala również zobaczyć, z jakich elementów składa się aplikacja i przetestować ją bez powierzania danych produkcyjnej instalacji.

Repozytorium udostępnia produkcyjny obraz aplikacji oraz prosty proces uruchamiania przez Docker Compose. Backend pozostaje zarządzany przez Supabase CLI, dzięki czemu lokalne środowisko korzysta z tych samych migracji, konfiguracji Auth, Storage, Realtime i Edge Functions co pozostałe narzędzia deweloperskie projektu.

W tym poradniku uruchomimy cały lokalny zestaw: frontend Spendist, bazę PostgreSQL, API Supabase, panel Studio i skrzynkę Mailpit do przechwytywania testowych wiadomości.

## Czego potrzebujesz?

Przed rozpoczęciem zainstaluj:

- Git,

- Node.js 22,

- npm,

- Docker Desktop albo Docker Engine ze wspieranym pluginem Docker Compose v2.

Docker musi działać przed wykonaniem pierwszej komendy. Lokalna instalacja tworzy kilka kontenerów Supabase, dlatego pierwsze uruchomienie może potrwać dłużej ze względu na pobieranie obrazów i budowanie aplikacji.

## Pobranie repozytorium

Sklonuj publiczne repozytorium Spendist i przejdź do jego katalogu:

```bash
git clone https://github.com/spendist-app/spendist.git
cd spendist
```

Następnie zainstaluj zależności:

```bash
npm install
```

Zależności Node.js są potrzebne do obsługi Nx, Supabase CLI i lokalnego skryptu, który bezpiecznie łączy backend z kontenerem aplikacji.

## Uruchomienie Spendist

Pełne lokalne środowisko uruchomisz jedną komendą:

```bash
npm run docker:up
```

Skrypt wykonuje kolejno kilka czynności:

1. sprawdza, czy Docker Compose jest dostępny,

2. uruchamia lokalny projekt Supabase o identyfikatorze `spendist-app`,

3. stosuje oczekujące lokalne migracje bazy danych,

4. pobiera z Supabase publiczny adres API i publishable key,

5. upewnia się, że adres prowadzi do izolowanego lokalnego API,

6. buduje produkcyjny frontend Spendist,

7. uruchamia aplikację przez Docker Compose.

Skrypt akceptuje wyłącznie lokalny Supabase działający pod adresem `127.0.0.1` albo `localhost` na porcie `55321`. Nie używa produkcyjnej bazy i nie przekazuje do przeglądarki hasła PostgreSQL, service-role key ani innych sekretów.

Po zakończeniu startu aplikacja jest dostępna pod adresem:

```text
http://localhost:4200
```

## Lokalne usługi i porty

Środowisko udostępnia także narzędzia pomocnicze:

| Usługa          | Adres                    |
| --------------- | ------------------------ |
| Spendist        | `http://localhost:4200`  |
| Supabase API    | `http://127.0.0.1:55321` |
| Baza PostgreSQL | `127.0.0.1:55322`        |
| Supabase Studio | `http://127.0.0.1:55323` |
| Mailpit         | `http://127.0.0.1:55324` |

Supabase Studio pozwala przeglądać lokalną bazę i ustawienia projektu. Mailpit przechwytuje wiadomości wysyłane podczas testowania lokalnego uwierzytelniania, więc testowe e-maile nie trafiają do prawdziwych skrzynek.

## Co znajduje się w obrazie aplikacji?

Docker buduje produkcyjną wersję Angulara i umieszcza gotowe pliki przeglądarkowe w niewielkim obrazie z Nginx. Kontener:

- serwuje publiczną stronę, blog i aplikację,

- obsługuje bezpośrednie wejścia na trasy Angulara,

- zwraca prawidłową stronę 404 dla nieistniejących adresów bloga,

- ustawia nagłówki bezpieczeństwa,

- nie buforuje konfiguracji środowiska ani plików sterujących aktualizacją aplikacji,

- zapisuje publiczną konfigurację Supabase podczas startu, a nie podczas budowania obrazu.

Ostatni punkt pozwala wykorzystać ten sam obraz w różnych środowiskach bez umieszczania danych konfiguracyjnych w jego warstwach.

## Logi i sprawdzanie stanu

Stan kontenerów aplikacji sprawdzisz poleceniem:

```bash
docker compose ps
```

Logi frontendu można obserwować na żywo:

```bash
docker compose logs -f web
```

Stan lokalnego Supabase pokazuje:

```bash
npm run supabase:status
```

Jeżeli aplikacja nie otwiera się od razu, zaczekaj na zakończenie produkcyjnego builda. Przy pierwszym uruchomieniu najwięcej czasu zwykle zajmuje pobranie obrazów oraz instalacja zależności w warstwie budującej.

## Zatrzymanie środowiska bez usuwania danych

Aby zatrzymać aplikację i lokalny Supabase, w drugim terminalu wykonaj:

```bash
npm run docker:down
```

Polecenie zatrzymuje usługi, ale zachowuje lokalne wolumeny bazy. Przy kolejnym uruchomieniu utworzone konto, ustawienia i transakcje nadal będą dostępne.

Usunięcie lub zresetowanie lokalnych danych jest osobną, świadomą operacją. Nie wykonuje jej ani `docker:up`, ani `docker:down`.

## Zmiana portu aplikacji

Domyślnie Spendist korzysta z portu `4200`. Jeżeli ten port jest zajęty, można wskazać inny:

```bash
SPENDIST_PORT=4300 npm run docker:up
```

Aplikacja będzie wtedy dostępna pod adresem `http://localhost:4300`. Porty lokalnego Supabase pozostają bez zmian, ponieważ są częścią izolowanej konfiguracji projektu.

## Jak zaktualizować lokalną instalację?

Po pobraniu nowszej wersji kodu zaktualizuj zależności i ponownie zbuduj obraz:

```bash
git pull
npm install
npm run docker:up
```

Skrypt ponownie sprawdzi lokalny backend i zastosuje brakujące migracje. Dane zapisane w lokalnych wolumenach pozostaną na miejscu.

## Gotowe obrazy w GitHub Container Registry

GitHub Actions sprawdza budowę obrazu przy pull requestach. Zmiany trafiające do gałęzi `develop`, `master` albo tagów wersji `v*` publikują warianty dla `linux/amd64` i `linux/arm64` w GitHub Container Registry:

```text
ghcr.io/spendist-app/spendist
```

Gałąź `master` otrzymuje tag `latest`, gałąź `develop` tag `develop`, a wydania oznaczone tagami Git otrzymują odpowiadające im wersje semantyczne.

Gotowy obraz nadal wymaga publicznego adresu Supabase i publishable key. Publishable key jest przeznaczony dla aplikacji przeglądarkowej i działa razem z regułami RLS. Nie należy zastępować go service-role key ani kluczem mającym uprawnienia administracyjne.

## Lokalnie nie znaczy produkcyjnie

Opisany zestaw służy do uruchamiania i testowania Spendist na własnym komputerze. Korzysta z izolowanych danych i lokalnych usług pocztowych.

Publiczne wdrożenie wymaga dodatkowych decyzji dotyczących domeny, HTTPS, kopii zapasowych, aktualizacji, sekretów Edge Functions i utrzymania Supabase. Samo wystawienie portu kontenera do internetu nie tworzy bezpiecznego środowiska produkcyjnego.

Lokalny Docker Compose daje natomiast powtarzalny punkt startowy: możesz sprawdzić kod, uruchomić aplikację, przetestować własne zmiany i zatrzymać całość bez dotykania produkcyjnych danych Spendist.
