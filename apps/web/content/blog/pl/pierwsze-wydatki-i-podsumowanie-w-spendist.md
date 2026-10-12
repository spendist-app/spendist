---
title: 'Pierwsze wydatki i podsumowanie w Spendist: od konta do dashboardu w 15 minut'
slug: pierwsze-wydatki-i-podsumowanie-w-spendist
description: 'Krok po kroku: konto, pierwszy portfel, kilka wydatków z tego tygodnia i pierwsze podsumowanie na dashboardzie Spendist. Bez importu historii.'
publishedAt: 2026-10-08
category: budzet-domowy
tags:
  - spendist
  - budzet-domowy
  - kontrola-wydatkow
  - pierwsze-kroki
coverImageId: blog/pl/pierwsze-wydatki-i-podsumowanie-w-spendist/cover
coverImageAlt: 'DO UZUPEŁNIENIA: opis okładki po przygotowaniu grafiki'
draft: true
---

Najtrudniejszy moment w prowadzeniu budżetu to pierwszy tydzień. Większość osób rezygnuje nie dlatego, że aplikacja jest zła, tylko dlatego, że próbuje od razu wpisać całą historię. Ten poradnik pokazuje krótszą drogę: jedno konto, jeden portfel, wydatki z bieżącego tygodnia i pierwsze podsumowanie. Całość zajmuje około kwadransa.

Spendist jest darmowy i open source. Nie łączy się z bankiem i niczego za ciebie nie płaci; wpisujesz wydatki samodzielnie albo importujesz obsługiwane pliki. Eksport do CSV jest dostępny od pierwszego dnia, więc dane zawsze możesz zabrać ze sobą.

## Krok 1: konto i potwierdzenie e-maila

Wejdź na [spendist.app](https://spendist.app/) i wybierz rejestrację. Podaj adres e-mail, hasło, nazwę użytkownika oraz domyślną walutę. Po wysłaniu formularza sprawdź skrzynkę (również folder spam) i kliknij link potwierdzający. Link loguje cię od razu i otwiera dashboard.

Rejestracja jest dla osób pełnoletnich i wymaga akceptacji regulaminu oraz polityki prywatności. Spendist nie pobiera zdjęcia profilowego z zewnętrznych serwisów.

![Ekran rejestracji Spendist](image:rejestracja 'Formularz rejestracji: e-mail, hasło, nazwa użytkownika i waluta')

## Krok 2: jeden portfel

Portfel to miejsce, z którego płacisz: konto osobiste, karta, gotówka. Na początek wystarczy jeden, w walucie, w której najczęściej płacisz. Portfel w innej walucie dodasz później, gdy będzie potrzebny; Spendist przelicza kwoty według zapisanych kursów.

Po pierwszym logowaniu aplikacja tworzy domyślny zestaw kategorii. Nie poprawiaj go teraz. Łatwiej zmienić kategorie po tygodniu, gdy zobaczysz, czego naprawdę używasz.

![Lista portfeli w ustawieniach](image:portfel 'Jeden portfel w domyślnej walucie')

## Krok 3: wydatki z tego tygodnia

Otwórz **Transakcje** i dodaj pierwszy wydatek: kwota, data, portfel, kategoria. Opis, tagi i miejsce są opcjonalne. Zacznij od dzisiejszych zakupów i wczorajszych rachunków. Trzy do pięciu wpisów wystarczy, żeby dashboard pokazał coś sensownego.

Jeśli masz kilka paragonów naraz, użyj wpisu zbiorczego. Możesz wkleić wiersze z arkusza kalkulacyjnego; Spendist rozdzieli kolumny po tabulatorze, przecinku albo średniku. Przycisk „zapisz i dodaj kolejny” zostawia formularz gotowy na następny wpis.

Miejsce zakupu możesz utworzyć bezpośrednio z formularza transakcji, bez przechodzenia do ustawień.

![Formularz dodawania wydatku](image:formularz-wydatku 'Kwota, data, portfel i kategoria wystarczą do zapisania wydatku')

## Krok 4: pierwsze podsumowanie

Przejdź na **Dashboard**. Zobaczysz przychody, wydatki i saldo z ostatnich miesięcy, sumy według kategorii i tagów dla wybranego miesiąca oraz zestawienie miejsc. Przy kilku wpisach wykres będzie skromny. To normalne; sens pojawia się po dwóch, trzech tygodniach.

Na stronie Transakcje możesz filtrować po kategorii, tagu, miejscu, kwocie i zakresie dat. Filtry zapisują się w adresie strony, więc widok możesz dodać do zakładek albo wysłać sobie na telefon.

![Dashboard z pierwszymi wydatkami](image:dashboard 'Wydatki według kategorii po pierwszym tygodniu')

## Krok 5: sprawdź, gdzie jest eksport

Zanim wpiszesz więcej, odszukaj w **Ustawieniach** eksport do Spendist CSV. Plik zawiera datę, opis, kierunek, kwotę, walutę, ścieżkę kategorii, portfel, tagi i miejsce. Ten sam format zaimportujesz z powrotem, także do nowego konta. Wiedza, że dane da się zabrać, ułatwia spokojne korzystanie z aplikacji.

## Co dalej

- Masz eksport z Kontomierza? W Ustawieniach zaimportujesz plik XLSX do wybranego portfela. To jednorazowa migracja, nie synchronizacja z bankiem.
- Robisz zakupy w Biedronce z e-paragonami? Na stronie Transakcje zaimportujesz plik JSON z e-paragonu.
- Płacisz co miesiąc za te same rzeczy? Przeczytaj o [płatnościach cyklicznych](/pl/blog/platnosci-cykliczne-w-domowym-budzecie).

Jeśli coś było niejasne albo nie zadziałało, [zgłoś to na GitHubie](https://github.com/spendist-app/spendist/issues). Opis problemu bez kwot i danych osobowych wystarczy.
