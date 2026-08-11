const en = {
  appUpdate: {
    title: 'A new version is available',
    description: 'Refresh the page to load the latest Spendist improvements.',
    refresh: 'Refresh now',
    dismiss: 'Dismiss update notification',
  },
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
  oauthConsent: {
    badge: 'External access',
    title: 'Connect an app to Spendist',
    subtitle:
      'Review what this OAuth client can do with your Spendist account.',
    loading: 'Loading authorization request',
    accessTitle: 'Requested Spendist access',
    accessRead:
      'Read wallets, transactions, categories, recurring payments, summaries, and Allowance state.',
    accessWrite:
      'Create and update supported personal-finance records and mark notifications as read.',
    accessDelete:
      'Prepare deletions and execute them only after a separate, short-lived confirmation.',
    scope: 'OAuth scope',
    warning:
      'Only continue if you trust this application. You can revoke its OAuth grant later.',
    deny: 'Deny',
    approve: 'Allow access',
  },
  connectedApps: {
    back: 'Settings',
    title: 'Connected applications',
    subtitle:
      'Review and revoke applications that can access Spendist through OAuth.',
    loading: 'Loading connected applications',
    empty: 'No external applications currently have access.',
    scopes: 'Scopes',
    revoke: 'Revoke access',
    manage: 'Manage access',
  },
  navbar: {
    settings: 'Settings',
    signOut: 'Sign out',
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    modules: 'Modules',
    modulesRecurring: 'Recurring payments',
    modulesPlaces: 'Places',
    modulesAllowance: 'Allowance',
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
      badge: 'Open-source personal finance',
      title: 'See where your money',
      titleHighlight: 'really goes',
      subtitle:
        'Track transactions, paste entries in bulk, automate recurring costs, and understand your cash flow across wallets and currencies.',
      cta: "Get started — it's free",
      login: 'I already have an account',
      ctaSecondary: 'See how it works',
    },
    proof: {
      label: 'Spendist highlights',
      openSource: 'GPL-3.0 open source',
      noAds: 'No ads or data sales',
      bilingual: 'Polish and English',
    },
    preview: {
      ariaLabel: 'Spendist dashboard preview',
      month: 'This month',
      balanceLabel: 'Monthly cash flow',
      income: 'Income',
      expenses: 'Expenses',
      home: 'Home',
      food: 'Food',
      transport: 'Transport',
    },
    features: {
      badge: 'Built for everyday money',
      title: 'From one expense to the whole picture',
      subtitle:
        'Spendist keeps quick entry, deep filtering, automation, and portable data in one focused workspace.',
      dashboard: {
        title: 'Cash flow at a glance',
        description:
          'Compare income and expenses, review categories, recurring commitments, recent activity, and places from one dashboard.',
      },
      bulk: {
        title: 'Fast and bulk entry',
        description:
          'Add one transaction or paste many rows at once. Copy values between rows and validate everything before saving.',
      },
      transactions: {
        title: 'Smart transactions',
        description:
          'Log expenses and income in seconds. Filter by category, wallet, date range, or tags — find anything fast.',
      },
      recurring: {
        title: 'Recurring costs that keep up',
        description:
          'Schedule fixed or variable payments, backfill history, pause plans, and receive notifications when activity is created.',
      },
      currency: {
        title: 'Wallets and real exchange rates',
        description:
          'Use multiple currencies with wallet-aware conversion and automatically synchronized historical NBP exchange rates.',
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
        title: 'Your data stays portable',
        description:
          'Import Kontomierz XLSX or Spendist CSV, review duplicates before saving, and export your transactions whenever you need.',
      },
      organize: {
        title: 'Categories, tags, and places',
        description:
          'Build nested category trees, add custom colors and Heroicons, tag transactions, and connect spending with places.',
        tagExample: '#travel',
        placeExample: 'Warsaw',
        recurringExample: 'Subscriptions',
      },
    },
    latest: {
      badge: 'Recently added',
      title: 'Spendist grows around real workflows',
      subtitle:
        'Recent releases focused on entering data faster, finding it later, and automating work without losing control.',
      github: 'Follow development on GitHub',
      bulk: {
        title: 'Paste into bulk entry',
        description:
          'Turn tabular clipboard data into validated transaction rows.',
      },
      filters: {
        title: 'Focused filters and sorting',
        description:
          'Filter by categories, tags, wallets, dates, amounts, and recurring source.',
      },
      automation: {
        title: 'Recurring history and notifications',
        description:
          'Backfill past schedules and keep track of generated or pending activity.',
      },
      transfer: {
        title: 'Safer CSV transfer',
        description:
          'Analyze duplicates and new reference data before importing anything.',
      },
    },
    trust: {
      badge: 'Privacy by boundary',
      title: 'Your financial workspace is not an ad profile',
      description:
        'Authenticated data is used to provide and secure Spendist. It is not sold and does not flow into public-page analytics.',
      private: 'Per-user database access policies',
      analytics: 'No Google Analytics inside the signed-in app',
      export: 'Export your transaction data',
      source: 'Publicly auditable source code',
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
          'Your authenticated financial data is isolated per user and excluded from public-page analytics.',
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
      title: 'Make your money easier to understand',
      subtitle:
        'Start with one transaction. Build a clear, portable view of your finances over time.',
      button: 'Create free account',
      github: 'Explore the source',
    },
    relatedProject: {
      badge: 'Another open-source project',
      title: 'Meet Tickist',
      description:
        'Organize tasks, projects, deadlines, and recurring responsibilities in another open tool from the creator of Spendist.',
      visit: 'Open Tickist',
      github: 'View Tickist source',
    },
    footer: {
      madeWith: 'Made with',
      tagline: 'for mindful spenders',
      github: 'View on GitHub',
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
      navigationLabel: 'Settings sections',
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
        details: {
          title: 'Profile details',
          fullNameLabel: 'Full name',
          fullNameError: 'Enter between 2 and 120 characters.',
        },
        autosave: {
          saving: 'Saving…',
          saved: 'Saved',
          retry: 'Try again',
          errors: {
            generic:
              'We could not save your profile changes. The previous value was restored.',
          },
        },
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
        accountDeletion: {
          title: 'Delete account',
          description:
            'Permanently delete your Spendist account, financial data, notifications, and avatar.',
          open: 'Delete my account',
          warning:
            'This cannot be undone. Export any data you want to keep before continuing.',
          passwordLabel: 'Current password',
          confirmationLabel: 'Type DELETE to confirm',
          acknowledgement:
            'I understand that my account and all of its data will be permanently deleted.',
          submitIdle: 'Permanently delete account',
          submitBusy: 'Deleting account...',
          errors: {
            passwordRequired: 'Current password is required.',
            confirmation: 'Type DELETE exactly as shown.',
            acknowledgement: 'Confirm that you understand the data loss.',
            invalidPassword: 'Current password is incorrect.',
            unauthorized: 'Your session expired. Sign in again and retry.',
            generic:
              'The account could not be deleted. Your account remains active; please try again.',
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
  blog: {
    common: {
      badge: 'Blog',
      backToSpendist: 'Back to Spendist',
    },
    index: {
      title: 'Ideas for clearer personal finances',
      seoTitle: 'Spendist Blog — Personal finance without lock-in',
      description:
        'Practical articles about personal finance, mindful spending, data ownership, and using Spendist.',
      articles: 'Blog articles',
      emptyTitle: 'The first articles are on the way',
      emptyDescription:
        'The English edition has its own editorial plan. New articles will appear here after they are published from the Spendist repository.',
      emptyFilteredTitle: 'No articles match this tag',
      emptyFilteredDescription:
        'Clear the tag filter to browse all published articles.',
    },
    category: {
      title: '{{category}}',
      seoTitle: '{{category}} — Spendist Blog',
      navigation: 'Blog categories',
      all: 'All articles',
    },
    tags: {
      label: 'Article tags',
      filteredBy: 'Filtered by #{{tag}}',
      clear: 'Clear filter',
    },
    pagination: {
      label: 'Blog pages',
      previous: 'Previous',
      next: 'Next',
      status: 'Page {{page}} of {{pages}}',
    },
    article: {
      breadcrumbs: 'Breadcrumbs',
      readingTime: '{{minutes}} min read',
      updated: 'Updated',
      contents: 'In this article',
      back: 'Back to the blog',
    },
    share: {
      label: 'Share article',
      native: 'Share',
      copy: 'Copy link',
      copied: 'Copied',
    },
    notFound: {
      title: 'This blog page does not exist',
      seoTitle: 'Blog page not found | Spendist',
      description:
        'The article, category, or page may have moved or has not been published.',
      action: 'Go to the blog',
    },
  },
  notifications: {
    open: 'Open notifications',
    title: 'Notifications',
    loading: 'Loading notifications',
    unreadCount: 'Unread: {{count}}',
    actions: {
      readAll: 'Read all',
      read: 'Mark as read',
      accept: 'Accept',
      decline: 'Decline',
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
      allowance_invitation_received: {
        title: '{{inviterName}} invited you to Allowance',
      },
      allowance_invitation_accepted: {
        title: '{{recipientName}} accepted your Allowance invitation',
      },
      allowance_invitation_declined: {
        title: 'Your Allowance invitation was declined',
      },
      allowance_received: {
        title: 'Allowance received: {{description}} ({{amount}} {{currency}})',
      },
      allowance_transfer_failed: {
        title: 'Allowance could not be recorded: {{error}}',
      },
    },
    errors: {
      generic: 'Something went wrong. Please try again.',
      load: 'Notifications could not be loaded.',
      markAllRead: 'Notifications could not be marked as read.',
      markRead: 'Notification could not be marked as read.',
      allowanceResponse: 'The Allowance invitation could not be updated.',
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
      clearAllCategories: 'Clear',
      selectedCategoryCount: 'Selected: {{ count }}',
      allCategories: 'All categories',
      allTags: 'All tags',
      onlyCategoriesWithTransactions: 'Hide empty categories',
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
      showMore: 'Show more filters',
      showLess: 'Hide additional filters',
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
      periodTitle: 'Date range',
      periodDescription:
        'Select a year first, then optionally a month or enter custom dates.',
      monthLabel: 'Month',
      monthPlaceholder: 'Select month',
      yearLabel: 'Year',
      yearPlaceholder: 'Select year',
      sortLabel: 'Sort by',
      sort: {
        dateDesc: 'Newest first',
        dateAsc: 'Oldest first',
        amountDesc: 'Highest amount',
        amountAsc: 'Lowest amount',
        descriptionAsc: 'Description A–Z',
        descriptionDesc: 'Description Z–A',
      },
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
      recurringFallback: 'Recurring payment',
      allowance: {
        payer: 'Allowance · sent',
        recipient: 'Allowance · received',
      },
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
      addFromFile: 'Add from file',
      addShortcutHint: 'Add transaction (Alt+N)',
      openMenu: 'Open transaction actions',
      openMenuShortcutHint: 'Add transaction or add in bulk (Alt+N)',
      loadMore: 'Load more',
    },
    toasts: {
      created: 'Transaction saved in the database.',
      updated: 'Transaction changes saved.',
      bulkCreated: '{{ count }} transactions saved in the database.',
      importCreated:
        '{{ created }} transactions imported; {{ duplicatesSkipped }} duplicates skipped.',
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
        allowanceRecipient: 'Also show for',
        tags: 'Tags',
        place: 'Place',
        quantity: 'Quantity',
      },
      batchSettings: {
        title: 'Batch settings',
        hint: 'Wallet and type apply to every transaction in this batch.',
        parseClipboardAsTable: 'Split pasted data into columns',
        parseClipboardAsTableHint:
          'Turn off to paste all text into the active field, including commas or semicolons.',
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
        tags: 'map unknown tags to existing tags or remove them',
        exchangeRate: 'exchange rate is unavailable for this date and currency',
        save: 'transaction could not be prepared',
      },
    },
    import: {
      badge: 'Import',
      title: 'Import transactions',
      description:
        'Files and pasted data are processed locally in your browser and are not uploaded.',
      sourceLabel: 'Import source',
      fileTab: 'Upload file',
      pasteTab: 'Paste CSV',
      fileHeading: 'Choose one file',
      acceptedFiles:
        'Accepted: Spendist CSV or a Biedronka e-receipt exported as JSON. Up to 500 transactions.',
      dropzoneAction: 'Drop a file here or choose a file',
      dropzoneHint: 'CSV or JSON',
      pasteHeading: 'Paste Spendist CSV',
      pasteDescription:
        'The content is detected and validated automatically after you paste it.',
      pasteLabel: 'Paste CSV content',
      ai: {
        action: 'Prepare an AI prompt',
        badge: 'AI assistance',
        title: 'Create CSV with AI assistance',
        description:
          'Copy the prepared instructions to an AI chat of your choice and attach one purchase document.',
        privacyTitle: 'Before copying:',
        privacyDescription:
          'the prompt contains your category, tag, and wallet names with their currencies. Spendist sends nothing. Pasting the prompt and document into external AI is subject to that provider’s privacy terms.',
        promptLabel: 'AI prompt',
        copy: 'Copy prompt',
        copied: 'The prompt was copied.',
        copyFailed:
          'The prompt could not be copied. Select its contents and copy it manually.',
        missingWallets: 'Add at least one wallet to prepare the prompt.',
        missingCategories: 'Add at least one category to prepare the prompt.',
        steps: {
          copy: 'Copy the prompt with the button below.',
          open: 'Open an AI chat of your choice, such as ChatGPT, Claude, or Grok.',
          attach:
            'Paste the prompt and attach a receipt or invoice photo, order screenshot, or email content.',
          return:
            'Download the resulting CSV or copy its contents, then return to the Spendist importer.',
        },
      },
      readingFile: 'Reading and detecting the file format…',
      validating: 'Validating CSV…',
      removeFile: 'Remove file',
      parsed: '{{ count }} transactions ready for review',
      mappingTitle: 'Complete import details',
      selectWallet: 'Select an existing wallet',
      selectCategory: 'Select a category',
      noPlace: 'No place',
      walletNotMatched:
        'Wallet “{{ name }}” was not found. Select an existing wallet.',
      review: 'Review transactions',
      reviewBadge: 'Import review',
      reviewTitle: 'Review imported transactions',
      sourceCategory: 'CSV category not matched: {{ name }}',
      sourceTags:
        'Unknown CSV tags: {{ names }}. Replace them with existing tags or clear the field.',
      formats: {
        csv: {
          title: 'Spendist CSV',
          description:
            'The same 17-column format used in Settings import/export.',
        },
        biedronka: {
          title: 'Biedronka e-receipt',
          description: 'JSON file exported from the Biedronka application.',
        },
      },
      detected: {
        spendist_csv: 'Spendist CSV',
        biedronka_e_receipt: 'Biedronka e-receipt',
        unknown: 'Unknown format',
      },
      schema: {
        action: 'CSV schema',
        title: 'Spendist CSV schema',
        description: 'Use the columns below. Extra columns are ignored.',
        required: 'Required:',
      },
      errors: {
        read: 'The file could not be read.',
        invalid: 'The file could not be parsed.',
        invalid_file: 'The CSV file is invalid. Check its schema and values.',
        invalid_receipt:
          'The Biedronka e-receipt is invalid or its totals do not match.',
        unknown_format:
          'This file is not a supported Spendist CSV or Biedronka e-receipt.',
        mixed_direction: 'All CSV rows must have the same transaction type.',
        mixed_wallet: 'All CSV rows must use the same wallet.',
        row_limit: 'One import can contain at most 500 transactions.',
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
      audit: {
        createdAt: 'Added',
        updatedAt: 'Last edited',
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
        allowanceRecipient: 'Only on my account',
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
        clearPlace: 'Clear place',
        updateExchangeRate: 'Update exchange rate',
      },
      help: {
        amountExpression:
          'You can enter expressions like “2.3 + 2,5 + 12,41”. Dots, commas, plus, minus, multiply, and divide are all supported.',
        quantity: 'Use this when recording identical items bought together.',
        advancedDisclaimer:
          'Transactions default to your primary wallet — choose another if this one should be tracked elsewhere.',
        allowanceRecipient:
          'Creates a matching income entry for the selected recipient.',
        allowanceEmpty:
          'Connect a recipient in the Allowance module to use this option.',
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
    allowance: {
      badge: 'Allowance',
      title: 'Allowance, planned together',
      description:
        'Connect with a recipient and record matching expense and income entries, once or on a schedule.',
      ledgerNotice:
        'Spendist records budget entries only. It does not transfer money or initiate bank payments.',
      invite: {
        title: 'Invite a recipient',
        help: 'You can invite more people by sending one invitation at a time.',
        email: 'Email address',
        submit: 'Send invitation',
        pending: 'Invitations',
      },
      invitePage: {
        title: 'Allowance invitation',
        accepted: 'The accounts are now connected.',
        open: 'Open Allowance',
        invalid:
          'This invitation is invalid, expired, or belongs to another email address.',
        signIn: 'Log in or create an account using the invited email address.',
      },
      connections: {
        title: 'Connected people',
        empty: 'No connections yet.',
        disconnect: 'Disconnect',
        role: {
          payer: 'You send allowance',
          recipient: 'You receive allowance',
        },
      },
      schedule: {
        title: 'Plan allowance',
        help: 'The schedule appears in Recurring payments with an Allowance badge.',
        recipient: 'Recipient',
        chooseRecipient: 'Choose a recipient',
        name: 'Description',
        category: 'Your expense category',
        wallet: 'Your wallet',
        amountMode: 'Amount type',
        fixed: 'Fixed amount',
        variable: 'Variable amount',
        amount: 'Amount',
        frequency: 'Frequency',
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        weekday: 'Day of week',
        monthday: 'Day of month',
        time: 'Time',
        start: 'Start date',
        end: 'End date (optional)',
        submit: 'Create allowance schedule',
        listTitle: 'Allowance schedules',
        empty: 'No allowance schedules yet.',
        pause: 'Pause',
        resume: 'Resume',
        nextRun: 'Next entry: {{date}}',
        noUpcoming: 'No upcoming entries.',
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
      status: {
        pending: 'Pending',
        accepted: 'Accepted',
        declined: 'Declined',
        revoked: 'Revoked',
        expired: 'Expired',
        disconnected: 'Disconnected',
        paused: 'Paused',
      },
      errors: {
        load: 'Allowance data could not be loaded.',
        mutation: 'The Allowance operation could not be completed.',
      },
    },
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
        planned: {
          label: 'Total for this month',
          caption:
            'Generated: {{ generated }} {{ currency }}. Still scheduled: {{ scheduled }} {{ currency }} (scheduled occurrences: {{ count }}).',
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
