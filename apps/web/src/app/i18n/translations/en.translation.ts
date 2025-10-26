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
      customInfo: 'Icon “{{icon}}” isn’t part of the Heroicons set, but it will be kept as-is.',
    },
  },
  navbar: {
    settings: 'Settings',
    signOut: 'Sign out',
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    modules: 'Modules',
    modulesRecurring: 'Recurring payments',
    menuToggle: 'Open navigation menu',
  },
  landing: {
    title: 'Welcome to Spendist',
    subtitle: 'Sign in to start tracking your spending, or create an account to get started.',
    loginCta: 'Log in',
    signupCta: 'Sign up',
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
      submitIdle: 'Log in',
      submitBusy: 'Signing in...',
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
      passwordHelper: 'Use at least 8 characters including letters and numbers.',
      passwordConfirmLabel: 'Confirm password',
      passwordConfirmError: 'Passwords must match.',
      submitIdle: 'Sign up',
      submitBusy: 'Creating account...',
      tosNotice: 'By continuing you agree to our future Terms of Service and Privacy Policy.',
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
        text:
          'Keep your personal details current so insights, notifications, and currencies stay in sync.',
        note:
          'Advanced profile preferences (notifications, integrations) will live here soon.',
        name: 'Joanna Doe',
        currency: 'Primary currency',
        language: 'Language',
        timezone: 'Timezone',
        blurb:
          'Your profile details power budgets, reporting, and workspace collaboration (coming soon).',
      },
      categories: {
        label: 'Categories',
        description: 'Labels, groups, automation',
        header: 'Categories & groups',
        text:
          'Organize spending labels and cluster them into grouped themes. Use search or filters to jump to what matters.',
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
        emptyGroups: 'Create a category group before adding categories. Groups keep your spending organized.',
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
          description: 'Define the label, choose a color, and assign it to a group you already use.',
          nameLabel: 'Category name',
          namePlaceholder: 'e.g. Groceries',
          nameRequired: 'Name is required.',
          groupLabel: 'Category group',
          groupPlaceholder: 'Select a group',
          groupRequired: 'Choose where this category belongs.',
          colorLabel: 'Accent color',
          colorPlaceholder: '#0EA5A5',
          iconLabel: 'Heroicon',
        },
        details: {
          selectedHeading: 'Selected category',
          groupedUnder: 'Grouped under {{group}}',
          group: 'Group',
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
          description: 'Group related categories to unlock richer insights and quicker filtering.',
          nameLabel: 'Group name',
          namePlaceholder: 'e.g. Essentials',
          nameError: 'Name cannot be empty.',
          colorLabel: 'Accent color',
          pill: {
            description: 'Use this group to cluster related categories and simplify your budgeting review.',
          },
          emptyCtaTitle: 'Need another theme?',
          emptyCtaBody:
            'Create a group to cluster related categories. You can move categories any time.',
        },
        modals: {
          confirmCategoryDelete: 'Delete this category? This action cannot be undone.',
          confirmGroupDelete: 'Delete this category group? Categories assigned to it must be moved first.',
        },
      },
    },
  },
  notifications: {
    errors: {
      generic: 'Something went wrong. Please try again.',
    },
  },
  dashboard: {
    badge: 'Dashboard',
    title: 'Your personalised command centre',
    description: 'Track balances, cash flow, and upcoming activity. This view will evolve as Spendist grows.',
    placeholder: {
      title: 'Dashboard widgets are on the way',
      body: 'Stay tuned for insights, summaries, and controls tailored to your spending habits.',
    },
  },
  transactions: {
    badge: 'Transactions',
    filters: {
      categoriesTitle: 'Categories',
      clearCategories: 'Clear',
      allCategories: 'All categories',
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
      searchPlaceholder: 'Search description, category, or currency…',
      fromLabel: 'Date from',
      toLabel: 'Date to',
      monthLabel: 'Jump to month',
      monthPlaceholder: 'Select month',
      yearLabel: 'Jump to year',
      yearPlaceholder: 'Select year',
      summaryLabel: 'Summary',
      summaryText: 'Showing {{ total }} results',
    },
    list: {
      errorTitle: 'Transactions could not be loaded',
      retry: 'Try again',
      emptyTitle: 'No transactions match your filters',
      emptyBody: 'Adjust the filters or add a new transaction to populate this view.',
      noDescription: 'Untitled transaction',
      automatic: 'Automatic',
      uncategorized: 'No category',
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
        create: 'Capture the essentials now — you can enrich the record with more details later.',
        edit: 'Update the details below to keep your history accurate.',
      },
      submit: {
        createIdle: 'Save transaction',
        editIdle: 'Update transaction',
        busy: 'Saving…',
      },
      submitErrorTitle: 'Something went wrong while saving.',
      fields: {
        description: 'Description',
        category: 'Category',
        date: 'Date',
        amount: 'Amount',
        currency: 'Currency',
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
        wallet: 'Select wallet (optional)',
        tagInput: 'Type a tag and press Enter…',
      },
      validation: {
        amount: 'Enter an amount greater than zero.',
      },
      actions: {
        clearTags: 'Clear selection',
        removeTag: 'Remove {{ name }}',
        showAdvanced: 'Show advanced fields',
        hideAdvanced: 'Hide advanced fields',
      },
      help: {
        quantity: 'Use this when recording identical items bought together.',
        advancedDisclaimer: 'Assign a wallet if you track balances separately.',
      },
      emptyTags: 'Start typing to create your first tag or choose from suggestions.',
    },
  },
  modules: {
    recurringPayments: {
      badge: 'Modules',
      title: 'Recurring payments',
      description: 'Keep automatic charges under control. Monitor renewals and upcoming bills in one place.',
      stats: {
        monthly: {
          label: 'Current month spend',
          caption: 'Sum of expenses generated by recurring transactions this month.',
        },
        yearly: {
          label: 'Year-to-date spend',
          caption: 'Cumulative expenses from recurring transactions since January.',
        },
      },
      actions: {
        add: 'Add recurring payment',
      },
      form: {
        badge: 'Add recurring',
        title: 'Schedule a recurring payment',
        subtitle: 'Define the cadence, category, and tags. We will enqueue new entries automatically.',
        editTitle: 'Update recurring payment',
        editSubtitle: 'Adjust the cadence, amount, or tagging. Future runs will follow the latest details.',
        fields: {
          name: {
            label: 'Name',
            placeholder: 'Netflix, rent, gym membership…',
            error: 'Provide a name up to 120 characters.',
            duplicate: 'You already track a recurring payment with this name.',
          },
          category: {
            label: 'Category',
            placeholder: 'Select category',
            error: 'Choose a category to classify this payment.',
          },
          amount: {
            label: 'Amount',
            error: 'Enter an amount greater than zero.',
          },
          currency: {
            label: 'Currency',
            error: 'Use a 3-letter currency code, e.g. PLN.',
          },
          direction: {
            label: 'Type',
            options: {
              expense: 'Expense',
              income: 'Income',
            },
          },
          schedule: {
            label: 'Cron schedule',
            placeholder: '0 12 1 * *',
            error: 'Enter a valid cron expression.',
            hint: 'Use standard cron format: minute hour day-of-month month day-of-week.',
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
            empty: 'Create your first tag in the transactions view to see suggestions here.',
          },
        },
        actions: {
          submit: 'Save recurring payment',
          update: 'Update recurring payment',
          cancelEdit: 'Cancel editing',
        },
        notifications: {
          error: 'We could not save the recurring payment. Please try again in a moment.',
          duplicateName: 'A recurring payment with this name already exists. Pick a different label or edit the existing one.',
        },
      },
      list: {
        badge: 'Overview',
        title: 'Active recurring payments',
        subtitle: 'Upcoming runs, assigned categories, and tag context for every automated entry.',
        empty: {
          title: 'No recurring payments yet',
          body: 'Add your first recurring payment to keep track of automated charges.',
        },
        fields: {
          schedule: 'Schedule',
          startDate: 'Starts',
          endDate: 'Ends',
          noEndDate: 'No end date',
          exchangeRate: 'Exchange rate',
        },
        direction: {
          expense: 'Expense',
          income: 'Income',
        },
        actions: {
          edit: 'Edit',
          delete: 'Delete',
        },
        confirmDelete: 'Remove “{{ name }}”? Future runs will stop scheduling.',
      },
    },
  },
};

export default en;
