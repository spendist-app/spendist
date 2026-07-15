const pl = {
  common: {
    appName: 'Spendist',
    language: {
      label: 'Język',
      english: 'Angielski',
      polish: 'Polski',
    },
    theme: {
      light: 'Jasny',
      dark: 'Ciemny',
      useLight: 'Włącz jasny motyw',
      useDark: 'Włącz ciemny motyw',
    },
    status: {
      checkingSession: 'Sprawdzanie sesji',
    },
    actions: {
      login: 'Zaloguj się',
      signup: 'Zarejestruj się',
      cancel: 'Anuluj',
      saveChanges: 'Zapisz zmiany',
      createCategory: 'Utwórz kategorię',
      addCategory: 'Dodaj kategorię',
      addFirstCategory: 'Dodaj pierwszą kategorię',
      addGroup: 'Dodaj grupę kategorii',
      createGroup: 'Utwórz grupę',
      openProfileEditor: 'Edytuj profil',
      manageSecurity: 'Opcje zabezpieczeń',
      dismiss: 'Zamknij',
      close: 'Zamknij',
      delete: 'Usuń',
      viewCategories: 'Pokaż kategorie',
      deleteGroup: 'Usuń grupę',
    },
    iconPicker: {
      none: 'Brak wybranej ikony',
      clear: 'Wyczyść',
      searchPlaceholder: 'Szukaj ikon',
      noResults: 'Brak ikon pasujących do „{{query}}”.',
      customInfo:
        'Ikona „{{icon}}” nie należy do zestawu Heroicons, ale pozostanie zapisana.',
    },
  },
  navbar: {
    settings: 'Ustawienia',
    signOut: 'Wyloguj się',
    dashboard: 'Pulpit',
    transactions: 'Transakcje',
    modules: 'Moduły',
    modulesRecurring: 'Płatności cykliczne',
    modulesPlaces: 'Miejsca',
    menuToggle: 'Otwórz menu nawigacji',
    about: {
      menuItem: 'O aplikacji',
      title: 'O aplikacji',
      close: 'Zamknij okno informacji o aplikacji',
      buildCommit: 'Commit buildu',
      fullCommit: 'Pełny commit',
    },
  },
  landing: {
    title: 'Witamy w Spendist',
    subtitle:
      'Zaloguj się, aby śledzić wydatki, albo utwórz konto i zacznij od razu.',
    loginCta: 'Zaloguj się',
    signupCta: 'Zarejestruj się',
    hero: {
      badge: 'Inteligentne finanse osobiste',
      title: 'Przejmij kontrolę nad swoimi',
      titleHighlight: 'finansami',
      subtitle:
        'Śledź każdy wydatek, automatyzuj płatności cykliczne i zyskaj prawdziwy wgląd w swoje nawyki — wszystko w jednej, pięknej aplikacji.',
      cta: 'Zacznij za darmo',
      ctaSecondary: 'Zobacz jak to działa',
    },
    features: {
      badge: 'Funkcje',
      title: 'Wszystko czego potrzebujesz, by zarządzać pieniędzmi',
      subtitle:
        'Od codziennego śledzenia po automatyczne płatności — Spendist daje ci narzędzia, by trzymać finanse w ryzach.',
      dashboard: {
        title: 'Interaktywny pulpit',
        description:
          'Przychody vs. wydatki jednym rzutem oka, miesięczny przepływ gotówki i natychmiastowe wychwytywanie trendów.',
      },
      transactions: {
        title: 'Inteligentne transakcje',
        description:
          'Zapisuj wydatki i przychody w sekundy. Filtruj po kategorii, portfelu, dacie lub tagach — znajdź wszystko błyskawicznie.',
      },
      recurring: {
        title: 'Płatności cykliczne',
        description:
          'Automatyzuj subskrypcje, czynsz i rachunki. Ustaw harmonogram raz, a Spendist zajmie się resztą.',
      },
      categories: {
        title: 'Własne kategorie',
        description:
          'Organizuj wydatki po swojemu — zagnieżdżone kategorie, grupy, kolory i ikony.',
      },
      wallets: {
        title: 'Wiele portfeli',
        description:
          'Zarządzaj wieloma kontami i walutami obok siebie. Ustaw domyślny i śledź salda niezależnie.',
      },
      import: {
        title: 'Import i eksport',
        description:
          'Importuj dane z Kontomierza lub plików CSV. Eksportuj kiedy chcesz — Twoje dane zawsze należą do Ciebie.',
      },
    },
    stats: {
      transactions: 'Śledzonych transakcji',
      categories: 'Własnych kategorii',
      wallets: 'Obsługiwanych portfeli',
      uptime: 'SLA dostępności',
    },
    benefits: {
      badge: 'Dlaczego Spendist?',
      title: 'Stworzony dla ludzi, którym zależy na pieniądzach',
      subtitle:
        'Bez reklam, bez upsellingu, bez sprzedawania danych. Czyste, potężne narzędzie zaprojektowane wokół Twoich potrzeb.',
      privacy: {
        title: 'Prywatność przede wszystkim',
        description:
          'Twoje dane finansowe są Twoje. Szyfrowanie end-to-end, brak analityki firm trzecich.',
      },
      speed: {
        title: 'Błyskawiczna szybkość',
        description:
          'Zbudowany na nowoczesnych technologiach z SSR dla natychmiastowego ładowania.',
      },
      i18n: {
        title: 'Wielojęzyczność',
        description:
          'Pełne wsparcie dla angielskiego i polskiego, kolejne języki w drodze.',
      },
      themes: {
        title: 'Ciemny i jasny motyw',
        description:
          'Łagodny dla oczu, dniem i nocą. Przełączaj motyw natychmiast z dowolnej strony.',
      },
    },
    cta: {
      title: 'Gotowy, by przejąć kontrolę?',
      subtitle:
        'Dołącz do Spendist już dziś i zacznij budować jaśniejszy obraz swoich finansów.',
      button: 'Utwórz darmowe konto',
    },
    footer: {
      madeWith: 'Stworzone z',
      tagline: 'dla świadomych finansowo',
    },
  },
  home: {
    title: 'Twój pulpit wkrótce się tu pojawi.',
    subtitle: 'Pracujemy nad doświadczeniem — zostań z nami.',
  },
  auth: {
    login: {
      title: 'Witaj ponownie',
      subtitle: 'Nie masz konta?',
      signupLink: 'Zarejestruj się',
      emailLabel: 'Adres e-mail',
      emailError: 'Podaj poprawny adres e-mail.',
      passwordLabel: 'Hasło',
      passwordError: 'Hasło jest wymagane.',
      forgotPasswordLink: 'Nie pamiętasz hasła?',
      passwordResetSuccess:
        'Hasło zostało zmienione. Zaloguj się nowym hasłem.',
      submitIdle: 'Zaloguj się',
      submitBusy: 'Logowanie...',
    },
    forgotPassword: {
      title: 'Zresetuj hasło',
      subtitle:
        'Podaj adres e-mail, a wyślemy link do ustawienia nowego hasła.',
      emailLabel: 'Adres e-mail',
      emailError: 'Podaj poprawny adres e-mail.',
      success:
        'Jeśli konto z tym adresem istnieje, wysłaliśmy link do resetu hasła.',
      submitIdle: 'Wyślij link',
      submitBusy: 'Wysyłanie...',
      backToLogin: 'Wróć do logowania',
    },
    resetPassword: {
      title: 'Ustaw nowe hasło',
      subtitle: 'Wybierz nowe hasło do konta Spendist.',
      passwordLabel: 'Nowe hasło',
      passwordHelper:
        'Użyj co najmniej 8 znaków, w tym wielkiej litery, małej litery i cyfry.',
      passwordError:
        'Użyj co najmniej 8 znaków, w tym wielkiej litery, małej litery i cyfry.',
      confirmPasswordLabel: 'Potwierdź nowe hasło',
      passwordConfirmError: 'Hasła muszą być takie same.',
      requestNewLink: 'Poproś o nowy link resetujący',
      submitIdle: 'Zmień hasło',
      submitBusy: 'Zmienianie...',
    },
    signup: {
      title: 'Utwórz konto',
      subtitle: 'Masz już konto?',
      loginLink: 'Zaloguj się',
      nameLabel: 'Imię i nazwisko',
      nameError: 'Wpisz swoje imię (min. 2 znaki).',
      emailLabel: 'Adres e-mail',
      emailError: 'Podaj poprawny adres e-mail.',
      passwordLabel: 'Hasło',
      passwordHelper:
        'Użyj co najmniej 8 znaków, w tym wielkiej litery, małej litery i cyfry.',
      passwordConfirmLabel: 'Potwierdź hasło',
      passwordConfirmError: 'Hasła muszą być takie same.',
      currencyLabel: 'Waluta pierwszego portfela',
      currencyHelper:
        'Podpowiadamy ją na podstawie języka lub regionu przeglądarki, ale możesz ją zmienić.',
      submitIdle: 'Zarejestruj się',
      submitBusy: 'Tworzenie konta...',
      tosNotice:
        'Kontynuując, akceptujesz przyszły regulamin oraz politykę prywatności.',
    },
  },
  settings: {
    hero: {
      badge: 'Ustawienia',
      title: 'Dopasuj Spendist do swojego stylu',
      description:
        'Dostosuj dane osobowe, porządkuj kategorie wydatków i utrzymuj porządek w grupach. Wszystko rozwija się razem z Twoimi nawykami.',
    },
    workspace: {
      label: 'Obszar roboczy',
    },
    panels: {
      profile: {
        label: 'Profil',
        description: 'Tożsamość, preferencje, bezpieczeństwo',
        header: 'Przegląd profilu',
        text: 'Aktualizuj swoje dane, aby analizy, powiadomienia i preferencje były zawsze na bieżąco.',
        note: 'Zaawansowane ustawienia profilu (powiadomienia, integracje) pojawią się tutaj wkrótce.',
        fallbackName: 'Twój profil',
        notSet: 'Nie ustawiono',
        language: 'Język',
        timezone: 'Strefa czasowa',
        blurb:
          'Dane profilu zasilają budżety, raporty oraz przyszłą współpracę w zespole.',
        avatar: {
          alt: 'Avatar użytkownika',
          upload: 'Prześlij avatar',
          uploading: 'Przesyłanie...',
          help: 'Dodaj avatar profilu. Obsługujemy PNG, JPG, WebP i GIF do 2 MB.',
          errors: {
            tooLarge: 'Avatar może mieć maksymalnie 2 MB.',
            unsupportedType: 'Wybierz obraz PNG, JPG, WebP albo GIF.',
            generic: 'Nie udało się przesłać avatara. Spróbuj ponownie.',
          },
        },
        security: {
          title: 'Hasło',
          description:
            'Potwierdź obecne hasło i ustaw nowe hasło do kolejnych logowań.',
          currentPasswordLabel: 'Obecne hasło',
          newPasswordLabel: 'Nowe hasło',
          confirmPasswordLabel: 'Potwierdź nowe hasło',
          submitIdle: 'Zmień hasło',
          submitBusy: 'Zmienianie...',
          success: 'Hasło zostało zmienione.',
          errors: {
            currentRequired: 'Obecne hasło jest wymagane.',
            newPassword:
              'Użyj co najmniej 8 znaków, w tym wielkiej litery, małej litery i cyfry.',
            confirmPassword: 'Hasła muszą być takie same.',
            samePassword: 'Nowe hasło musi różnić się od obecnego.',
          },
        },
      },
      wallets: {
        label: 'Portfele',
        description: 'Konta, waluty, domyślne ustawienia',
        header: 'Portfele i rachunki',
        text: 'Twórz portfele dla swoich kont, przypisuj im waluty i zdecyduj, który ma być domyślny w Spendist.',
        addWallet: 'Dodaj portfel',
        status: {
          errorTitle: 'Nie udało się wykonać operacji na portfelu.',
        },
        list: {
          title: 'Lista portfeli',
          emptyTitle: 'Brak portfeli',
          emptyBody:
            'Dodaj portfel, aby śledzić środki i przypisać do niego walutę.',
          defaultBadge: 'Domyślny',
          makeDefault: 'Ustaw jako domyślny',
        },
        form: {
          createTitle: 'Dodaj portfel',
          editTitle: 'Edytuj portfel',
          description:
            'Nazwij portfel, wybierz walutę i zdecyduj, czy ma być domyślnym wyborem.',
          nameLabel: 'Nazwa portfela',
          namePlaceholder: 'np. Wydatki codzienne',
          currencyLabel: 'Waluta',
          defaultLabel: 'Ustaw jako portfel domyślny',
          defaultHelp:
            'Portfel domyślny jest podpowiadany podczas dodawania nowych transakcji.',
          submitCreate: 'Zapisz portfel',
          submitUpdate: 'Zapisz zmiany',
          cancelEdit: 'Anuluj edycję',
        },
        errors: {
          nameRequired: 'Podaj nazwę portfela.',
          onlyOneDefault:
            'Tylko jeden portfel może być ustawiony jako domyślny.',
          generic: 'Nie udało się zaktualizować portfela. Spróbuj ponownie.',
          notFound: 'Portfel, który próbujesz zaktualizować, nie istnieje.',
        },
      },
      categories: {
        label: 'Kategorie',
        description: 'Etykiety, grupy, automatyzacje',
        header: 'Kategorie i grupy',
        text: 'Porządkuj etykiety wydatków i grupuj je w tematy. Wyszukuj i filtruj, aby szybko znaleźć to, czego potrzebujesz.',
        addCategory: 'Dodaj kategorię',
        addGroup: 'Nowa grupa kategorii',
        tabs: {
          manage: 'Zarządzaj kategoriami',
          groups: 'Grupy kategorii',
        },
        searchLabel: 'Wyszukaj kategorie',
        searchPlaceholder: 'Zacznij pisać',
        filters: {
          all: 'Wszystkie grupy',
          count: '({{total}})',
        },
        emptyGroups:
          'Utwórz grupę kategorii, aby zacząć. Grupy pomagają utrzymać porządek w wydatkach.',
        noMatches:
          'Brak kategorii pasujących do filtrów. Spróbuj innej grupy albo wyczyść wyszukiwanie.',
        list: {
          notSet: 'Brak',
          groupLabel: '{{total}} kategorii',
          iconSrLabel: 'Ikona {{label}}',
        },
        editor: {
          createTitle: 'Utwórz kategorię',
          editTitle: 'Edytuj kategorię',
          description:
            'Nadaj nazwę, wybierz kolor i przypisz kategorię do istniejącej grupy.',
          nameLabel: 'Nazwa kategorii',
          namePlaceholder: 'np. Zakupy spożywcze',
          nameRequired: 'Nazwa jest wymagana.',
          groupLabel: 'Grupa kategorii',
          groupPlaceholder: 'Wybierz grupę',
          groupRequired: 'Wybierz grupę dla tej kategorii.',
          parentLabel: 'Kategoria nadrzędna',
          parentNone: 'Brak kategorii nadrzędnej',
          parentHelp:
            'Użyj maksymalnie trzech poziomów, np. Jedzenie / Spożywcze / Biedronka.',
          colorLabel: 'Kolor akcentu',
          colorPlaceholder: '#0EA5A5',
          iconLabel: 'Ikona Heroicon',
        },
        details: {
          selectedHeading: 'Wybrana kategoria',
          groupedUnder: 'Przypisana do grupy {{group}}',
          group: 'Grupa',
          parent: 'Nadrzędna',
          icon: 'Ikona',
          accent: 'Kolor akcentu',
          defaultColor: 'Domyślny',
          edit: 'Edytuj szczegóły',
          delete: 'Usuń',
          promptTitle: 'Wybierz kategorię',
          promptDescription:
            'Wybierz kategorię do edycji albo utwórz nową, aby rozwinąć katalog.',
        },
        status: {
          loading: 'Ładowanie kategorii',
          errorTitle: 'Nie udało się ukończyć tej operacji.',
        },
        groups: {
          formTitleCreate: 'Utwórz grupę kategorii',
          formTitleEdit: 'Edytuj grupę kategorii',
          description:
            'Grupuj powiązane kategorie, aby zyskać lepszy wgląd i szybsze filtrowanie.',
          nameLabel: 'Nazwa grupy',
          namePlaceholder: 'np. Podstawowe',
          nameError: 'Nazwa nie może być pusta.',
          colorLabel: 'Kolor akcentu',
          pill: {
            description:
              'Ta grupa pomaga porządkować powiązane kategorie i ułatwia przegląd budżetu.',
          },
          emptyCtaTitle: 'Potrzebujesz kolejnego motywu?',
          emptyCtaBody:
            'Utwórz grupę, aby pogrupować podobne kategorie. Możesz przenosić je w dowolnym momencie.',
        },
        modals: {
          confirmCategoryDelete:
            'Usunąć tę kategorię? Tej operacji nie można cofnąć.',
          confirmGroupDelete:
            'Usunąć tę grupę kategorii? Przenieś przypisane kategorie przed usunięciem.',
        },
      },
      spendistCsv: {
        label: 'Export/import Spendist',
        description: 'CSV, filtry, przenoszenie danych',
        header: 'Export/import from Spendist',
        text: 'Eksportuj transakcje do CSV albo zaimportuj plik wygenerowany przez Spendist. Ten import jest niezależny od Kontomierza.',
        export: {
          title: 'Eksport transakcji',
          description:
            'Pobierz wszystkie transakcje pasujące do filtrów. Kategorie nadrzędne obejmują także podkategorie.',
          monthRange: 'Konkretny miesiąc',
          allRange: 'Cały okres',
          monthLabel: 'Miesiąc eksportu',
          categoriesLabel: 'Kategorie',
          clearCategories: 'Wyczyść',
          noCategories: 'Brak kategorii do filtrowania.',
          categoryHelp:
            'Bez zaznaczenia kategorii eksport obejmie wszystkie transakcje.',
          action: 'Eksportuj CSV',
          exported: 'Wyeksportowano {{total}} transakcji.',
        },
        import: {
          title: 'Import transakcji',
          description:
            'Wybierz CSV wyeksportowany ze Spendist. Analiza pokaże duplikaty, nowe słowniki i problemy przed zapisem.',
          fileLabel: 'Plik CSV',
          fileEmpty: 'Nie wybrano pliku.',
          chooseFile: 'Wybierz plik',
          analyze: 'Sprawdź plik',
          import: 'Importuj transakcje',
        },
        schema: {
          title: 'Accepted CSV schema',
          description:
            'Eksportowany plik jest wzorcem importu. Kolumny wymagane są opisane poniżej.',
          columns: {
            id: 'Opcjonalne przy imporcie; tylko referencja do źródłowej transakcji.',
            occurred_at: 'Wymagane; data ISO, np. 2026-02-01T00:00:00.000Z.',
            description: 'Opcjonalny opis transakcji.',
            direction: 'Wymagane; expense albo income.',
            amount: 'Wymagane; kwota transakcji.',
            currency: 'Wymagane; kod waluty ISO, np. PLN.',
            amount_in_default:
              'Opcjonalne; kwota w walucie domyślnej, gdy puste użyjemy amount.',
            category_group: 'Wymagane; brakująca grupa zostanie utworzona.',
            category_path:
              'Wymagane; ścieżka z ukośnikami, maksymalnie 3 poziomy.',
            category:
              'Opcjonalne; nazwa końcowej kategorii, ignorowana gdy jest category_path.',
            wallet: 'Wymagane; brakujący portfel zostanie utworzony.',
            wallet_currency:
              'Wymagane, gdy portfel nie istnieje; kod waluty ISO.',
            tags: 'Opcjonalne; tagi rozdzielone średnikiem.',
            is_automatic: 'Opcjonalne; true/false, domyślnie false.',
            recurring_scheduled_for:
              'Opcjonalne; używane tylko przy is_automatic=true.',
            import_source: 'Opcjonalne; zachowane w metadanych importu.',
            imported_at:
              'Opcjonalne; tylko referencja do poprzedniego importu.',
          },
        },
        status: {
          errorTitle: 'Nie udało się obsłużyć pliku Spendist CSV.',
          progress: 'Postęp importu',
          imported:
            'Zaimportowano: {{imported}}. Pominięto duplikaty podczas importu: {{duplicates}}.',
        },
        summary: {
          label: 'Podsumowanie importu',
          totalRows: 'Wiersze danych',
          parsed: 'Poprawne transakcje',
          duplicates: 'Duplikaty',
          importable: 'Do importu',
          newGroups: 'Nowe grupy: {{total}}',
          newCategories: 'Nowe kategorie: {{total}}',
          newWallets: 'Nowe portfele: {{total}}',
          newTags: 'Nowe tagi: {{total}}',
          issues: 'Problemy w pliku: {{total}}',
          issueRow: 'Wiersz {{row}}: {{message}}',
        },
        empty: {
          title: 'Najpierw sprawdź plik',
          body: 'Po analizie zobaczysz liczbę poprawnych transakcji, duplikatów i brakujących słowników przed importem.',
        },
        errors: {
          authRequired:
            'Zaloguj się ponownie, aby eksportować lub importować dane.',
          unsupportedFile: 'Wybierz plik w formacie CSV.',
          invalidMonth: 'Wybierz poprawny miesiąc.',
          exportFailed: 'Eksport CSV nie powiódł się.',
          analyzeFailed: 'Nie udało się przeanalizować CSV.',
          importFailed: 'Import CSV nie powiódł się.',
        },
      },
      kontomierzImport: {
        label: 'Import z Kontomierza',
        description: 'Pliki XLSX, kategorie, tagi',
        header: 'Import danych z Kontomierza',
        text: 'Wczytaj eksport XLSX z Kontomierza. Plik jest parsowany w przeglądarce, a do bazy trafiają tylko transakcje, kategorie i tagi.',
        form: {
          walletLabel: 'Portfel docelowy',
          walletPlaceholder: 'Wybierz portfel',
          fileLabel: 'Plik XLSX',
          fileEmpty: 'Nie wybrano pliku.',
          chooseFile: 'Wybierz plik',
        },
        actions: {
          analyze: 'Sprawdź plik',
          import: 'Importuj transakcje',
        },
        status: {
          errorTitle: 'Nie udało się zaimportować danych.',
          progress: 'Postęp importu',
          imported:
            'Zaimportowano: {{imported}}. Pominięto duplikaty podczas importu: {{duplicates}}.',
        },
        summary: {
          label: 'Podsumowanie importu',
          totalRows: 'Wiersze danych',
          parsed: 'Transakcje rozpoznane',
          splitParents: 'Pominięte rekordy zbiorcze',
          duplicates: 'Duplikaty',
          importable: 'Do importu',
          newGroups: 'Nowe grupy: {{total}}',
          newCategories: 'Nowe kategorie: {{total}}',
          newTags: 'Nowe tagi: {{total}}',
          issues: 'Problemy w pliku: {{total}}',
          issueRow: 'Wiersz {{row}}: {{message}}',
        },
        empty: {
          title: 'Najpierw sprawdź plik',
          body: 'Po analizie zobaczysz liczbę transakcji, duplikatów, nowych kategorii i tagów przed właściwym importem.',
        },
        errors: {
          authRequired: 'Zaloguj się ponownie, aby importować dane.',
          walletRequired: 'Wybierz portfel docelowy.',
          unsupportedFile: 'Wybierz plik w formacie XLSX.',
          emptyWorkbook: 'Plik XLSX nie zawiera arkuszy.',
          generic: 'Import nie powiódł się. Spróbuj ponownie.',
        },
      },
    },
  },
  notifications: {
    open: 'Otwórz notyfikacje',
    title: 'Notyfikacje',
    loading: 'Ładowanie notyfikacji',
    unreadCount: 'Nieprzeczytane: {{count}}',
    actions: {
      readAll: 'Przeczytaj wszystko',
    },
    empty: {
      title: 'Brak notyfikacji',
      body: 'Nowe aktywności pojawią się tutaj.',
    },
    items: {
      recurring_transaction_created: {
        title:
          'Utworzono transakcję cykliczną: {{description}} ({{amount}} {{currency}})',
      },
      recurring_transaction_ended: {
        title:
          'Płatność cykliczna zakończona: {{description}} (koniec: {{endDate}})',
      },
      exchange_rates_sync_failed: {
        title: 'Synchronizacja kursów walut nie powiodła się: {{error}}',
      },
    },
    errors: {
      generic: 'Coś poszło nie tak. Spróbuj ponownie.',
      load: 'Nie udało się załadować notyfikacji.',
      markAllRead: 'Nie udało się oznaczyć notyfikacji jako przeczytane.',
    },
  },
  dashboard: {
    badge: 'Pulpit',
    title: 'Twoje centrum dowodzenia',
    description:
      'Śledź bilanse, przepływy i nadchodzące aktywności. Widok rozbuduje się wraz ze Spendist.',
    placeholder: {
      title: 'Widżety pulpitu są w przygotowaniu',
      body: 'Wkrótce pojawią się tu wglądy, podsumowania i skróty dopasowane do Twoich nawyków.',
    },
    structure: {
      badge: 'Struktura',
      title: 'Wydatki vs. przychody',
      subtitle:
        'Surowe sumy z maksymalnie ostatnich 12 miesięcy kalendarzowych.',
      empty:
        'Brak danych. Dodaj pierwszą transakcję, aby zobaczyć zestawienie.',
      noWallet: 'Wybierz portfel, aby zobaczyć dane.',
      errorTitle: 'Nie udało się załadować przepływów',
      retry: 'Spróbuj ponownie',
      monthLabel: 'Miesiąc',
      income: 'Przychody',
      expense: 'Wydatki',
      net: 'Bilans',
    },
    categoryWidget: {
      badge: 'Kategorie',
      title: 'Struktura miesięczna',
      subtitle:
        'Łączne kwoty dla wybranego miesiąca. Wkrótce dodamy wizualizacje.',
      selectLabel: 'Wybierz miesiąc',
      noMonths: 'Brak dostępnych miesięcy',
      errorTitle: 'Nie udało się załadować danych kategorii',
      retry: 'Spróbuj ponownie',
      empty: 'Brak transakcji w tym miesiącu.',
      totals: {
        title: 'Podsumowanie',
        income: 'Suma przychodów',
        expense: 'Suma wydatków',
        net: 'Wynik netto',
      },
      incomeList: 'Kategorie przychodów',
      expenseList: 'Kategorie wydatków',
      incomeTagList: 'Tagi przychodów',
      expenseTagList: 'Tagi wydatków',
      noIncome: 'Brak kategorii przychodowych.',
      noExpense: 'Brak kategorii wydatkowych.',
      noIncomeTags: 'Brak tagów przychodowych.',
      noExpenseTags: 'Brak tagów wydatkowych.',
      walletLabel: 'Portfel',
      walletLoading: 'Ładowanie portfeli…',
      noWallets: 'Brak dostępnych portfeli.',
      noWalletSelected: 'Wybierz portfel, aby załadować dane.',
    },
    recurringWidget: {
      badge: 'Cykliczne',
      title: 'Transakcje z płatności cyklicznych',
      subtitle:
        'Liczba i kwoty transakcji utworzonych przez płatności cykliczne w wybranym miesiącu.',
      selectLabel: 'Wybierz miesiąc',
      noMonths: 'Brak miesięcy z transakcjami cyklicznymi',
      noWalletSelected: 'Wybierz portfel, aby załadować dane.',
      errorTitle: 'Nie udało się załadować transakcji cyklicznych',
      retry: 'Spróbuj ponownie',
      empty: 'Brak transakcji utworzonych przez płatności cykliczne.',
      transactions: 'Liczba transakcji',
      income: 'Przychody',
      expense: 'Wydatki',
      net: 'Bilans',
    },
    placesWidget: {
      badge: 'Miejsca',
      title: 'Wydatki według miejsc',
      subtitle:
        'Suma wydatków dla miejsc w wybranym roku i aktualnym portfelu.',
      yearLabel: 'Rok',
      noWalletSelected: 'Wybierz portfel, aby załadować miejsca.',
      errorTitle: 'Nie udało się załadować miejsc',
      retry: 'Spróbuj ponownie',
      empty: 'Brak transakcji z miejscem w tym roku.',
      latest: 'Ostatnia transakcja',
      transactions: 'Transakcje',
      expense: 'Wydatki',
    },
  },
  transactions: {
    badge: 'Transakcje',
    title: 'Transakcje',
    filters: {
      title: 'Filtry transakcji',
      description:
        'Zawęź listę po opisie, kategorii, miejscu, kwocie lub okresie.',
      categoriesTab: 'Kategorie',
      tagsTab: 'Tagi',
      clearCategories: 'Wyczyść',
      clearTags: 'Wyczyść',
      categoryFilterMode: 'Filtruj po kategoriach',
      categoryFilterInactive: 'Włącz, aby wybrać grupy lub kategorie.',
      categoryFilterActive: 'Wybrano kategorii: {{ count }}',
      selectAllCategories: 'Zaznacz wszystkie',
      clearAllCategories: 'Odznacz wszystkie',
      allCategories: 'Wszystkie kategorie',
      allTags: 'Wszystkie tagi',
      onlyCategoriesWithTransactions: 'Tylko kategorie z transakcjami',
      categoryCount: '{{ total }} kategorii',
      noVisibleTags: 'Brak tagów z wydatkami w tym okresie.',
      ungroupedTitle: 'Bez grupy',
      presets: {
        currentMonth: 'Bieżący miesiąc',
        previousMonth: 'Poprzedni miesiąc',
        thisYear: 'Bieżący rok',
        lastYear: 'Poprzedni rok',
        allTime: 'Cały okres',
      },
      reset: 'Resetuj filtry',
      searchLabel: 'Wyszukiwanie',
      searchPlaceholder: 'Szukaj po opisie, kategorii, miejscu lub walucie…',
      categoryLabel: 'Kategoria lub grupa',
      categoryPlaceholder: 'Wszystkie kategorie',
      categoryMixed: 'Wybrano kilka kategorii',
      wholeGroup: 'Cała grupa: {{ name }}',
      placeLabel: 'Miejsce',
      placePlaceholder: 'Wszystkie miejsca',
      minimumAmountLabel: 'Kwota od ({{ currency }})',
      maximumAmountLabel: 'Kwota do ({{ currency }})',
      amountPlaceholder: 'Bez limitu',
      fromLabel: 'Data od',
      toLabel: 'Data do',
      periodTitle: 'Zakres dat',
      periodDescription:
        'Najpierw wybierz rok, a następnie opcjonalnie miesiąc lub ustaw własne daty.',
      monthLabel: 'Miesiąc',
      monthPlaceholder: 'Wybierz miesiąc',
      yearLabel: 'Rok',
      yearPlaceholder: 'Wybierz rok',
      sortLabel: 'Sortowanie',
      sort: {
        dateDesc: 'Najnowsze',
        dateAsc: 'Najstarsze',
        amountDesc: 'Najwyższa kwota',
        amountAsc: 'Najniższa kwota',
        descriptionAsc: 'Opis A–Z',
        descriptionDesc: 'Opis Z–A',
      },
      summaryLabel: 'Podsumowanie',
      summaryText: 'Widocznych wyników: {{ loaded }} z {{ total }}',
    },
    list: {
      errorTitle: 'Nie udało się załadować transakcji',
      retry: 'Spróbuj ponownie',
      emptyTitle: 'Brak transakcji w filtrach',
      emptyBody:
        'Dostosuj filtry lub dodaj nową transakcję, aby zobaczyć listę.',
      noDescription: 'Transakcja bez opisu',
      automatic: 'Automatyczna',
      recurringSource: 'Cykliczna',
      uncategorized: 'Brak kategorii',
      place: 'Miejsce',
      direction: {
        income: 'Przychód',
        expense: 'Wydatek',
      },
      categoryIconSr: 'Ikona kategorii: {{ label }}',
      actions: {
        edit: 'Edytuj',
        duplicate: 'Duplikuj',
        delete: 'Usuń',
        deleteConfirm: 'Usunąć tę transakcję? Tej operacji nie można cofnąć.',
      },
    },
    actions: {
      add: 'Dodaj transakcję',
      addBulk: 'Dodaj hurtowo',
      addShortcutHint: 'Dodaj transakcję (Alt+N)',
      openMenu: 'Otwórz menu dodawania',
      openMenuShortcutHint: 'Dodaj transakcję lub hurtowo (Alt+N)',
      loadMore: 'Załaduj więcej',
    },
    toasts: {
      created: 'Transakcja została zapisana w bazie.',
      updated: 'Zmiany w transakcji zostały zapisane.',
      bulkCreated: 'Zapisano {{ count }} transakcji w bazie.',
    },
    bulk: {
      badge: 'Import',
      title: 'Dodaj transakcje hurtowo',
      columns: {
        date: 'Data',
        description: 'Opis',
        amount: 'Kwota',
        currency: 'Waluta',
        direction: 'Typ',
        category: 'Kategoria',
        wallet: 'Portfel',
        tags: 'Tagi',
        place: 'Miejsce',
        quantity: 'Ilość',
      },
      batchSettings: {
        title: 'Ustawienia partii',
        hint: 'Portfel i typ dotyczą wszystkich transakcji w tym zapisie.',
      },
      summary: 'Transakcje do zapisu: {{ count }}',
      duplicates: 'Wykryto {{ count }} możliwych duplikatów.',
      actions: {
        addRows: 'Dodaj 10 wierszy',
        clearRow: 'Wyczyść wiersz',
        copyField: 'Kopiuj wartość',
        copyAbove: 'Wypełnij wiersze powyżej',
        copyBelow: 'Wypełnij wiersze poniżej',
        save: 'Zapisz {{ count }}',
      },
      validation: {
        title: 'Popraw oznaczone wiersze przed zapisem.',
        row: 'Wiersz {{ row }}',
        date: 'podaj poprawną datę',
        amount: 'podaj kwotę większą od zera',
        category: 'wybierz kategorię',
        wallet: 'wybierz portfel',
        currency: 'podaj poprawną walutę',
        quantity: 'ilość musi być liczbą całkowitą od 1 do 100',
        exchangeRate: 'brak kursu dla daty i waluty',
        save: 'nie udało się przygotować transakcji',
      },
    },
    form: {
      badge: {
        create: 'Nowa',
        edit: 'Edycja',
      },
      title: {
        create: 'Dodaj transakcję',
        edit: 'Edytuj transakcję',
      },
      subtitle: {
        create: 'Zapisz kluczowe informacje — resztę rozbudujesz później.',
        edit: 'Zaktualizuj dane poniżej, aby historia była dokładna.',
      },
      submit: {
        createIdle: 'Zapisz transakcję',
        createAndContinue: 'Zapisz i dodaj kolejną',
        editIdle: 'Zaktualizuj transakcję',
        busy: 'Zapisywanie…',
      },
      submitErrorTitle: 'Nie udało się zapisać transakcji.',
      fields: {
        description: 'Opis',
        category: 'Kategoria',
        place: 'Miejsce',
        date: 'Data',
        amount: 'Kwota',
        currency: 'Waluta',
        amountInDefault: 'Kwota w walucie domyślnej',
        direction: 'Typ',
        quantity: 'Ile pozycji?',
        tags: 'Tagi',
        wallet: 'Portfel',
      },
      directions: {
        income: 'Przychód',
        expense: 'Wydatek',
      },
      placeholders: {
        description: 'Opcjonalna notatka, np. Zakupy spożywcze',
        category: 'Wybierz kategorię',
        categorySearch: 'Szukaj kategorii...',
        place: 'Brak miejsca',
        placeSearch: 'Szukaj miejsca...',
        wallet: 'Wybierz portfel',
        tagInput: 'Wpisz tag i naciśnij Enter…',
      },
      validation: {
        amount: 'Podaj kwotę większą od zera.',
        exchangeRateUnavailable: 'Brak kursu dla tej daty i pary walut.',
      },
      actions: {
        clearTags: 'Wyczyść wybór',
        removeTag: 'Usuń {{ name }}',
        showAdvanced: 'Pokaż pola zaawansowane',
        hideAdvanced: 'Ukryj pola zaawansowane',
        setToday: 'Ustaw dzisiaj',
        updateExchangeRate: 'Aktualizuj kurs',
      },
      help: {
        amountExpression:
          'Możesz wpisać wyrażenie, np. „2.3 + 2,5 + 12,41”. Kropki, przecinki oraz podstawowe działania (+ − × ÷) są obsługiwane automatycznie.',
        quantity:
          'Użyj, gdy zapisujesz kilka identycznych pozycji za jednym razem.',
        advancedDisclaimer:
          'Każda transakcja trafia domyślnie do głównego portfela — zmień go tutaj, jeśli ma być zaksięgowana gdzie indziej.',
      },
      emptyTags:
        'Zacznij pisać, aby dodać pierwszy tag lub wybierz z podpowiedzi.',
      recentTags: 'Ostatnio używane',
      emptyCategories: 'Brak pasujących kategorii.',
      emptyPlaces: 'Brak pasujących miejsc.',
    },
  },
  places: {
    badge: 'Moduły',
    title: 'Miejsca',
    description:
      'Zapisuj miejsca, w których robisz wydatki, i przypisuj je do transakcji.',
    empty: 'Dodaj pierwsze miejsce, aby później przypisywać je do transakcji.',
    noAddress: 'Brak adresu',
    search: {
      label: 'Wyszukaj miejsce',
      placeholder: 'Nazwa, miasto, ulica…',
      count: '{{ count }} miejsc',
      empty: 'Brak miejsc pasujących do wyszukiwania.',
    },
    actions: {
      add: 'Dodaj miejsce',
      edit: 'Edytuj',
      retry: 'Spróbuj ponownie',
      deleteConfirm:
        'Usunąć miejsce „{{ name }}”? Transakcje zostaną zachowane, ale stracą przypisane miejsce.',
    },
    form: {
      badge: 'Miejsce',
      title: {
        create: 'Dodaj miejsce',
        edit: 'Edytuj miejsce',
      },
      closedTitle: 'Wybierz miejsce',
      closedBody: 'Wybierz miejsce z listy do edycji albo dodaj nowe miejsce.',
      fields: {
        name: 'Nazwa',
        street: 'Ulica i numer',
        postalCode: 'Kod pocztowy',
        city: 'Miasto',
        country: 'Kraj',
        note: 'Notatka',
      },
      validation: {
        name: 'Podaj nazwę miejsca.',
      },
      submit: {
        create: 'Zapisz miejsce',
        edit: 'Zapisz zmiany',
        busy: 'Zapisywanie…',
      },
    },
    errors: {
      title: 'Nie udało się wykonać operacji',
      auth: 'Musisz być zalogowany, aby zarządzać miejscami.',
      emptyResponse: 'Supabase zwrócił pustą odpowiedź.',
      generic: 'Nie udało się zapisać miejsca.',
      nameRequired: 'Podaj nazwę miejsca.',
    },
  },
  modules: {
    recurringPayments: {
      badge: 'Moduły',
      title: 'Płatności cykliczne',
      description:
        'Kontroluj automatyczne obciążenia. Monitoruj odnowienia i nadchodzące rachunki w jednym miejscu.',
      stats: {
        monthly: {
          label: 'Wygenerowane w tym miesiącu',
          caption:
            'Automatyczne transakcje wydatkowe utworzone z płatności cyklicznych w tym miesiącu.',
        },
        yearly: {
          label: 'Wygenerowane od początku roku',
          caption:
            'Automatyczne transakcje wydatkowe utworzone z płatności cyklicznych od stycznia.',
        },
        planned: {
          label: 'Łącznie w tym miesiącu',
          caption:
            'Wygenerowane: {{ generated }} {{ currency }}. Do wygenerowania: {{ scheduled }} {{ currency }} (liczba zaplanowanych: {{ count }}).',
        },
      },
      actions: {
        add: 'Dodaj płatność cykliczną',
      },
      form: {
        badge: 'Dodaj płatność',
        title: 'Zaplanuj płatność cykliczną',
        subtitle:
          'Ustal częstotliwość, kategorię i tagi. Nowe wpisy dodamy automatycznie.',
        editTitle: 'Zaktualizuj płatność cykliczną',
        editSubtitle:
          'Zmieniaj częstotliwość, kwotę lub tagi. Kolejne obciążenia dostosujemy do nowych danych.',
        fields: {
          name: {
            label: 'Nazwa',
            placeholder: 'Netflix, czynsz, siłownia…',
            error: 'Podaj nazwę (maks. 120 znaków).',
          },
          category: {
            label: 'Kategoria',
            placeholder: 'Wybierz kategorię',
            searchPlaceholder: 'Szukaj kategorii...',
            empty: 'Brak pasujących kategorii.',
            error: 'Wybierz kategorię dla tej płatności.',
          },
          wallet: {
            label: 'Portfel',
            placeholder: 'Wybierz portfel',
            error:
              'Wskaż portfel, z którego ma pochodzić ta płatność cykliczna.',
            currencyHint:
              'Transakcje będą księgowane w walucie {{ currency }} przypisanej do portfela.',
          },
          amount: {
            label: 'Kwota',
            error: 'Wpisz kwotę większą od zera.',
          },
          currency: {
            label: 'Waluta',
          },
          amountMode: {
            label: 'Tryb kwoty',
            fixedHint: 'Każda wygenerowana transakcja użyje tej kwoty.',
            variableHint:
              'Terminy trafią do oczekujących kwot, aż wpiszesz faktyczny rachunek.',
            options: {
              fixed: 'Stała kwota',
              variable: 'Zmienna kwota',
            },
          },
          direction: {
            label: 'Typ',
            options: {
              expense: 'Wydatek',
              income: 'Przychód',
            },
          },
          schedule: {
            label: 'Harmonogram',
            placeholder: '0 12 1 * *',
            error: 'Wybierz poprawny harmonogram.',
            hint: 'Zapisane jako cron: {{cron}}',
            time: 'Godzina uruchomienia',
            dayOfMonth: 'Dzień',
            dayOfWeek: 'Dzień tygodnia',
            frequency: {
              daily: 'Codziennie',
              weekly: 'Co tydzień',
              monthly: 'Co miesiąc',
            },
            weekdays: {
              monday: 'Poniedziałek',
              tuesday: 'Wtorek',
              wednesday: 'Środa',
              thursday: 'Czwartek',
              friday: 'Piątek',
              saturday: 'Sobota',
              sunday: 'Niedziela',
            },
          },
          startDate: {
            label: 'Start',
            error: 'Wybierz datę pierwszego uruchomienia.',
          },
          endDate: {
            label: 'Zakończenie',
            optional: '(opcjonalnie)',
          },
          exchangeRate: {
            label: 'Kurs walutowy',
            optional: '(opcjonalnie)',
          },
          tags: {
            label: 'Tagi',
            hint: 'Dołącz istniejące tagi – zostaną skopiowane do nowych transakcji.',
            empty: 'Dodaj tag w widoku transakcji, aby pojawił się tutaj.',
          },
        },
        actions: {
          submit: 'Zapisz płatność cykliczną',
          update: 'Zaktualizuj płatność cykliczną',
          cancelEdit: 'Anuluj edycję',
        },
        notifications: {
          error:
            'Nie udało się zapisać płatności cyklicznej. Spróbuj ponownie za chwilę.',
          invalid: 'Sprawdź oznaczone pola przed zapisaniem.',
          backfillError:
            'Płatność cykliczna została zapisana, ale nie udało się teraz wygenerować historii.',
        },
      },
      pending: {
        title: 'Oczekujące kwoty',
        subtitle:
          'Płatności cykliczne ze zmienną kwotą czekające na faktyczną wartość.',
        amount: 'Faktyczna kwota',
        complete: 'Zaksięguj',
      },
      list: {
        badge: 'Przegląd',
        title: 'Aktywne płatności cykliczne',
        subtitle: 'Terminy kolejnych obciążeń, przypisane kategorie i tagi.',
        empty: {
          title: 'Brak płatności cyklicznych',
          body: 'Dodaj pierwszą płatność, aby śledzić automatyczne obciążenia.',
          filteredTitle: 'Brak płatności w tym widoku',
          filteredBody:
            'Zmień filtr, aby zobaczyć aktywne, zastopowane albo wszystkie płatności cykliczne.',
        },
        filters: {
          active: 'Aktywne',
          stopped: 'Zastopowane',
          all: 'Wszystkie',
        },
        status: {
          stopped: 'Zastopowana',
        },
        fields: {
          schedule: 'Harmonogram',
          startDate: 'Początek',
          endDate: 'Koniec',
          pausedAt: 'Zastopowano',
          noEndDate: 'Bez końca',
          nextRun: 'Kolejny transfer',
          wallet: 'Portfel',
          exchangeRate: 'Kurs',
          variableAmount: 'Kwota uzupełniana per termin',
        },
        amountMode: {
          fixed: 'Stała',
          variable: 'Zmienna',
        },
        schedule: {
          daily: 'Codziennie o {{ time }}',
          weekly: 'Co {{ day }} o {{ time }}',
          monthly: 'Co miesiąc {{ day }}. dnia o {{ time }}',
        },
        weekdays: {
          monday: 'poniedziałek',
          tuesday: 'wtorek',
          wednesday: 'środę',
          thursday: 'czwartek',
          friday: 'piątek',
          saturday: 'sobotę',
          sunday: 'niedzielę',
        },
        nextRun: {
          dueNow: 'teraz',
          inDaysHours: 'za {{ days }}d {{ hours }}h',
          inHoursMinutes: 'za {{ hours }}h {{ minutes }}m',
          inMinutes: 'za {{ minutes }}m',
          none: 'Brak kolejnego transferu',
        },
        direction: {
          expense: 'Wydatek',
          income: 'Przychód',
        },
        actions: {
          edit: 'Edytuj',
          stop: 'Zastopuj',
          resume: 'Wznów',
          delete: 'Usuń',
        },
        confirmStop:
          'Zastopować „{{ name }}”? Kolejne uruchomienia zostaną wstrzymane.',
        confirmResume:
          'Wznowić „{{ name }}”? Kolejne uruchomienia wrócą do harmonogramu.',
        confirmDelete:
          'Usunąć „{{ name }}”? Kolejne uruchomienia zostaną zatrzymane.',
      },
    },
  },
};

export default pl;
