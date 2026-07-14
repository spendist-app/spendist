const en = {
  common: {
    appName: 'Spendist',
    language: {
      label: 'Language',
      english: 'English',
      polish: 'Polski',
    },
    theme: {
      light: 'Light',
      dark: 'Dark',
      useLight: 'Use light theme',
      useDark: 'Use dark theme',
    },
    status: {
      checkingSession: 'Checking session',
    },
    actions: {
      login: 'Log in',
      signup: 'Sign up',
      cancel: 'Cancel',
      saveChanges: 'Save changes',
      createCategory: 'Create category',
      addCategory: 'Add category',
      addFirstCategory: 'Add your first category',
      addGroup: 'Add category group',
      createGroup: 'Create group',
      openProfileEditor: 'Edit profile',
      manageSecurity: 'Security options',
      dismiss: 'Dismiss',
      close: 'Close',
      delete: 'Delete',
      viewCategories: 'View categories',
      deleteGroup: 'Delete group',
    },
    iconPicker: {
      none: 'No icon selected',
      clear: 'Clear',
      searchPlaceholder: 'Search icons',
      noResults: 'No icons match “{{query}}”.',
      customInfo:
        'Icon “{{icon}}” isn’t part of the Heroicons set, but it will be kept as-is.',
    },
  },
  navbar: {
    settings: 'Settings',
    signOut: 'Sign out',
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    modules: 'Modules',
    modulesRecurring: 'Recurring payments',
    modulesPlaces: 'Places',
    menuToggle: 'Open navigation menu',
    about: {
      menuItem: 'About',
      title: 'About',
      close: 'Close about dialog',
      buildCommit: 'Build commit',
      fullCommit: 'Full commit',
    },
  },
  landing: {
    title: 'Welcome to Spendist',
    subtitle:
      'Sign in to start tracking your spending, or create an account to get started.',
    loginCta: 'Log in',
    signupCta: 'Sign up',
    hero: {
      badge: 'Smart personal finance',
      title: 'Take control of your',
      titleHighlight: 'finances',
      subtitle:
        'Track every expense, automate recurring payments, and gain real insights into your spending habits — all in one beautiful app.',
      cta: "Get started — it's free",
      ctaSecondary: 'See how it works',
    },
    features: {
      badge: 'Features',
      title: 'Everything you need to manage your money',
      subtitle:
        'From daily tracking to automated payments, Spendist gives you the tools to stay on top of your finances.',
      dashboard: {
        title: 'Interactive dashboard',
        description:
          'See your income vs. expenses at a glance, track cash flow month by month, and spot trends instantly.',
      },
      transactions: {
        title: 'Smart transactions',
        description:
          'Log expenses and income in seconds. Filter by category, wallet, date range, or tags — find anything fast.',
      },
      recurring: {
        title: 'Recurring payments',
        description:
          'Automate subscriptions, rent, and bills. Set the schedule once and let Spendist handle the rest.',
      },
      categories: {
        title: 'Custom categories',
        description:
          'Organize spending your way with nested categories, groups, custom colors, and icons.',
      },
      wallets: {
        title: 'Multi-wallet support',
        description:
          'Manage multiple accounts and currencies side by side. Set defaults and track balances independently.',
      },
      import: {
        title: 'Import & export',
        description:
          'Bring data from Kontomierz or CSV files. Export any time — your data is always yours.',
      },
    },
    stats: {
      transactions: 'Transactions tracked',
      categories: 'Custom categories',
      wallets: 'Wallets supported',
      uptime: 'Uptime SLA',
    },
    benefits: {
      badge: 'Why Spendist?',
      title: 'Built for people who care about their money',
      subtitle:
        'No ads, no upsells, no data selling. Just a clean, powerful tool designed around your needs.',
      privacy: {
        title: 'Privacy first',
        description:
          'Your financial data stays yours. End-to-end encryption, no third-party analytics.',
      },
      speed: {
        title: 'Lightning fast',
        description:
          'Built on modern web technologies with server-side rendering for instant page loads.',
      },
      i18n: {
        title: 'Multilingual',
        description:
          'Full support for English and Polish, with more languages on the way.',
      },
      themes: {
        title: 'Dark & light themes',
        description:
          'Easy on the eyes, day or night. Switch themes instantly from any page.',
      },
    },
    cta: {
      title: 'Ready to take control?',
      subtitle:
        'Join Spendist today and start building a clearer picture of your financial life.',
      button: 'Create free account',
    },
    footer: {
      madeWith: 'Made with',
      tagline: 'for mindful spenders',
    },
  },
  home: {
    title: 'Your dashboard will live here soon.',
    subtitle: 'Stay tuned while we build out the experience.',
  },
  auth: {
    login: {
      title: 'Welcome back',
      subtitle: 'Need an account?',
      signupLink: 'Sign up',
      emailLabel: 'Email',
      emailError: 'Enter a valid email address.',
      passwordLabel: 'Password',
      passwordError: 'Password is required.',
      forgotPasswordLink: 'Forgot password?',
      passwordResetSuccess:
        'Your password was changed. Log in with the new password.',
      submitIdle: 'Log in',
      submitBusy: 'Signing in...',
    },
    forgotPassword: {
      title: 'Reset your password',
      subtitle:
        'Enter your email address and we will send you a password reset link.',
      emailLabel: 'Email',
      emailError: 'Enter a valid email address.',
      success:
        'If an account exists for this email, a reset link has been sent.',
      submitIdle: 'Send reset link',
      submitBusy: 'Sending...',
      backToLogin: 'Back to login',
    },
    resetPassword: {
      title: 'Set a new password',
      subtitle: 'Choose a new password for your Spendist account.',
      passwordLabel: 'New password',
      passwordHelper:
        'Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.',
      passwordError:
        'Use at least 8 characters, including uppercase, lowercase, and a number.',
      confirmPasswordLabel: 'Confirm new password',
      passwordConfirmError: 'Passwords must match.',
      requestNewLink: 'Request a new reset link',
      submitIdle: 'Change password',
      submitBusy: 'Changing...',
    },
    signup: {
      title: 'Create your account',
      subtitle: 'Already have an account?',
      loginLink: 'Log in',
      nameLabel: 'Name',
      nameError: 'Please enter your name (min. 2 characters).',
      emailLabel: 'Email',
      emailError: 'Enter a valid email address.',
      passwordLabel: 'Password',
      passwordHelper:
        'Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.',
      passwordConfirmLabel: 'Confirm password',
      passwordConfirmError: 'Passwords must match.',
      currencyLabel: 'First wallet currency',
      currencyHelper:
        'We preselect this from your browser language or region, but you can change it.',
      submitIdle: 'Sign up',
      submitBusy: 'Creating account...',
      tosNotice:
        'By continuing you agree to our future Terms of Service and Privacy Policy.',
    },
  },
  settings: {
    hero: {
      badge: 'Settings',
      title: 'Tailor Spendist to your flow',
      description:
        'Adjust personal details, curate your spending categories, and keep groups tidy. Everything adapts as your habits evolve.',
    },
    workspace: {
      label: 'Workspace',
    },
    panels: {
      profile: {
        label: 'Profile',
        description: 'Identity, preferences, security',
        header: 'Profile overview',
        text: 'Keep your personal details current so insights, notifications, and preferences stay in sync.',
        note: 'Advanced profile preferences (notifications, integrations) will live here soon.',
        fallbackName: 'Your profile',
        notSet: 'Not set',
        language: 'Language',
        timezone: 'Timezone',
        blurb:
          'Your profile details power budgets, reporting, and workspace collaboration (coming soon).',
        avatar: {
          alt: 'User avatar',
          upload: 'Upload avatar',
          uploading: 'Uploading...',
          help: 'Add a profile avatar. PNG, JPG, WebP, and GIF images up to 2 MB are supported.',
          errors: {
            tooLarge: 'Avatar image must be 2 MB or smaller.',
            unsupportedType: 'Choose a PNG, JPG, WebP, or GIF image.',
            generic: 'Unable to upload the avatar. Please try again.',
          },
        },
        security: {
          title: 'Password',
          description:
            'Confirm your current password and choose a new one for future logins.',
          currentPasswordLabel: 'Current password',
          newPasswordLabel: 'New password',
          confirmPasswordLabel: 'Confirm new password',
          submitIdle: 'Change password',
          submitBusy: 'Changing...',
          success: 'Password changed successfully.',
          errors: {
            currentRequired: 'Current password is required.',
            newPassword:
              'Use at least 8 characters, including uppercase, lowercase, and a number.',
            confirmPassword: 'Passwords must match.',
            samePassword:
              'New password must be different from the current one.',
          },
        },
      },
      wallets: {
        label: 'Wallets',
        description: 'Accounts, currencies, defaults',
        header: 'Wallets & balances',
        text: 'Create separate wallets for your accounts, assign currencies, and decide which one should be the default choice in Spendist.',
        addWallet: 'Add wallet',
        status: {
          errorTitle: 'We couldn’t finish that wallet action.',
        },
        list: {
          title: 'Wallets',
          emptyTitle: 'No wallets yet',
          emptyBody:
            'Create a wallet to start tracking balances and assign it a currency.',
          defaultBadge: 'Default',
          makeDefault: 'Make default',
        },
        form: {
          createTitle: 'Create wallet',
          editTitle: 'Edit wallet',
          description:
            'Name the wallet, select a currency, and decide whether it should be the default option.',
          nameLabel: 'Wallet name',
          namePlaceholder: 'e.g. Daily expenses',
          currencyLabel: 'Currency',
          defaultLabel: 'Set as default wallet',
          defaultHelp:
            'The default wallet is preselected whenever you create a new transaction.',
          submitCreate: 'Save wallet',
          submitUpdate: 'Update wallet',
          cancelEdit: 'Cancel edit',
        },
        errors: {
          nameRequired: 'Provide a wallet name.',
          onlyOneDefault: 'Only one wallet can be marked as default.',
          generic: 'Unable to update the wallet. Please try again.',
          notFound: 'The wallet you tried to update could not be found.',
        },
      },
      categories: {
        label: 'Categories',
        description: 'Labels, groups, automation',
        header: 'Categories & groups',
        text: 'Organize spending labels and cluster them into grouped themes. Use search or filters to jump to what matters.',
        addCategory: 'Add category',
        addGroup: 'New category group',
        tabs: {
          manage: 'Manage categories',
          groups: 'Category groups',
        },
        searchLabel: 'Search categories',
        searchPlaceholder: 'Start typing',
        filters: {
          all: 'All groups',
          count: '({{total}} categories)',
        },
        emptyGroups:
          'Create a category group before adding categories. Groups keep your spending organized.',
        noMatches:
          'No categories match your filters. Try a different group or clear the search.',
        list: {
          ariaSelect: 'Select category',
          notSet: 'Not set',
          groupLabel: '{{total}} categories',
          iconSrLabel: '{{label}} icon',
        },
        editor: {
          createTitle: 'Create category',
          editTitle: 'Edit category',
          description:
            'Define the label, choose a color, and assign it to a group you already use.',
          nameLabel: 'Category name',
          namePlaceholder: 'e.g. Groceries',
          nameRequired: 'Name is required.',
          groupLabel: 'Category group',
          groupPlaceholder: 'Select a group',
          groupRequired: 'Choose where this category belongs.',
          parentLabel: 'Parent category',
          parentNone: 'No parent category',
          parentHelp:
            'Use up to three levels, for example Food / Groceries / Biedronka.',
          colorLabel: 'Accent color',
          colorPlaceholder: '#0EA5A5',
          iconLabel: 'Heroicon',
        },
        details: {
          selectedHeading: 'Selected category',
          groupedUnder: 'Grouped under {{group}}',
          group: 'Group',
          parent: 'Parent',
          icon: 'Icon',
          accent: 'Accent color',
          defaultColor: 'Default',
          edit: 'Edit details',
          delete: 'Delete',
          promptTitle: 'Select a category',
          promptDescription:
            'Choose a category to edit details or create a new one to expand your taxonomy.',
        },
        status: {
          loading: 'Loading categories',
          errorTitle: 'We couldn’t finish that action.',
        },
        groups: {
          formTitleCreate: 'Create category group',
          formTitleEdit: 'Edit category group',
          description:
            'Group related categories to unlock richer insights and quicker filtering.',
          nameLabel: 'Group name',
          namePlaceholder: 'e.g. Essentials',
          nameError: 'Name cannot be empty.',
          colorLabel: 'Accent color',
          pill: {
            description:
              'Use this group to cluster related categories and simplify your budgeting review.',
          },
          emptyCtaTitle: 'Need another theme?',
          emptyCtaBody:
            'Create a group to cluster related categories. You can move categories any time.',
        },
        modals: {
          confirmCategoryDelete:
            'Delete this category? This action cannot be undone.',
          confirmGroupDelete:
            'Delete this category group? Categories assigned to it must be moved first.',
        },
      },
      spendistCsv: {
        label: 'Export/import Spendist',
        description: 'CSV, filters, data transfer',
        header: 'Export/import from Spendist',
        text: 'Export transactions to CSV or import a file generated by Spendist. This import is separate from Kontomierz.',
        export: {
          title: 'Export transactions',
          description:
            'Download all transactions matching the filters. Parent categories include their subcategories.',
          monthRange: 'Specific month',
          allRange: 'All time',
          monthLabel: 'Export month',
          categoriesLabel: 'Categories',
          clearCategories: 'Clear',
          noCategories: 'No categories available for filtering.',
          categoryHelp:
            'When no category is selected, the export includes all transactions.',
          action: 'Export CSV',
          exported: 'Exported {{total}} transactions.',
        },
        import: {
          title: 'Import transactions',
          description:
            'Choose a CSV exported from Spendist. Analysis shows duplicates, new reference data, and issues before saving.',
          fileLabel: 'CSV file',
          fileEmpty: 'No file selected.',
          chooseFile: 'Choose file',
          analyze: 'Check file',
          import: 'Import transactions',
        },
        schema: {
          title: 'Accepted CSV schema',
          description:
            'The exported file is the import template. Required columns are described below.',
          columns: {
            id: 'Optional on import; reference to the source transaction only.',
            occurred_at: 'Required; ISO date, e.g. 2026-02-01T00:00:00.000Z.',
            description: 'Optional transaction description.',
            direction: 'Required; expense or income.',
            amount: 'Required; transaction amount.',
            currency: 'Required; ISO currency code, e.g. PLN.',
            amount_in_default:
              'Optional; default-currency amount, falls back to amount when empty.',
            category_group: 'Required; missing groups are created.',
            category_path: 'Required; slash-separated path, up to 3 levels.',
            category:
              'Optional; leaf category label, ignored when category_path exists.',
            wallet: 'Required; missing wallets are created.',
            wallet_currency:
              'Required when the wallet does not exist; ISO currency code.',
            tags: 'Optional; semicolon-separated tag names.',
            is_automatic: 'Optional; true/false, defaults to false.',
            recurring_scheduled_for:
              'Optional; used only when is_automatic=true.',
            import_source: 'Optional; preserved in import metadata.',
            imported_at: 'Optional; reference to a previous import only.',
          },
        },
        status: {
          errorTitle: 'The Spendist CSV file could not be processed.',
          progress: 'Import progress',
          imported:
            'Imported: {{imported}}. Duplicates skipped during import: {{duplicates}}.',
        },
        summary: {
          label: 'Import summary',
          totalRows: 'Data rows',
          parsed: 'Valid transactions',
          duplicates: 'Duplicates',
          importable: 'Ready to import',
          newGroups: 'New groups: {{total}}',
          newCategories: 'New categories: {{total}}',
          newWallets: 'New wallets: {{total}}',
          newTags: 'New tags: {{total}}',
          issues: 'File issues: {{total}}',
          issueRow: 'Row {{row}}: {{message}}',
        },
        empty: {
          title: 'Check a file first',
          body: 'After analysis you will see valid transactions, duplicates, and missing reference data before importing.',
        },
        errors: {
          authRequired: 'Sign in again to export or import data.',
          unsupportedFile: 'Choose a CSV file.',
          invalidMonth: 'Choose a valid month.',
          exportFailed: 'CSV export failed.',
          analyzeFailed: 'The CSV could not be analyzed.',
          importFailed: 'CSV import failed.',
        },
      },
      kontomierzImport: {
        label: 'Kontomierz import',
        description: 'XLSX files, categories, tags',
        header: 'Import data from Kontomierz',
        text: 'Load a Kontomierz XLSX export. The file is parsed in your browser, and only transactions, categories, and tags are saved to the database.',
        form: {
          walletLabel: 'Target wallet',
          walletPlaceholder: 'Select a wallet',
          fileLabel: 'XLSX file',
          fileEmpty: 'No file selected.',
          chooseFile: 'Choose file',
        },
        actions: {
          analyze: 'Check file',
          import: 'Import transactions',
        },
        status: {
          errorTitle: 'The import could not be completed.',
          progress: 'Import progress',
          imported:
            'Imported: {{imported}}. Duplicates skipped during import: {{duplicates}}.',
        },
        summary: {
          label: 'Import summary',
          totalRows: 'Data rows',
          parsed: 'Parsed transactions',
          splitParents: 'Skipped parent split records',
          duplicates: 'Duplicates',
          importable: 'Ready to import',
          newGroups: 'New groups: {{total}}',
          newCategories: 'New categories: {{total}}',
          newTags: 'New tags: {{total}}',
          issues: 'File issues: {{total}}',
          issueRow: 'Row {{row}}: {{message}}',
        },
        empty: {
          title: 'Check a file first',
          body: 'After analysis you will see transaction, duplicate, new category, and tag counts before the import writes anything.',
        },
        errors: {
          authRequired: 'Sign in again to import data.',
          walletRequired: 'Select a target wallet.',
          unsupportedFile: 'Choose an XLSX file.',
          emptyWorkbook: 'The XLSX file does not contain worksheets.',
          generic: 'The import failed. Please try again.',
        },
      },
    },
  },
  notifications: {
    open: 'Open notifications',
    title: 'Notifications',
    loading: 'Loading notifications',
    unreadCount: 'Unread: {{count}}',
    actions: {
      readAll: 'Read all',
    },
    empty: {
      title: 'No notifications',
      body: 'New activity will appear here.',
    },
    items: {
      recurring_transaction_created: {
        title:
          'Recurring transaction created: {{description}} ({{amount}} {{currency}})',
      },
      recurring_transaction_ended: {
        title:
          'Recurring payment ended: {{description}} (ended on {{endDate}})',
      },
      exchange_rates_sync_failed: {
        title: 'Exchange rates sync failed: {{error}}',
      },
    },
    errors: {
      generic: 'Something went wrong. Please try again.',
      load: 'Notifications could not be loaded.',
      markAllRead: 'Notifications could not be marked as read.',
    },
  },
  dashboard: {
    badge: 'Dashboard',
    title: 'Your personalised command centre',
    description:
      'Track balances, cash flow, and upcoming activity. This view will evolve as Spendist grows.',
    placeholder: {
      title: 'Dashboard widgets are on the way',
      body: 'Stay tuned for insights, summaries, and controls tailored to your spending habits.',
    },
    structure: {
      badge: 'Cash flow',
      title: 'Income vs. expenses',
      subtitle:
        'Raw sums from up to the last 12 calendar months of posted transactions.',
      empty:
        'No transactions recorded yet. Add your first income or expense to populate this list.',
      noWallet: 'Select a wallet to see its historical structure.',
      errorTitle: 'Cash flow data could not be loaded',
      retry: 'Try again',
      monthLabel: 'Month',
      income: 'Income',
      expense: 'Expense',
      net: 'Net result',
    },
    categoryWidget: {
      badge: 'Categories',
      title: 'Monthly category structure',
      subtitle:
        'Totals per category for the selected month. Visualisations will land soon.',
      selectLabel: 'Select month',
      noMonths: 'No months available yet',
      errorTitle: 'Category data could not be loaded',
      retry: 'Try again',
      empty: 'No transactions exist for this month.',
      totals: {
        title: 'Totals',
        income: 'Total income',
        expense: 'Total expenses',
        net: 'Net result',
      },
      incomeList: 'Income categories',
      expenseList: 'Expense categories',
      incomeTagList: 'Income tags',
      expenseTagList: 'Expense tags',
      noIncome: 'No income categories recorded.',
      noExpense: 'No expense categories recorded.',
      noIncomeTags: 'No income tags recorded.',
      noExpenseTags: 'No expense tags recorded.',
      walletLabel: 'Wallet',
      walletLoading: 'Loading wallets…',
      noWallets: 'No wallets found.',
      noWalletSelected: 'Select a wallet to load data.',
    },
    recurringWidget: {
      badge: 'Recurring',
      title: 'Recurring payment transactions',
      subtitle:
        'Count and totals for transactions created by recurring payments in the selected month.',
      selectLabel: 'Select month',
      noMonths: 'No months with recurring transactions',
      noWalletSelected: 'Select a wallet to load data.',
      errorTitle: 'Recurring transactions could not be loaded',
      retry: 'Try again',
      empty: 'No transactions created by recurring payments.',
      transactions: 'Transaction count',
      income: 'Income',
      expense: 'Expense',
      net: 'Net result',
    },
    placesWidget: {
      badge: 'Places',
      title: 'Spending by place',
      subtitle:
        'Expense totals for places in the selected year and current wallet.',
      yearLabel: 'Year',
      noWalletSelected: 'Select a wallet to load places.',
      errorTitle: 'Place data could not be loaded',
      retry: 'Try again',
      empty: 'No transactions with a place in this year.',
      latest: 'Latest transaction',
      transactions: 'Transactions',
      expense: 'Expenses',
    },
  },
  transactions: {
    badge: 'Transactions',
    title: 'Transactions',
    filters: {
      title: 'Transaction filters',
      description:
        'Narrow the list by description, category, place, amount, or period.',
      categoriesTab: 'Categories',
      tagsTab: 'Tags',
      clearCategories: 'Clear',
      clearTags: 'Clear',
      allCategories: 'All categories',
      allTags: 'All tags',
      onlyCategoriesWithTransactions: 'Only categories with transactions',
      categoryCount: '{{ total }} categories',
      noVisibleTags: 'No tags with expenses in this period.',
      ungroupedTitle: 'Unassigned',
      presets: {
        currentMonth: 'Current month',
        previousMonth: 'Previous month',
        thisYear: 'This year',
        lastYear: 'Last year',
        allTime: 'All time',
      },
      reset: 'Reset filters',
      searchLabel: 'Search',
      searchPlaceholder: 'Search description, category, place, or currency…',
      categoryLabel: 'Category or group',
      categoryPlaceholder: 'All categories',
      categoryMixed: 'Multiple categories selected',
      wholeGroup: 'Whole group: {{ name }}',
      placeLabel: 'Place',
      placePlaceholder: 'All places',
      minimumAmountLabel: 'Amount from ({{ currency }})',
      maximumAmountLabel: 'Amount to ({{ currency }})',
      amountPlaceholder: 'No limit',
      fromLabel: 'Date from',
      toLabel: 'Date to',
      monthLabel: 'Jump to month',
      monthPlaceholder: 'Select month',
      yearLabel: 'Jump to year',
      yearPlaceholder: 'Select year',
      summaryLabel: 'Summary',
      summaryText: 'Showing {{ loaded }} of {{ total }} results',
    },
    list: {
      errorTitle: 'Transactions could not be loaded',
      retry: 'Try again',
      emptyTitle: 'No transactions match your filters',
      emptyBody:
        'Adjust the filters or add a new transaction to populate this view.',
      noDescription: 'Untitled transaction',
      automatic: 'Automatic',
      recurringSource: 'Recurring',
      uncategorized: 'No category',
      place: 'Place',
      direction: {
        income: 'Income',
        expense: 'Expense',
      },
      categoryIconSr: 'Category icon: {{ label }}',
      actions: {
        edit: 'Edit',
        duplicate: 'Duplicate',
        delete: 'Delete',
        deleteConfirm: 'Delete this transaction? This action cannot be undone.',
      },
    },
    actions: {
      add: 'Add transaction',
      addBulk: 'Add in bulk',
      addShortcutHint: 'Add transaction (Alt+N)',
      loadMore: 'Load more',
    },
    toasts: {
      created: 'Transaction saved in the database.',
      updated: 'Transaction changes saved.',
      bulkCreated: '{{ count }} transactions saved in the database.',
    },
    bulk: {
      badge: 'Import',
      title: 'Add transactions in bulk',
      columns: {
        date: 'Date',
        description: 'Description',
        amount: 'Amount',
        currency: 'Currency',
        direction: 'Type',
        category: 'Category',
        wallet: 'Wallet',
        tags: 'Tags',
        place: 'Place',
        quantity: 'Quantity',
      },
      batchSettings: {
        title: 'Batch settings',
        hint: 'Wallet and type apply to every transaction in this batch.',
      },
      summary: 'Transactions to save: {{ count }}',
      duplicates: '{{ count }} possible duplicates detected.',
      actions: {
        addRows: 'Add 10 rows',
        clearRow: 'Clear row',
        copyField: 'Copy value',
        copyAbove: 'Fill rows above',
        copyBelow: 'Fill rows below',
        save: 'Save {{ count }}',
      },
      validation: {
        title: 'Fix the marked rows before saving.',
        row: 'Row {{ row }}',
        date: 'enter a valid date',
        amount: 'enter an amount greater than zero',
        category: 'select a category',
        wallet: 'select a wallet',
        currency: 'enter a valid currency',
        quantity: 'quantity must be an integer from 1 to 100',
        exchangeRate: 'exchange rate is unavailable for this date and currency',
        save: 'transaction could not be prepared',
      },
    },
    form: {
      badge: {
        create: 'New',
        edit: 'Edit',
      },
      title: {
        create: 'Add transaction',
        edit: 'Edit transaction',
      },
      subtitle: {
        create:
          'Capture the essentials now — you can enrich the record with more details later.',
        edit: 'Update the details below to keep your history accurate.',
      },
      submit: {
        createIdle: 'Save transaction',
        createAndContinue: 'Save and add another',
        editIdle: 'Update transaction',
        busy: 'Saving…',
      },
      submitErrorTitle: 'Something went wrong while saving.',
      fields: {
        description: 'Description',
        category: 'Category',
        place: 'Place',
        date: 'Date',
        amount: 'Amount',
        currency: 'Currency',
        amountInDefault: 'Amount in default currency',
        direction: 'Type',
        quantity: 'How many entries?',
        tags: 'Tags',
        wallet: 'Wallet',
      },
      directions: {
        income: 'Income',
        expense: 'Expense',
      },
      placeholders: {
        description: 'Optional note, e.g. Grocery run',
        category: 'Select category',
        categorySearch: 'Search categories...',
        place: 'No place',
        placeSearch: 'Search places...',
        wallet: 'Select wallet',
        tagInput: 'Type a tag and press Enter…',
      },
      validation: {
        amount: 'Enter an amount greater than zero.',
        exchangeRateUnavailable:
          'Exchange rate is unavailable for this date and currency pair.',
      },
      actions: {
        clearTags: 'Clear selection',
        removeTag: 'Remove {{ name }}',
        showAdvanced: 'Show advanced fields',
        hideAdvanced: 'Hide advanced fields',
        setToday: 'Set today',
        updateExchangeRate: 'Update exchange rate',
      },
      help: {
        amountExpression:
          'You can enter expressions like “2.3 + 2,5 + 12,41”. Dots, commas, plus, minus, multiply, and divide are all supported.',
        quantity: 'Use this when recording identical items bought together.',
        advancedDisclaimer:
          'Transactions default to your primary wallet — choose another if this one should be tracked elsewhere.',
      },
      emptyTags:
        'Start typing to create your first tag or choose from suggestions.',
      recentTags: 'Recently used',
      emptyCategories: 'No matching categories.',
      emptyPlaces: 'No matching places.',
    },
  },
  places: {
    badge: 'Modules',
    title: 'Places',
    description:
      'Save places where you spend money and assign them to transactions.',
    empty: 'Add your first place to assign it to transactions later.',
    noAddress: 'No address',
    search: {
      label: 'Search places',
      placeholder: 'Name, city, street…',
      count: '{{ count }} places',
      empty: 'No places match your search.',
    },
    actions: {
      add: 'Add place',
      edit: 'Edit',
      retry: 'Try again',
      deleteConfirm:
        'Delete “{{ name }}”? Transactions will be kept, but their place will be cleared.',
    },
    form: {
      badge: 'Place',
      title: {
        create: 'Add place',
        edit: 'Edit place',
      },
      closedTitle: 'Select a place',
      closedBody: 'Select a place from the list to edit it or add a new one.',
      fields: {
        name: 'Name',
        street: 'Street and number',
        postalCode: 'Postal code',
        city: 'City',
        country: 'Country',
        note: 'Note',
      },
      validation: {
        name: 'Enter a place name.',
      },
      submit: {
        create: 'Save place',
        edit: 'Save changes',
        busy: 'Saving…',
      },
    },
    errors: {
      title: 'Operation failed',
      auth: 'You need to be signed in to manage places.',
      emptyResponse: 'Supabase returned empty response.',
      generic: 'Place could not be saved.',
      nameRequired: 'Enter a place name.',
    },
  },
  modules: {
    recurringPayments: {
      badge: 'Modules',
      title: 'Recurring payments',
      description:
        'Keep automatic charges under control. Monitor renewals and upcoming bills in one place.',
      stats: {
        monthly: {
          label: 'Generated this month',
          caption:
            'Automatic expense transactions created from recurring payments this month.',
        },
        yearly: {
          label: 'Generated year-to-date',
          caption:
            'Automatic expense transactions created from recurring payments since January.',
        },
      },
      actions: {
        add: 'Add recurring payment',
      },
      form: {
        badge: 'Add recurring',
        title: 'Schedule a recurring payment',
        subtitle:
          'Define the cadence, category, and tags. We will enqueue new entries automatically.',
        editTitle: 'Update recurring payment',
        editSubtitle:
          'Adjust the cadence, amount, or tagging. Future runs will follow the latest details.',
        fields: {
          name: {
            label: 'Name',
            placeholder: 'Netflix, rent, gym membership…',
            error: 'Provide a name up to 120 characters.',
          },
          category: {
            label: 'Category',
            placeholder: 'Select category',
            searchPlaceholder: 'Search categories...',
            empty: 'No matching categories.',
            error: 'Choose a category to classify this payment.',
          },
          wallet: {
            label: 'Wallet',
            placeholder: 'Select wallet',
            error: 'Pick the wallet that should fund this recurring payment.',
            currencyHint:
              'Transactions will use the {{ currency }} currency from this wallet.',
          },
          amount: {
            label: 'Amount',
            error: 'Enter an amount greater than zero.',
          },
          currency: {
            label: 'Currency',
          },
          amountMode: {
            label: 'Amount mode',
            fixedHint: 'Every generated transaction will use this amount.',
            variableHint:
              'Due dates will wait in pending amounts until you enter the actual bill.',
            options: {
              fixed: 'Fixed amount',
              variable: 'Variable amount',
            },
          },
          direction: {
            label: 'Type',
            options: {
              expense: 'Expense',
              income: 'Income',
            },
          },
          schedule: {
            label: 'Schedule',
            placeholder: '0 12 1 * *',
            error: 'Choose a valid schedule.',
            hint: 'Saved as cron: {{cron}}',
            time: 'Execution time',
            dayOfMonth: 'Day',
            dayOfWeek: 'Day of week',
            frequency: {
              daily: 'Daily',
              weekly: 'Weekly',
              monthly: 'Monthly',
            },
            weekdays: {
              monday: 'Monday',
              tuesday: 'Tuesday',
              wednesday: 'Wednesday',
              thursday: 'Thursday',
              friday: 'Friday',
              saturday: 'Saturday',
              sunday: 'Sunday',
            },
          },
          startDate: {
            label: 'Starts on',
            error: 'Pick the first execution date.',
          },
          endDate: {
            label: 'Ends on',
            optional: '(optional)',
          },
          exchangeRate: {
            label: 'Exchange rate',
            optional: '(optional)',
          },
          tags: {
            label: 'Tags',
            hint: 'Attach existing tags to mirror them on generated transactions.',
            empty:
              'Create your first tag in the transactions view to see suggestions here.',
          },
        },
        actions: {
          submit: 'Save recurring payment',
          update: 'Update recurring payment',
          cancelEdit: 'Cancel editing',
        },
        notifications: {
          error:
            'We could not save the recurring payment. Please try again in a moment.',
          invalid: 'Check the highlighted fields before saving.',
          backfillError:
            'The recurring payment was saved, but historical transactions could not be generated right now.',
        },
      },
      pending: {
        title: 'Pending amounts',
        subtitle: 'Variable recurring payments waiting for the actual amount.',
        amount: 'Actual amount',
        complete: 'Post',
      },
      list: {
        badge: 'Overview',
        title: 'Active recurring payments',
        subtitle:
          'Upcoming runs, assigned categories, and tag context for every automated entry.',
        empty: {
          title: 'No recurring payments yet',
          body: 'Add your first recurring payment to keep track of automated charges.',
          filteredTitle: 'No recurring payments in this view',
          filteredBody:
            'Change the filter to see active, stopped, or all recurring payments.',
        },
        filters: {
          active: 'Active',
          stopped: 'Stopped',
          all: 'All',
        },
        status: {
          stopped: 'Stopped',
        },
        fields: {
          schedule: 'Schedule',
          startDate: 'Starts',
          endDate: 'Ends',
          pausedAt: 'Stopped at',
          noEndDate: 'No end date',
          nextRun: 'Next transfer',
          wallet: 'Wallet',
          exchangeRate: 'Exchange rate',
          variableAmount: 'Amount entered per occurrence',
        },
        amountMode: {
          fixed: 'Fixed',
          variable: 'Variable',
        },
        schedule: {
          daily: 'Daily at {{ time }}',
          weekly: 'Every {{ day }} at {{ time }}',
          monthly: 'Monthly on day {{ day }} at {{ time }}',
        },
        weekdays: {
          monday: 'Monday',
          tuesday: 'Tuesday',
          wednesday: 'Wednesday',
          thursday: 'Thursday',
          friday: 'Friday',
          saturday: 'Saturday',
          sunday: 'Sunday',
        },
        nextRun: {
          dueNow: 'due now',
          inDaysHours: 'in {{ days }}d {{ hours }}h',
          inHoursMinutes: 'in {{ hours }}h {{ minutes }}m',
          inMinutes: 'in {{ minutes }}m',
          none: 'No upcoming transfer',
        },
        direction: {
          expense: 'Expense',
          income: 'Income',
        },
        actions: {
          edit: 'Edit',
          stop: 'Stop',
          resume: 'Resume',
          delete: 'Delete',
        },
        confirmStop: 'Stop “{{ name }}”? Future runs will be paused.',
        confirmResume:
          'Resume “{{ name }}”? Future runs will follow the schedule again.',
        confirmDelete: 'Remove “{{ name }}”? Future runs will stop scheduling.',
      },
    },
  },
};

export default en;
