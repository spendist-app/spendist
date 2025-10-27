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
      customInfo: 'Ikona „{{icon}}” nie należy do zestawu Heroicons, ale pozostanie zapisana.',
    },
  },
  navbar: {
    settings: 'Ustawienia',
    signOut: 'Wyloguj się',
    dashboard: 'Pulpit',
    transactions: 'Transakcje',
    modules: 'Moduły',
    modulesRecurring: 'Płatności cykliczne',
    menuToggle: 'Otwórz menu nawigacji',
  },
  landing: {
    title: 'Witamy w Spendist',
    subtitle: 'Zaloguj się, aby śledzić wydatki, albo utwórz konto i zacznij od razu.',
    loginCta: 'Zaloguj się',
    signupCta: 'Zarejestruj się',
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
      submitIdle: 'Zaloguj się',
      submitBusy: 'Logowanie...',
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
      passwordHelper: 'Użyj co najmniej 8 znaków, w tym liter i cyfr.',
      passwordConfirmLabel: 'Potwierdź hasło',
      passwordConfirmError: 'Hasła muszą być takie same.',
      submitIdle: 'Zarejestruj się',
      submitBusy: 'Tworzenie konta...',
      tosNotice: 'Kontynuując, akceptujesz przyszły regulamin oraz politykę prywatności.',
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
        text:
          'Aktualizuj swoje dane, aby analizy, powiadomienia i waluty były zawsze na bieżąco.',
        note:
          'Zaawansowane ustawienia profilu (powiadomienia, integracje) pojawią się tutaj wkrótce.',
        name: 'Joanna Doe',
        currency: 'Waluta podstawowa',
        language: 'Język',
        timezone: 'Strefa czasowa',
        blurb:
          'Dane profilu zasilają budżety, raporty oraz przyszłą współpracę w zespole.',
      },
      categories: {
        label: 'Kategorie',
        description: 'Etykiety, grupy, automatyzacje',
        header: 'Kategorie i grupy',
        text:
          'Porządkuj etykiety wydatków i grupuj je w tematy. Wyszukuj i filtruj, aby szybko znaleźć to, czego potrzebujesz.',
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
          description: 'Nadaj nazwę, wybierz kolor i przypisz kategorię do istniejącej grupy.',
          nameLabel: 'Nazwa kategorii',
          namePlaceholder: 'np. Zakupy spożywcze',
          nameRequired: 'Nazwa jest wymagana.',
          groupLabel: 'Grupa kategorii',
          groupPlaceholder: 'Wybierz grupę',
          groupRequired: 'Wybierz grupę dla tej kategorii.',
          colorLabel: 'Kolor akcentu',
          colorPlaceholder: '#0EA5A5',
          iconLabel: 'Ikona Heroicon',
        },
        details: {
          selectedHeading: 'Wybrana kategoria',
          groupedUnder: 'Przypisana do grupy {{group}}',
          group: 'Grupa',
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
          description: 'Grupuj powiązane kategorie, aby zyskać lepszy wgląd i szybsze filtrowanie.',
          nameLabel: 'Nazwa grupy',
          namePlaceholder: 'np. Podstawowe',
          nameError: 'Nazwa nie może być pusta.',
          colorLabel: 'Kolor akcentu',
          pill: {
            description: 'Ta grupa pomaga porządkować powiązane kategorie i ułatwia przegląd budżetu.',
          },
          emptyCtaTitle: 'Potrzebujesz kolejnego motywu?',
          emptyCtaBody:
            'Utwórz grupę, aby pogrupować podobne kategorie. Możesz przenosić je w dowolnym momencie.',
        },
        modals: {
          confirmCategoryDelete: 'Usunąć tę kategorię? Tej operacji nie można cofnąć.',
          confirmGroupDelete: 'Usunąć tę grupę kategorii? Przenieś przypisane kategorie przed usunięciem.',
        },
      },
    },
  },
  notifications: {
    errors: {
      generic: 'Coś poszło nie tak. Spróbuj ponownie.',
    },
  },
  dashboard: {
    badge: 'Pulpit',
    title: 'Twoje centrum dowodzenia',
    description: 'Śledź bilanse, przepływy i nadchodzące aktywności. Widok rozbuduje się wraz ze Spendist.',
    placeholder: {
      title: 'Widżety pulpitu są w przygotowaniu',
      body: 'Wkrótce pojawią się tu wglądy, podsumowania i skróty dopasowane do Twoich nawyków.',
    },
  },
  transactions: {
    badge: 'Transakcje',
    filters: {
      categoriesTitle: 'Kategorie',
      clearCategories: 'Wyczyść',
      allCategories: 'Wszystkie kategorie',
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
      searchPlaceholder: 'Szukaj po opisie, kategorii lub walucie…',
      fromLabel: 'Data od',
      toLabel: 'Data do',
      monthLabel: 'Przejdź do miesiąca',
      monthPlaceholder: 'Wybierz miesiąc',
      yearLabel: 'Przejdź do roku',
      yearPlaceholder: 'Wybierz rok',
      summaryLabel: 'Podsumowanie',
      summaryText: 'Widocznych wyników: {{ total }}',
    },
    list: {
      errorTitle: 'Nie udało się załadować transakcji',
      retry: 'Spróbuj ponownie',
      emptyTitle: 'Brak transakcji w filtrach',
      emptyBody: 'Dostosuj filtry lub dodaj nową transakcję, aby zobaczyć listę.',
      noDescription: 'Transakcja bez opisu',
      automatic: 'Automatyczna',
      uncategorized: 'Brak kategorii',
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
        editIdle: 'Zaktualizuj transakcję',
        busy: 'Zapisywanie…',
      },
      submitErrorTitle: 'Nie udało się zapisać transakcji.',
      fields: {
        description: 'Opis',
        category: 'Kategoria',
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
        wallet: 'Wybierz portfel (opcjonalnie)',
        tagInput: 'Wpisz tag i naciśnij Enter…',
      },
      validation: {
        amount: 'Podaj kwotę większą od zera.',
      },
      actions: {
        clearTags: 'Wyczyść wybór',
        removeTag: 'Usuń {{ name }}',
        showAdvanced: 'Pokaż pola zaawansowane',
        hideAdvanced: 'Ukryj pola zaawansowane',
      },
      help: {
        quantity: 'Użyj, gdy zapisujesz kilka identycznych pozycji za jednym razem.',
        advancedDisclaimer: 'W razie potrzeby podaj kwotę w walucie domyślnej lub przypisz portfel.',
      },
      emptyTags: 'Zacznij pisać, aby dodać pierwszy tag lub wybierz z podpowiedzi.',
    },
  },
  modules: {
    recurringPayments: {
      badge: 'Moduły',
      title: 'Płatności cykliczne',
      description: 'Kontroluj automatyczne obciążenia. Monitoruj odnowienia i nadchodzące rachunki w jednym miejscu.',
      stats: {
        monthly: {
          label: 'Wydatki w tym miesiącu',
          caption: 'Suma wydatków z transakcji cyklicznych w bieżącym miesiącu.',
        },
        yearly: {
          label: 'Wydatki w tym roku',
          caption: 'Łączne wydatki z płatności cyklicznych od początku roku.',
        },
      },
      actions: {
        add: 'Dodaj płatność cykliczną',
      },
      form: {
        badge: 'Dodaj płatność',
        title: 'Zaplanuj płatność cykliczną',
        subtitle: 'Ustal częstotliwość, kategorię i tagi. Nowe wpisy dodamy automatycznie.',
        editTitle: 'Zaktualizuj płatność cykliczną',
        editSubtitle: 'Zmieniaj częstotliwość, kwotę lub tagi. Kolejne obciążenia dostosujemy do nowych danych.',
        fields: {
          name: {
            label: 'Nazwa',
            placeholder: 'Netflix, czynsz, siłownia…',
            error: 'Podaj nazwę (maks. 120 znaków).',
            duplicate: 'Masz już płatność cykliczną o tej nazwie.',
          },
          category: {
            label: 'Kategoria',
            placeholder: 'Wybierz kategorię',
            error: 'Wybierz kategorię dla tej płatności.',
          },
          amount: {
            label: 'Kwota',
            error: 'Wpisz kwotę większą od zera.',
          },
          currency: {
            label: 'Waluta',
            error: 'Użyj 3-literowego kodu waluty, np. PLN.',
          },
          direction: {
            label: 'Typ',
            options: {
              expense: 'Wydatek',
              income: 'Przychód',
            },
          },
          schedule: {
            label: 'Harmonogram (cron)',
            placeholder: '0 12 1 * *',
            error: 'Wpisz poprawne wyrażenie cron.',
            hint: 'Standardowy format cron: minuta godzina dzień-miesiąca miesiąc dzień-tygodnia.',
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
          error: 'Nie udało się zapisać płatności cyklicznej. Spróbuj ponownie za chwilę.',
          duplicateName: 'Płatność cykliczna o tej nazwie już istnieje. Zmień etykietę lub edytuj istniejący wpis.',
        },
      },
      list: {
        badge: 'Przegląd',
        title: 'Aktywne płatności cykliczne',
        subtitle: 'Terminy kolejnych obciążeń, przypisane kategorie i tagi.',
        empty: {
          title: 'Brak płatności cyklicznych',
          body: 'Dodaj pierwszą płatność, aby śledzić automatyczne obciążenia.',
        },
        fields: {
          schedule: 'Harmonogram',
          startDate: 'Początek',
          endDate: 'Koniec',
          noEndDate: 'Bez końca',
          exchangeRate: 'Kurs',
        },
        direction: {
          expense: 'Wydatek',
          income: 'Przychód',
        },
        actions: {
          edit: 'Edytuj',
          delete: 'Usuń',
        },
        confirmDelete: 'Usunąć „{{ name }}”? Kolejne uruchomienia zostaną zatrzymane.',
      },
    },
  },
};

export default pl;
