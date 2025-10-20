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
    title: 'All spending in one timeline',
    description: 'Search, filter, and review transactions across accounts. Tools for bulk actions are coming soon.',
    placeholder: {
      title: 'Transaction table arriving shortly',
      body: 'Import, categorisation, and reconciliation live here — we are polishing the experience.',
    },
  },
  modules: {
    recurringPayments: {
      badge: 'Modules',
      title: 'Recurring payments',
      description: 'Keep automatic charges under control. Monitor renewals and upcoming bills in one place.',
      placeholder: {
        title: 'Recurring payments module in progress',
        body: 'We will soon show schedules, reminders, and optimisation tips for your subscriptions.',
      },
    },
  },
};

export default en;
