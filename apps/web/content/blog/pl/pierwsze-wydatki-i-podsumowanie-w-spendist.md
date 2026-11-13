---
title: 'Pierwsze wydatki i podsumowanie w Spendist: od konta do dashboardu w 15 minut'
slug: pierwsze-wydatki-i-podsumowanie-w-spendist
description: 'Krok po kroku: konto, pierwszy portfel, kilka wydatków z tego tygodnia i pierwsze podsumowanie na dashboardzie Spendist. Bez importu historii.'
publishedAt: 2026-11-13
category: budzet-domowy
tags:
  - spendist
  - budzet-domowy
  - kontrola-wydatkow
  - pierwsze-kroki
coverImageId: blog/pl/pierwsze-wydatki-i-podsumowanie-w-spendist/cover
coverImageAlt: 'Okładka Spendist „Pierwsze wydatki” z listą trzech przykładowych wydatków o łącznej wartości 45,00 zł'
draft: false
---

Nie musisz wpisywać całej historii, żeby zacząć prowadzić budżet. Ten poradnik pokazuje pierwsze kroki: jedno konto, jeden portfel, kilka wydatków i podsumowanie. Możesz zacząć od wymyślonych zakupów, żeby poznać aplikację bez wprowadzania własnych danych finansowych.

Spendist jest darmowy i open source. Nie łączy się z bankiem i niczego za ciebie nie płaci; wpisujesz wydatki samodzielnie albo importujesz obsługiwane pliki. Eksport do CSV jest dostępny od pierwszego dnia, więc dane zawsze możesz zabrać ze sobą.

Zrzuty ekranu pochodzą z konta demonstracyjnego z przykładowymi danymi. Widać na nich więcej wpisów, niż zobaczysz u siebie po pierwszym dniu.

## Krok 1: konto i potwierdzenie e-maila

Wejdź na [spendist.app](https://spendist.app/) i wybierz **Zarejestruj się**. Wypełnij pole **Imię i nazwisko**, podaj adres e-mail, hasło i jego potwierdzenie oraz wybierz **Walutę pierwszego portfela**. Hasło wymaga co najmniej ośmiu znaków, wielkiej i małej litery oraz cyfry.

Po wysłaniu formularza sprawdź skrzynkę, również folder spam, i kliknij link potwierdzający. Ekran oczekiwania pokazuje podany adres i pozwala ponownie wysłać wiadomość. Prawidłowy link potwierdza konto, loguje cię i otwiera Pulpit.

Rejestracja jest dla osób pełnoletnich: zaznaczasz potwierdzenie ukończenia 18 lat oraz akceptację regulaminu i polityki prywatności. Pod formularzem jest też pole **Potwierdź, że jesteś człowiekiem**; przycisk rejestracji odblokuje się po jego zaznaczeniu. Spendist nie pobiera zdjęcia profilowego z zewnętrznych serwisów.

![Ekran rejestracji Spendist](image:rejestracja 'Formularz rejestracji: imię i nazwisko, e-mail, hasło z potwierdzeniem i waluta pierwszego portfela')

## Krok 2: jeden portfel

Portfel to miejsce, z którego płacisz: konto osobiste, karta, gotówka. Na początek wystarczy jeden, w walucie, w której najczęściej płacisz. Portfel w innej walucie dodasz później, gdy będzie potrzebny; Spendist przelicza kwoty według zapisanych kursów.

Po pierwszym logowaniu aplikacja tworzy domyślny zestaw kategorii. Nie poprawiaj go teraz. Łatwiej zmienić kategorie po tygodniu, gdy zobaczysz, czego naprawdę używasz.

![Lista trzech portfeli w ustawieniach Spendist](image:portfel 'Ustawienia → Portfele. Konto osobiste w PLN jest portfelem domyślnym')

## Krok 3: wydatki z tego tygodnia

Otwórz **Transakcje**, kliknij przycisk **+** i wybierz **Dodaj transakcję**. Wpisz kwotę, ustaw datę i wybierz kategorię. Aplikacja podpowiada portfel domyślny. Jeśli chcesz wybrać inny, kliknij **Pokaż pola zaawansowane**. Opis, tagi i miejsce są opcjonalne. Zacznij od dzisiejszych zakupów i wczorajszych rachunków. Trzy do pięciu wpisów wystarczy, żeby dashboard pokazał coś sensownego.

Przycisk **Zapisz i dodaj kolejną** zostawia formularz gotowy na następny wpis. Jeśli masz kilka paragonów naraz, wybierz **Dodaj hurtowo** z menu pod przyciskiem **+**. Możesz tam wkleić wiersze z arkusza kalkulacyjnego; Spendist rozdzieli kolumny po tabulatorze, przecinku albo średniku.

Miejsce zakupu możesz utworzyć bezpośrednio z formularza transakcji, bez przechodzenia do ustawień.

![Formularz „Dodaj transakcję” z wydatkiem 24,00 zł w kategorii Żywność](image:formularz-wydatku 'Przykład wydatku: zakupy spożywcze za 24,00 zł w kategorii Żywność')

## Krok 4: pierwsze podsumowanie

Przejdź na **Pulpit**. Zobaczysz przychody, wydatki i saldo z ostatnich miesięcy, sumy według kategorii i tagów dla wybranego miesiąca oraz zestawienie miejsc. Sprawdź, czy wybrany miesiąc obejmuje daty dodanych wydatków. Przy kilku wpisach podsumowanie będzie niewielkie; z kolejnymi wydatkami zobaczysz więcej informacji.

Na stronie Transakcje możesz filtrować po kategorii, tagu, miejscu, kwocie i zakresie dat. Filtry zapisują się w adresie strony, więc widok możesz dodać do zakładek albo wysłać sobie na telefon.

![Struktura miesięczna na Pulpicie z sumami przychodów i wydatków według kategorii](image:dashboard 'Lipiec 2026 na koncie demo: podsumowanie portfela Konto osobiste oraz sumy według kategorii i tagów')

## Krok 5: sprawdź, gdzie jest eksport

Zanim wpiszesz więcej, odszukaj w **Ustawieniach** sekcję **Eksport/import Spendist** i przycisk **Eksportuj CSV**. Plik zawiera datę, opis, kierunek, kwotę, walutę, ścieżkę kategorii, portfel, tagi i miejsce. Ten sam format zaimportujesz z powrotem, także do nowego konta. Wiedza, że dane da się zabrać, ułatwia spokojne korzystanie z aplikacji.

## Co dalej

- Masz eksport z Kontomierza? W Ustawieniach zaimportujesz plik XLSX do wybranego portfela. To jednorazowa migracja, nie synchronizacja z bankiem.
- Robisz zakupy w Biedronce z e-paragonami? Na stronie Transakcje zaimportujesz plik JSON z e-paragonu.
- Płacisz co miesiąc za te same rzeczy? Przeczytaj o [płatnościach cyklicznych](/pl/blog/platnosci-cykliczne-w-domowym-budzecie).

Jeśli coś było niejasne albo nie zadziałało, [zgłoś to na GitHubie](https://github.com/spendist-app/spendist/issues). Opis problemu bez kwot i danych osobowych wystarczy.
