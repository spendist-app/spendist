---
title: Czym jest Spendist? Poznaj otwartą aplikację do zarządzania budżetem domowym
slug: czym-jest-spendist
description: Spendist to otwarta aplikacja do zarządzania budżetem domowym, wydatkami, przychodami i płatnościami cyklicznymi. Poznaj jej funkcje.
publishedAt: 2026-07-24
category: spendist
tags:
  - spendist
  - open-source
  - budzet-domowy
  - kontrola-wydatkow
coverImageId: blog/pl/czym-jest-spendist/cover
coverImageAlt: 'TODO: opisać ostateczną grafikę okładkową'
draft: true
---

Drobne zakupy, rachunki, kilka subskrypcji, płatność raz na rok i wynagrodzenie wpływające na inne konto. Każda z tych operacji może wydawać się prosta, ale razem tworzą obraz, nad którym łatwo stracić kontrolę.

[Spendist](https://spendist.app/) to aplikacja open source, której głównym celem jest pomoc w zarządzaniu domowym budżetem. Pozwala zapisywać przychody i wydatki, porządkować je za pomocą kategorii i tagów, kontrolować płatności cykliczne oraz przeglądać najważniejsze informacje o finansach w jednym miejscu.

Nie obiecuje, że automatycznie naprawi twój budżet. Daje natomiast narzędzia, dzięki którym łatwiej zobaczyć, gdzie trafiają pieniądze i które wydatki wymagają uwagi.

![Dashboard aplikacji Spendist do zarządzania budżetem domowym](image:dashboard 'Główny dashboard Spendist')

## Spendist jest projektem open source

Kod źródłowy Spendist jest publicznie dostępny w [repozytorium projektu na GitHubie](https://github.com/spendist-app/spendist) i udostępniany na licencji GNU GPLv3.

Oznacza to, że można sprawdzić, jak aplikacja działa, przejrzeć jej kod, zgłosić problem, zaproponować zmianę albo rozwijać własną wersję zgodnie z warunkami licencji.

Otwartość projektu ma też praktyczne znaczenie. Spendist nie jest zamkniętą usługą, od której użytkownik musi być zależny na zawsze. Osoba mająca odpowiednią wiedzę techniczną może pobrać kod i uruchomić aplikację na własnej infrastrukturze.

Samodzielna instalacja wymaga jednak skonfigurowania aplikacji, bazy danych, uwierzytelniania i zadań cyklicznych. Nie jest to obecnie instalator typu „jedno kliknięcie”, lecz możliwość przeznaczona przede wszystkim dla osób technicznych i zespołów, które chcą mieć pełną kontrolę nad środowiskiem.

## Co potrafi obecnie Spendist?

Aktualna [dokumentacja funkcji Spendist](https://github.com/spendist-app/spendist/tree/develop/doc/features) obejmuje cały proces: od zapisania pojedynczego wydatku po analizę przepływów pieniężnych i przenoszenie danych.

### 1. Zapisywanie przychodów i wydatków

Transakcje są podstawą aplikacji. Każda z nich może zawierać:

- datę,

- kwotę i walutę,

- opis,

- kierunek, czyli przychód albo wydatek,

- portfel,

- kategorię,

- tagi,

- miejsce zakupu lub płatności.

Transakcje można tworzyć, edytować, duplikować i usuwać. Dostępne jest również wprowadzanie wielu pozycji jednocześnie, w tym wklejanie danych tabelarycznych do formularza zbiorczego i sprawdzanie ich przed zapisaniem.

Lista transakcji obsługuje wyszukiwanie, sortowanie oraz filtry dotyczące między innymi dat, kwot, kategorii, tagów, portfeli i źródła cyklicznego. Można również szybko wybrać bieżący lub poprzedni miesiąc i rok.

![Zbiorcze dodawanie wydatków i przychodów w Spendist](image:bulk-transaction-entry 'Formularz zbiorczego dodawania transakcji')

### 2. Dashboard domowego budżetu

Dashboard zbiera najważniejsze dane w jednym widoku. Pokazuje:

- przychody, wydatki i przepływ netto z maksymalnie 12 ostatnich miesięcy,

- podsumowanie kategorii i tagów dla wybranego miesiąca,

- informacje o transakcjach utworzonych z płatności cyklicznych,

- zestawienia wydatków powiązanych z konkretnymi miejscami,

- ostatnią aktywność.

Widok można ograniczyć do wybranego portfela. Dashboard opiera się na zapisanych transakcjach — nie prognozuje inwestycji i nie udziela porad finansowych.

### 3. Płatności cykliczne

Subskrypcje, rachunki, ubezpieczenia i inne regularne koszty potrafią miesiącami pozostawać poza naszą uwagą. Pojedynczo bywają niewielkie, ale razem mogą tworzyć zauważalny wyciek w domowym budżecie.

Spendist pozwala rejestrować cykliczne przychody i wydatki. Dla takiej pozycji można określić między innymi:

- stałą albo zmienną kwotę,

- częstotliwość,

- walutę,

- portfel,

- kategorię i tagi,

- datę zakończenia.

Aplikacja pokazuje aktywne i zatrzymane płatności, statystyki, podsumowania kategorii i tagów, miesięczny plan oraz oczekujące wystąpienia. Zaplanowane zadania mogą automatycznie tworzyć zwykłe transakcje i wyświetlać związane z nimi powiadomienia.

Spendist pomaga monitorować płatności cykliczne, ale nie opłaca rachunków, nie anuluje subskrypcji i nie przesyła pieniędzy.

![Kontrola płatności cyklicznych i subskrypcji w Spendist](image:recurring-payments 'Widok płatności cyklicznych')

### 4. Portfele i obsługa wielu walut

W Spendist można prowadzić wiele portfeli, przypisać im waluty oraz wybrać portfel domyślny, aby szybciej dodawać kolejne transakcje.

Kwota pozostaje zapisana w walucie źródłowej. Gdy potrzebne jest przeliczenie, aplikacja korzysta z przechowywanych kursów wymiany, w tym historycznych kursów NBP. W przypadku braku kursu dla konkretnego dnia, na przykład w weekend, może zostać użyty ostatni wcześniejszy kurs.

### 5. Kategorie, grupy i tagi

Wydatki można porządkować za pomocą:

- grup kategorii,

- wielopoziomowych kategorii,

- własnych kolorów,

- ikon Heroicons,

- tagów używanych w wielu transakcjach.

Dzięki zagnieżdżonym kategoriom można zbudować prosty albo bardzo szczegółowy podział. Przykładowo kategoria „Dom” może zawierać osobne podkategorie dla energii, internetu, wyposażenia i napraw.

### 6. Miejsca i sprzedawcy

Spendist pozwala tworzyć listę miejsc i sprzedawców powiązanych z wydatkami. Miejsce może zawierać nazwę, ulicę, miasto, kod pocztowy, kraj i własną notatkę.

Miejsca można tworzyć, edytować, usuwać i wyszukiwać, a następnie przypisywać do transakcji. Dashboard pokazuje dla nich roczną sumę wydatków, liczbę transakcji i ostatnią zarejestrowaną operację.

### 7. Importowanie i eksportowanie danych

Spendist nie ma być pułapką, z której trudno odzyskać własne dane.

Aplikacja pozwala:

- importować eksport XLSX z Kontomierza,

- importować dane w formacie Spendist CSV,

- eksportować wszystkie albo wybrane transakcje do CSV,

- filtrować eksport na przykład według kategorii,

- sprawdzić dane i potencjalne duplikaty przed importem,

- utworzyć brakujące kategorie, grupy, portfele i tagi podczas importowania.

![Bezpieczny import i eksport danych finansowych w Spendist](image:csv-import-summary 'Podsumowanie importu CSV')

### 8. Konto i bezpieczeństwo

Spendist obsługuje rejestrację i logowanie za pomocą adresu e-mail i hasła, resetowanie zapomnianego hasła oraz jego zmianę po zalogowaniu.

W profilu można zapisać między innymi nazwę użytkownika, imię i nazwisko, strefę czasową, język, domyślną walutę i awatar. Dane finansowe oraz powiadomienia są oddzielone pomiędzy użytkownikami za pomocą reguł dostępu po stronie bazy danych.

### 9. Powiadomienia

Powiadomienia są przypisane do zalogowanego użytkownika i odświeżają się w czasie rzeczywistym. Informują obecnie między innymi o:

- utworzeniu automatycznej transakcji cyklicznej,

- zakończeniu płatności cyklicznej,

- problemie z synchronizacją kursów walut.

Menu pokazuje ostatnie wiadomości i liczbę nieprzeczytanych pozycji. Wyświetlone powiadomienia można zbiorczo oznaczyć jako przeczytane.

### 10. Polski i angielski interfejs oraz jasny i ciemny motyw

Aplikacja jest dostępna po polsku i angielsku. Zapamiętuje wybrany język, a przy pierwszym uruchomieniu może dopasować go do ustawień przeglądarki.

Spendist obsługuje również jasny i ciemny motyw oraz responsywny interfejs przygotowany do używania na komputerze i urządzeniach mobilnych.

### 11. Publiczny blog Spendist

Projekt obejmuje także publiczny blog w osobnych wersjach polskiej i angielskiej. Artykuły mogą być porządkowane według kategorii, udostępniane w mediach społecznościowych oraz śledzone przez osobne kanały RSS.

## Twoje dane pozostają pod twoją kontrolą

Własność i możliwość przenoszenia danych to jedno z podstawowych założeń Spendist.

Transakcje można w każdej chwili wyeksportować. Dzięki temu da się utworzyć własną kopię, przeanalizować dane w innym narzędziu albo przenieść je do kolejnego systemu.

Jak wyjaśnia [strona Spendist](https://spendist.app/), dane zalogowanych użytkowników służą do działania i zabezpieczania aplikacji. Nie są sprzedawane ani przekazywane do analityki publicznej strony, a w zalogowanej części aplikacji nie działa Google Analytics.

## Czego Spendist obecnie nie robi?

Dla jasności warto powiedzieć również o granicach aplikacji:

- nie pobiera automatycznie danych z konta bankowego,

- nie wykonuje przelewów i nie opłaca rachunków,

- nie anuluje subskrypcji,

- nie prognozuje wyników inwestycji,

- nie zastępuje profesjonalnej porady finansowej,

- nie ma jeszcze skanera OCR paragonów.

Spendist ma pomagać w rejestrowaniu, porządkowaniu i analizowaniu finansów. Kontrola nad decyzjami pozostaje po stronie użytkownika.

## Co dalej ze Spendist?

Projekt jest aktywnie rozwijany. W momencie publikacji tego tekstu skupiamy się przede wszystkim na stabilizacji kodu i dopracowywaniu istniejących funkcji.

Roadmapa będzie na bieżąco aktualizowana wraz z rozwojem projektu. Kolejne funkcje chcemy wybierać i projektować również na podstawie konsultacji ze społecznością oraz realnych sposobów korzystania z aplikacji.

Jeśli zauważysz błąd, opisz go w [GitHub Issues](https://github.com/spendist-app/spendist/issues). Najbardziej pomagają zgłoszenia zawierające:

- krótki opis problemu,

- kroki prowadzące do błędu,

- informację o oczekiwanym rezultacie,

- zrzut ekranu, jeśli pokazuje problem,

- nazwę przeglądarki i urządzenia.

## Dlaczego Spendist szuka sponsora?

Niektóre planowane funkcje wymagają znacznie większych zasobów niż przechowywanie zwykłych danych tekstowych.

Dobrym przykładem jest skaner OCR paragonów. Rozpoznawanie tekstu na zdjęciach wymaga mocy obliczeniowej, a same fotografie potrzebują bezpiecznego miejsca do przechowywania. Przy większej liczbie użytkowników oznacza to realne i rosnące koszty infrastruktury.

Dlatego Spendist szuka sponsora, który pomoże sfinansować rozwój bardziej wymagających funkcji oraz hosting związanych z nimi danych. Wsparcie nie ma zmienić otwartego charakteru projektu. Ma umożliwić rozwój funkcji, których nie da się odpowiedzialnie utrzymywać wyłącznie przy minimalnej infrastrukturze.

## Jeden wydatek to tylko liczba. Razem tworzą obraz

Celem Spendist nie jest ocenianie, na co wydajesz pieniądze. Chodzi o to, aby dać ci czytelny obraz domowego budżetu i narzędzia potrzebne do podejmowania własnych decyzji.

Możesz zacząć od kilku transakcji, uporządkować kategorie, dodać cykliczne rachunki i z czasem zbudować pełniejszy obraz swoich finansów.

[Otwórz Spendist](https://spendist.app/) albo [zobacz kod projektu na GitHubie](https://github.com/spendist-app/spendist).
