const pl = {
  appUpdate: {
    title: 'Nowa wersja jest dostępna',
    description: 'Odśwież stronę, aby pobrać najnowszą wersję Spendist.',
    refresh: 'Odśwież teraz',
    dismiss: 'Zamknij powiadomienie o aktualizacji',
  },
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
      remove: 'Usuń',
      back: 'Wstecz',
      next: 'Dalej',
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
  oauthConsent: {
    badge: 'Dostęp zewnętrzny',
    title: 'Połącz aplikację ze Spendist',
    subtitle:
      'Sprawdź, co ten klient OAuth będzie mógł zrobić na Twoim koncie Spendist.',
    loading: 'Wczytywanie prośby o autoryzację',
    accessTitle: 'Żądany dostęp do Spendist',
    accessRead:
      'Odczyt portfeli, transakcji, kategorii, płatności cyklicznych, podsumowań i stanu Kieszonkowego.',
    accessWrite:
      'Tworzenie i aktualizacja obsługiwanych danych finansowych oraz oznaczanie powiadomień jako przeczytane.',
    accessDelete:
      'Przygotowanie usunięcia i wykonanie go dopiero po osobnym, krótkotrwałym potwierdzeniu.',
    scope: 'Zakres OAuth',
    warning:
      'Kontynuuj tylko wtedy, gdy ufasz tej aplikacji. Później możesz cofnąć jej zgodę OAuth.',
    deny: 'Odmów',
    approve: 'Zezwól na dostęp',
  },
  connectedApps: {
    back: 'Ustawienia',
    title: 'Połączone aplikacje',
    subtitle:
      'Sprawdź i odwołaj dostęp aplikacji korzystających ze Spendist przez OAuth.',
    loading: 'Wczytywanie połączonych aplikacji',
    empty: 'Żadna aplikacja zewnętrzna nie ma obecnie dostępu.',
    scopes: 'Zakresy',
    revoke: 'Cofnij dostęp',
    manage: 'Zarządzaj dostępem',
  },
  navbar: {
    settings: 'Ustawienia',
    signOut: 'Wyloguj się',
    dashboard: 'Pulpit',
    transactions: 'Transakcje',
    modules: 'Moduły',
    modulesRecurring: 'Płatności cykliczne',
    modulesPlaces: 'Miejsca',
    modulesAllowance: 'Kieszonkowe',
    modulesMortgages: 'Kredyty hipoteczne',
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
      badge: 'Finanse osobiste open source',
      title: 'Zobacz, gdzie naprawdę',
      titleHighlight: 'trafiają Twoje pieniądze',
      subtitle:
        'Śledź transakcje, wklejaj je zbiorczo, automatyzuj stałe koszty i analizuj przepływy między portfelami oraz walutami.',
      cta: 'Zacznij za darmo',
      login: 'Mam już konto',
      ctaSecondary: 'Zobacz jak to działa',
    },
    proof: {
      label: 'Najważniejsze cechy Spendist',
      openSource: 'Open source GPL-3.0',
      noAds: 'Bez reklam i sprzedaży danych',
      bilingual: 'Po polsku i angielsku',
    },
    preview: {
      ariaLabel: 'Podgląd pulpitu Spendist',
      month: 'Ten miesiąc',
      balanceLabel: 'Przepływ w miesiącu',
      income: 'Przychody',
      expenses: 'Wydatki',
      home: 'Dom',
      food: 'Jedzenie',
      transport: 'Transport',
    },
    features: {
      badge: 'Do codziennych finansów',
      title: 'Od jednego wydatku do pełnego obrazu',
      subtitle:
        'Spendist łączy szybkie wprowadzanie, dokładne filtrowanie, automatyzację i przenośne dane w jednym miejscu.',
      dashboard: {
        title: 'Przepływy jednym rzutem oka',
        description:
          'Porównuj przychody i wydatki, kategorie, płatności cykliczne, ostatnią aktywność oraz miejsca na jednym pulpicie.',
      },
      bulk: {
        title: 'Szybkie i zbiorcze dodawanie',
        description:
          'Dodaj jedną transakcję albo wklej wiele wierszy naraz. Kopiuj wartości i sprawdź poprawność przed zapisem.',
      },
      transactions: {
        title: 'Inteligentne transakcje',
        description:
          'Zapisuj wydatki i przychody w sekundy. Filtruj po kategorii, portfelu, dacie lub tagach — znajdź wszystko błyskawicznie.',
      },
      recurring: {
        title: 'Płatności cykliczne pod kontrolą',
        description:
          'Planuj stałe i zmienne kwoty, uzupełniaj historię, wstrzymuj harmonogramy i odbieraj powiadomienia.',
      },
      currency: {
        title: 'Portfele i prawdziwe kursy',
        description:
          'Korzystaj z wielu walut, przeliczeń zależnych od portfela oraz automatycznie synchronizowanej historii kursów NBP.',
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
        title: 'Dane, które możesz przenieść',
        description:
          'Importuj XLSX z Kontomierza lub CSV Spendist, sprawdzaj duplikaty przed zapisem i eksportuj dane kiedy chcesz.',
      },
      organize: {
        title: 'Kategorie, tagi i miejsca',
        description:
          'Buduj drzewa kategorii, dobieraj kolory i Heroicons, oznaczaj transakcje tagami i łącz wydatki z miejscami.',
        tagExample: '#wakacje',
        placeExample: 'Warszawa',
        recurringExample: 'Subskrypcje',
      },
    },
    latest: {
      badge: 'Ostatnio dodane',
      title: 'Spendist rozwija się wokół prawdziwych potrzeb',
      subtitle:
        'Ostatnie wersje przyspieszają wprowadzanie danych, ułatwiają ich odnajdywanie i automatyzują pracę bez utraty kontroli.',
      github: 'Śledź rozwój na GitHubie',
      bulk: {
        title: 'Wklejanie do formularza zbiorczego',
        description:
          'Zamieniaj dane ze schowka w sprawdzone wiersze transakcji.',
      },
      filters: {
        title: 'Dokładne filtry i sortowanie',
        description:
          'Filtruj po kategoriach, tagach, portfelach, datach, kwotach i źródle cyklicznym.',
      },
      automation: {
        title: 'Historia cykliczna i powiadomienia',
        description:
          'Uzupełniaj wcześniejsze harmonogramy i śledź utworzone lub oczekujące operacje.',
      },
      transfer: {
        title: 'Bezpieczniejszy transfer CSV',
        description:
          'Sprawdź duplikaty i nowe dane słownikowe, zanim cokolwiek zaimportujesz.',
      },
    },
    trust: {
      badge: 'Prywatność przez wyraźną granicę',
      title: 'Twoje finanse nie są profilem reklamowym',
      description:
        'Dane po zalogowaniu służą do działania i ochrony Spendist. Nie są sprzedawane ani wysyłane do analityki stron publicznych.',
      private: 'Polityki dostępu osobne dla każdego użytkownika',
      analytics: 'Brak Google Analytics po zalogowaniu',
      export: 'Eksport danych transakcji',
      source: 'Publicznie dostępny kod źródłowy',
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
          'Dane finansowe po zalogowaniu są odseparowane per użytkownik i wyłączone z analityki stron publicznych.',
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
      title: 'Spraw, by Twoje finanse były zrozumiałe',
      subtitle:
        'Zacznij od jednej transakcji i z czasem zbuduj czytelny, przenośny obraz swoich finansów.',
      button: 'Utwórz darmowe konto',
      github: 'Zobacz kod źródłowy',
    },
    relatedProject: {
      badge: 'Inny projekt open source',
      title: 'Poznaj Tickist',
      description:
        'Uporządkuj zadania, projekty, terminy i powtarzalne obowiązki w drugim otwartym narzędziu twórcy Spendist.',
      visit: 'Otwórz Tickist',
      github: 'Zobacz kod Tickist',
    },
    footer: {
      madeWith: 'Stworzone z',
      tagline: 'dla świadomych finansowo',
      github: 'Zobacz na GitHubie',
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
      confirmationTitle: 'Sprawdź pocztę',
      confirmationDescription: 'Wysłaliśmy link potwierdzający konto na adres:',
      confirmationSpamHint:
        'Otwórz link, aby aktywować konto. Jeśli wiadomości nie ma, sprawdź folder spam.',
      resendIdle: 'Wyślij wiadomość ponownie',
      resendBusy: 'Wysyłanie...',
      resendSuccess:
        'Jeśli konto nadal wymaga potwierdzenia, wysłaliśmy nową wiadomość.',
      resendError:
        'Nie udało się wysłać kolejnej wiadomości. Poczekaj chwilę i spróbuj ponownie.',
      backToLogin: 'Wróć do logowania',
      tosNotice:
        'Kontynuując, akceptujesz przyszły regulamin oraz politykę prywatności.',
    },
    confirm: {
      processingTitle: 'Potwierdzamy Twój adres e-mail',
      processingDescription: 'To potrwa tylko chwilę.',
      success:
        'Adres e-mail został potwierdzony. Jesteś zalogowany i możesz zacząć korzystać ze Spendist.',
      errorTitle: 'Nie można użyć tego linku potwierdzającego',
      errorDescription:
        'Link mógł wygasnąć lub został już użyty. Zarejestruj się ponownie, aby otrzymać nowy link, albo zaloguj się, jeśli konto jest już aktywne.',
      signupAgain: 'Zarejestruj się ponownie',
      backToLogin: 'Wróć do logowania',
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
      navigationLabel: 'Sekcje ustawień',
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
        details: {
          title: 'Dane profilu',
          fullNameLabel: 'Imię i nazwisko',
          fullNameError: 'Podaj od 2 do 120 znaków.',
        },
        autosave: {
          saving: 'Zapisywanie…',
          saved: 'Zapisano',
          retry: 'Spróbuj ponownie',
          errors: {
            generic:
              'Nie udało się zapisać zmian profilu. Poprzednia wartość została przywrócona.',
          },
        },
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
        accountDeletion: {
          title: 'Usuń konto',
          description:
            'Trwale usuń konto Spendist, dane finansowe, powiadomienia i avatar.',
          open: 'Usuń moje konto',
          warning:
            'Tej operacji nie można cofnąć. Najpierw wyeksportuj dane, które chcesz zachować.',
          passwordLabel: 'Obecne hasło',
          confirmationLabel: 'Wpisz DELETE, aby potwierdzić',
          acknowledgement:
            'Rozumiem, że moje konto i wszystkie jego dane zostaną trwale usunięte.',
          submitIdle: 'Trwale usuń konto',
          submitBusy: 'Usuwanie konta...',
          errors: {
            passwordRequired: 'Obecne hasło jest wymagane.',
            confirmation: 'Wpisz dokładnie DELETE.',
            acknowledgement: 'Potwierdź, że rozumiesz utratę danych.',
            invalidPassword: 'Obecne hasło jest nieprawidłowe.',
            unauthorized:
              'Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.',
            generic:
              'Nie udało się usunąć konta. Konto nadal jest aktywne; spróbuj ponownie.',
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
  blog: {
    common: {
      badge: 'Blog',
      backToSpendist: 'Wróć do Spendist',
    },
    index: {
      title: 'Pomysły na bardziej przejrzyste finanse',
      seoTitle:
        'Blog Spendist — finanse osobiste bez uzależnienia od platformy',
      description:
        'Praktyczne artykuły o finansach osobistych, świadomych wydatkach, własności danych i korzystaniu ze Spendist.',
      articles: 'Artykuły na blogu',
      emptyTitle: 'Pierwsze artykuły są w przygotowaniu',
      emptyDescription:
        'Polska edycja ma własny plan redakcyjny. Nowe artykuły pojawią się tutaj po publikacji z repozytorium Spendist.',
      emptyFilteredTitle: 'Brak artykułów z tym tagiem',
      emptyFilteredDescription:
        'Wyczyść filtr tagu, aby zobaczyć wszystkie opublikowane artykuły.',
    },
    category: {
      title: '{{category}}',
      seoTitle: '{{category}} — Blog Spendist',
      navigation: 'Kategorie bloga',
      all: 'Wszystkie artykuły',
    },
    tags: {
      label: 'Tagi artykułu',
      filteredBy: 'Filtrowanie po #{{tag}}',
      clear: 'Wyczyść filtr',
    },
    pagination: {
      label: 'Strony bloga',
      previous: 'Poprzednia',
      next: 'Następna',
      status: 'Strona {{page}} z {{pages}}',
    },
    article: {
      breadcrumbs: 'Okruszki nawigacyjne',
      readingTime: '{{minutes}} min czytania',
      updated: 'Aktualizacja',
      contents: 'W tym artykule',
      back: 'Wróć do bloga',
    },
    share: {
      label: 'Udostępnij artykuł',
      native: 'Udostępnij',
      copy: 'Kopiuj link',
      copied: 'Skopiowano',
    },
    notFound: {
      title: 'Ta strona bloga nie istnieje',
      seoTitle: 'Nie znaleziono strony bloga | Spendist',
      description:
        'Artykuł, kategoria lub strona mogły zostać przeniesione albo nie zostały opublikowane.',
      action: 'Przejdź do bloga',
    },
  },
  notifications: {
    open: 'Otwórz notyfikacje',
    title: 'Notyfikacje',
    loading: 'Ładowanie notyfikacji',
    unreadCount: 'Nieprzeczytane: {{count}}',
    actions: {
      readAll: 'Przeczytaj wszystko',
      read: 'Oznacz jako przeczytaną',
      accept: 'Akceptuj',
      decline: 'Odrzuć',
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
      allowance_invitation_received: {
        title: '{{inviterName}} zaprasza Cię do modułu Kieszonkowe',
      },
      allowance_invitation_accepted: {
        title:
          '{{recipientName}} zaakceptował(a) zaproszenie do modułu Kieszonkowe',
      },
      allowance_invitation_declined: {
        title: 'Zaproszenie do modułu Kieszonkowe zostało odrzucone',
      },
      allowance_received: {
        title:
          'Otrzymano kieszonkowe: {{description}} ({{amount}} {{currency}})',
      },
      allowance_transfer_failed: {
        title: 'Nie udało się zapisać kieszonkowego: {{error}}',
      },
    },
    errors: {
      generic: 'Coś poszło nie tak. Spróbuj ponownie.',
      load: 'Nie udało się załadować notyfikacji.',
      markAllRead: 'Nie udało się oznaczyć notyfikacji jako przeczytane.',
      markRead: 'Nie udało się oznaczyć notyfikacji jako przeczytaną.',
      allowanceResponse:
        'Nie udało się zaktualizować zaproszenia do modułu Kieszonkowe.',
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
      clearAllCategories: 'Wyczyść',
      selectedCategoryCount: 'Wybrano: {{ count }}',
      allCategories: 'Wszystkie kategorie',
      allTags: 'Wszystkie tagi',
      onlyCategoriesWithTransactions: 'Ukryj puste kategorie',
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
      showMore: 'Pokaż więcej filtrów',
      showLess: 'Ukryj dodatkowe filtry',
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
      recurringFallback: 'Płatność cykliczna',
      mortgage: 'Kredyt hipoteczny',
      allowance: {
        payer: 'Kieszonkowe · wysłane',
        recipient: 'Kieszonkowe · otrzymane',
      },
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
      addFromFile: 'Dodaj z pliku',
      addShortcutHint: 'Dodaj transakcję (Alt+N)',
      openMenu: 'Otwórz menu dodawania',
      openMenuShortcutHint: 'Dodaj transakcję lub hurtowo (Alt+N)',
      loadMore: 'Załaduj więcej',
    },
    toasts: {
      created: 'Transakcja została zapisana w bazie.',
      updated: 'Zmiany w transakcji zostały zapisane.',
      bulkCreated: 'Zapisano {{ count }} transakcji w bazie.',
      importCreated:
        'Zaimportowano {{ created }} transakcji; pominięto duplikaty: {{ duplicatesSkipped }}.',
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
        allowanceRecipient: 'Pokaż również u',
        tags: 'Tagi',
        place: 'Miejsce',
        quantity: 'Ilość',
      },
      batchSettings: {
        title: 'Ustawienia partii',
        hint: 'Portfel i typ dotyczą wszystkich transakcji w tym zapisie.',
        parseClipboardAsTable: 'Rozdzielaj wklejane dane na kolumny',
        parseClipboardAsTableHint:
          'Wyłącz, aby wkleić cały tekst do aktywnego pola, także gdy zawiera przecinki lub średniki.',
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
        tags: 'przypisz nieznane tagi do istniejących albo je usuń',
        exchangeRate: 'brak kursu dla daty i waluty',
        save: 'nie udało się przygotować transakcji',
      },
    },
    import: {
      badge: 'Import',
      title: 'Importuj transakcje',
      description:
        'Pliki i wklejone dane są przetwarzane lokalnie w przeglądarce i nie są wysyłane.',
      sourceLabel: 'Źródło importu',
      fileTab: 'Wgraj plik',
      pasteTab: 'Wklej CSV',
      fileHeading: 'Wybierz jeden plik',
      acceptedFiles:
        'Akceptujemy CSV Spendist oraz e-paragon Biedronki wyeksportowany jako JSON. Maksymalnie 500 transakcji.',
      dropzoneAction: 'Upuść plik tutaj lub wybierz plik',
      dropzoneHint: 'CSV lub JSON',
      pasteHeading: 'Wklej CSV Spendist',
      pasteDescription:
        'Po wklejeniu zawartość zostanie automatycznie rozpoznana i sprawdzona.',
      pasteLabel: 'Wklej zawartość CSV',
      ai: {
        action: 'Przygotuj prompt dla AI',
        badge: 'Pomoc AI',
        title: 'Utwórz CSV z pomocą AI',
        description:
          'Skopiuj przygotowaną instrukcję do wybranego czatu AI i dodaj dokument jednego zakupu.',
        privacyTitle: 'Przed skopiowaniem:',
        privacyDescription:
          'prompt zawiera nazwy Twoich kategorii, tagów oraz portfeli z walutami. Spendist niczego nie wysyła. Wklejając prompt i dokument do zewnętrznego AI, korzystasz z zasad prywatności tego dostawcy.',
        promptLabel: 'Prompt dla AI',
        copy: 'Kopiuj prompt',
        copied: 'Prompt został skopiowany.',
        copyFailed:
          'Nie udało się skopiować promptu. Zaznacz jego treść i skopiuj ją ręcznie.',
        missingWallets:
          'Dodaj co najmniej jeden portfel, aby przygotować prompt.',
        missingCategories:
          'Dodaj co najmniej jedną kategorię, aby przygotować prompt.',
        steps: {
          copy: 'Skopiuj prompt poniższym przyciskiem.',
          open: 'Otwórz wybrany czat AI, np. ChatGPT, Claude lub Grok.',
          attach:
            'Wklej prompt i dodaj zdjęcie paragonu lub faktury, zrzut zamówienia albo treść e-maila.',
          return:
            'Skopiuj otrzymaną zawartość CSV, wróć do importu w Spendist i wklej ją w polu tekstowym.',
        },
      },
      readingFile: 'Odczytujemy plik i rozpoznajemy format…',
      validating: 'Sprawdzamy CSV…',
      removeFile: 'Usuń plik',
      parsed: '{{ count }} transakcji gotowych do sprawdzenia',
      mappingTitle: 'Uzupełnij dane importu',
      selectWallet: 'Wybierz istniejący portfel',
      selectCategory: 'Wybierz kategorię',
      noPlace: 'Bez miejsca',
      walletNotMatched:
        'Nie znaleziono portfela „{{ name }}”. Wybierz istniejący portfel.',
      review: 'Sprawdź transakcje',
      reviewBadge: 'Weryfikacja importu',
      reviewTitle: 'Sprawdź importowane transakcje',
      sourceCategory: 'Nie dopasowano kategorii z CSV: {{ name }}',
      sourceTags:
        'Nieznane tagi z CSV: {{ names }}. Zastąp je istniejącymi tagami albo wyczyść pole.',
      formats: {
        csv: {
          title: 'CSV Spendist',
          description:
            'Ten sam format 17 kolumn, którego używa import i eksport w Ustawieniach.',
        },
        biedronka: {
          title: 'E-paragon Biedronki',
          description: 'Plik JSON wyeksportowany z aplikacji Biedronka.',
        },
      },
      detected: {
        spendist_csv: 'CSV Spendist',
        biedronka_e_receipt: 'E-paragon Biedronki',
        unknown: 'Nieznany format',
      },
      schema: {
        action: 'Schemat CSV',
        title: 'Schemat CSV Spendist',
        description: 'Użyj poniższych kolumn. Dodatkowe kolumny są ignorowane.',
        required: 'Wymagane:',
      },
      errors: {
        read: 'Nie udało się odczytać pliku.',
        invalid: 'Nie udało się przetworzyć pliku.',
        invalid_file:
          'Plik CSV jest nieprawidłowy. Sprawdź schemat i wartości.',
        invalid_receipt:
          'E-paragon Biedronki jest nieprawidłowy albo jego sumy się nie zgadzają.',
        unknown_format:
          'Ten plik nie jest obsługiwanym CSV Spendist ani e-paragonem Biedronki.',
        mixed_direction:
          'Wszystkie wiersze CSV muszą mieć ten sam typ transakcji.',
        mixed_wallet:
          'Wszystkie wiersze CSV muszą korzystać z tego samego portfela.',
        row_limit: 'Jeden import może zawierać maksymalnie 500 transakcji.',
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
      audit: {
        createdAt: 'Dodano',
        updatedAt: 'Ostatnia edycja',
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
        allowanceRecipient: 'Tylko na moim koncie',
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
        clearPlace: 'Wyczyść miejsce',
        updateExchangeRate: 'Aktualizuj kurs',
      },
      help: {
        amountExpression:
          'Możesz wpisać wyrażenie, np. „2.3 + 2,5 + 12,41”. Kropki, przecinki oraz podstawowe działania (+ − × ÷) są obsługiwane automatycznie.',
        quantity:
          'Użyj, gdy zapisujesz kilka identycznych pozycji za jednym razem.',
        advancedDisclaimer:
          'Każda transakcja trafia domyślnie do głównego portfela — zmień go tutaj, jeśli ma być zaksięgowana gdzie indziej.',
        allowanceRecipient:
          'Tworzy odpowiadający przychód na koncie wybranego odbiorcy.',
        allowanceEmpty:
          'Połącz odbiorcę w module Kieszonkowe, aby użyć tej opcji.',
      },
      emptyTags:
        'Zacznij pisać, aby dodać pierwszy tag lub wybierz z podpowiedzi.',
      recentTags: 'Ostatnio używane',
      emptyCategories: 'Brak pasujących kategorii.',
      emptyPlaces: 'Brak pasujących miejsc.',
    },
  },
  mortgages: {
    badge: 'Moduły',
    title: 'Kredyty hipoteczne',
    description:
      'Przygotuj zrozumiałą prognozę spłaty, sprawdź nadpłaty i wakacje kredytowe, a potem zsynchronizuj chronione planowane raty z portfelem.',
    months: 'miesięcy',
    projected: 'prognoza',
    chart: 'Pozostały kapitał kredytu w czasie',
    disclaimer:
      'To szacunek do planowania finansów, a nie harmonogram banku ani porada finansowa. Przyszłe raty zmienne korzystają z ostatniej dostępnej wartości WIBOR i pozostają planowane do potwierdzenia stawki.',
    steps: { 1: 'Kredyt', 2: 'Oprocentowanie', 3: 'Zdarzenia', 4: 'Symulacja' },
    list: {
      title: 'Twoje kredyty',
      empty: 'Nie utworzono jeszcze kredytu.',
      attached: 'W portfelu',
    },
    empty: {
      title: 'Utwórz lub wybierz kredyt',
      body: 'Prosty formularz prowadzi przez decyzje i kończy się symulacją spłaty.',
    },
    fields: {
      name: 'Nazwa kredytu',
      principal: 'Kwota kredytu',
      currency: 'Waluta',
      disbursedOn: 'Data uruchomienia',
      firstInstallmentOn: 'Data pierwszej raty',
      termMonths: 'Okres kredytowania w miesiącach',
      installmentType: 'Rodzaj rat',
      wallet: 'Portfel',
      category: 'Kategoria wydatku',
      upfrontCost: 'Początkowy koszt kredytu',
      margin: 'Marża banku (%)',
      wiborTenor: 'Stawka referencyjna',
      fixedRate: 'Stałe oprocentowanie (%)',
    },
    options: {
      equal: 'Raty stałe',
      decreasing: 'Raty malejące',
      fixed: 'Oprocentowanie stałe',
      variable: 'Oprocentowanie zmienne',
      shorten: 'Skróć okres',
      reduce: 'Zmniejsz ratę',
    },
    rateHelp:
      'Dodaj kolejne okresy obejmujące cały kredyt. Okres stały używa podanego oprocentowania nominalnego. Okres zmienny używa marży i wybranego WIBOR-u.',
    overpayments: { title: 'Nadpłaty' },
    holidays: {
      title: 'Wakacje kredytowe',
      help: 'Pełne wakacje nie naliczają raty kapitałowej ani odsetkowej i wydłużają harmonogram.',
    },
    summary: { total: 'Suma płatności', interest: 'Suma odsetek' },
    table: {
      date: 'Data',
      payment: 'Rata',
      principal: 'Kapitał',
      interest: 'Odsetki',
      remaining: 'Pozostało',
      rate: 'Oprocentowanie',
    },
    actions: {
      add: 'Utwórz kredyt',
      addPeriod: 'Dodaj okres oprocentowania',
      addOverpayment: 'Dodaj nadpłatę',
      addHoliday: 'Dodaj wakacje',
      simulate: 'Wygeneruj symulację rat',
      attachTransactions: 'Dodaj transakcje do portfela',
      updateTransactions: 'Przelicz transakcje w portfelu',
      detachTransactions: 'Usuń z transakcji',
      delete: 'Usuń kredyt',
      attachConfirm:
        'Dodać wszystkie wygenerowane wpisy do wybranego portfela?',
      updateConfirm:
        'Zastąpić wszystkie transakcje kredytu, także historyczne, tą symulacją?',
      detachConfirm:
        'Usunąć wszystkie powiązane transakcje bez usuwania kredytu?',
      deleteConfirm: 'Usunąć „{{ name }}” wraz z symulacją?',
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
    allowance: {
      badge: 'Kieszonkowe',
      title: 'Kieszonkowe zaplanowane razem',
      description:
        'Połącz konto z odbiorcą i zapisuj odpowiadające sobie koszty oraz przychody jednorazowo albo cyklicznie.',
      ledgerNotice:
        'Spendist zapisuje wyłącznie wpisy budżetowe. Nie przesyła pieniędzy ani nie inicjuje płatności bankowych.',
      invite: {
        title: 'Zaproś odbiorcę',
        help: 'Możesz połączyć wiele osób, wysyłając kolejne zaproszenia.',
        email: 'Adres e-mail',
        submit: 'Wyślij zaproszenie',
        pending: 'Zaproszenia',
      },
      invitePage: {
        title: 'Zaproszenie do modułu Kieszonkowe',
        accepted: 'Konta zostały połączone.',
        open: 'Otwórz Kieszonkowe',
        invalid:
          'Zaproszenie jest nieprawidłowe, wygasło albo dotyczy innego adresu e-mail.',
        signIn:
          'Zaloguj się lub utwórz konto przy użyciu zaproszonego adresu e-mail.',
      },
      connections: {
        title: 'Połączone osoby',
        empty: 'Nie masz jeszcze żadnych połączeń.',
        disconnect: 'Rozłącz',
        role: {
          payer: 'Wysyłasz kieszonkowe',
          recipient: 'Otrzymujesz kieszonkowe',
        },
      },
      schedule: {
        title: 'Zaplanuj kieszonkowe',
        help: 'Harmonogram pojawi się także w Płatnościach cyklicznych z labelką Kieszonkowe.',
        recipient: 'Odbiorca',
        chooseRecipient: 'Wybierz odbiorcę',
        name: 'Opis',
        category: 'Twoja kategoria kosztowa',
        wallet: 'Twój portfel',
        amountMode: 'Rodzaj kwoty',
        fixed: 'Stała kwota',
        variable: 'Zmienna kwota',
        amount: 'Kwota',
        frequency: 'Częstotliwość',
        daily: 'Codziennie',
        weekly: 'Co tydzień',
        monthly: 'Co miesiąc',
        weekday: 'Dzień tygodnia',
        monthday: 'Dzień miesiąca',
        time: 'Godzina',
        start: 'Data rozpoczęcia',
        end: 'Data zakończenia (opcjonalnie)',
        submit: 'Utwórz harmonogram kieszonkowego',
        listTitle: 'Harmonogramy kieszonkowego',
        empty: 'Brak harmonogramów kieszonkowego.',
        pause: 'Wstrzymaj',
        resume: 'Wznów',
        nextRun: 'Następny wpis: {{date}}',
        noUpcoming: 'Brak kolejnych wpisów.',
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
      status: {
        pending: 'Oczekuje',
        accepted: 'Zaakceptowane',
        declined: 'Odrzucone',
        revoked: 'Anulowane',
        expired: 'Wygasłe',
        disconnected: 'Rozłączone',
        paused: 'Wstrzymane',
      },
      errors: {
        load: 'Nie udało się załadować danych modułu Kieszonkowe.',
        mutation: 'Nie udało się wykonać operacji w module Kieszonkowe.',
      },
    },
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
