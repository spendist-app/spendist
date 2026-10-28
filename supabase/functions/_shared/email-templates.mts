// Branded email rendering shared by process-email and the local preview script.
// Pure TypeScript without Deno APIs, so node:test can cover it.

export const EMAIL_TEMPLATES = [
  'auth.signup',
  'auth.signup_existing',
  'auth.recovery',
  'auth.magiclink',
  'auth.invite',
  'auth.email_change',
  'auth.reauthentication',
  'notification',
  'invitation',
] as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

// Field names follow the queue's snake_case template_data keys.
export interface EmailTemplateData {
  readonly language?: string;
  readonly link?: string;
  readonly code?: string;
  readonly new_email?: string;
  readonly type?: string;
  readonly timezone?: string;
  readonly description?: string;
  readonly amount?: string;
  readonly currency?: string;
  readonly direction?: string;
  readonly occurred_at?: string;
  readonly end_date?: string;
  readonly payer_name?: string;
  readonly recipient_name?: string;
  readonly inviter_name?: string;
  readonly schedule?: string;
  readonly wallet?: string;
  readonly category?: string;
}

export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

type Language = 'pl' | 'en';

interface EmailDetail {
  readonly label: string;
  readonly value: string;
  readonly tone: 'plain' | 'income' | 'expense';
}

interface EmailAction {
  readonly label: string;
  readonly url: string;
}

interface EmailContent {
  readonly subject: string;
  readonly preheader: string;
  readonly lead: string;
  readonly paragraphs: readonly string[];
  readonly details: readonly EmailDetail[];
  readonly code: string | null;
  readonly action: EmailAction | null;
  readonly notes: readonly string[];
  readonly optOutTopic: string | null;
  readonly automated: boolean;
}

const APP_ORIGIN = 'https://spendist.app';

export const EMAIL_LOGO_URL = `${APP_ORIGIN}/brand/email/spendist-logo-email.png`;

const SETTINGS_URL = `${APP_ORIGIN}/settings#email-notifications`;

const COLORS = {
  page: '#F3F4F6',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  panel: '#F9FAFB',
  primary: '#0EA5A5',
  primaryLight: '#2DD4BF',
  primaryContent: '#062824',
  income: '#15803D',
  expense: '#B91C1C',
} as const;

const FONT =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const COMMON = {
  pl: {
    greeting: 'Witaj!',
    signOff: 'Pozdrawiamy,',
    team: 'Zespół Spendist',
    tagline: 'Spendist — dla świadomych finansowo',
    privacy: 'Polityka prywatności',
    terms: 'Regulamin',
    privacyUrl: `${APP_ORIGIN}/polityka-prywatnosci?lang=pl`,
    termsUrl: `${APP_ORIGIN}/regulamin?lang=pl`,
    fallbackLink:
      'Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:',
    automated: 'Wiadomość wysłana automatycznie — nie odpowiadaj na nią.',
    optOut: (topic: string) =>
      `Otrzymujesz tę wiadomość, bo masz włączone powiadomienia e-mail ${topic}.`,
    optOutLink: 'Wyłącz te powiadomienia w ustawieniach',
  },
  en: {
    greeting: 'Hello!',
    signOff: 'Best regards,',
    team: 'The Spendist team',
    tagline: 'Spendist — for mindful spenders',
    privacy: 'Privacy policy',
    terms: 'Terms',
    privacyUrl: `${APP_ORIGIN}/polityka-prywatnosci?lang=en`,
    termsUrl: `${APP_ORIGIN}/regulamin?lang=en`,
    fallbackLink:
      "If the button doesn't work, copy this link into your browser:",
    automated: 'This message was sent automatically — please do not reply.',
    optOut: (topic: string) =>
      `You are receiving this email because email notifications ${topic} are turned on.`,
    optOutLink: 'Turn off these notifications in settings',
  },
} as const;

export function renderEmail(
  template: EmailTemplate,
  data: EmailTemplateData
): RenderedEmail {
  const language: Language = data.language === 'pl' ? 'pl' : 'en';
  const content = buildContent(template, sanitizeData(data), language);

  return {
    subject: singleLine(content.subject, 200),
    html: renderHtml(content, language),
    text: renderText(content, language),
  };
}

function buildContent(
  template: EmailTemplate,
  data: EmailTemplateData,
  language: Language
): EmailContent {
  switch (template) {
    case 'auth.signup':
    case 'auth.recovery':
    case 'auth.magiclink':
    case 'auth.invite':
    case 'auth.email_change':
      return authLinkContent(template, data, language);
    case 'auth.signup_existing':
      return signupExistingContent(language);
    case 'auth.reauthentication':
      return reauthenticationContent(data, language);
    case 'invitation':
      return invitationContent(data, language);
    case 'notification':
      return notificationContent(data, language);
  }
}

const AUTH_COPY = {
  'auth.signup': {
    pl: {
      subject: 'Potwierdź rejestrację w Spendist',
      preheader: 'Jeszcze jeden krok — aktywuj swoje konto w Spendist.',
      lead: 'Dziękujemy za rejestrację w Spendist',
      paragraph:
        'Aby aktywować konto, potwierdź swój adres e-mail, klikając przycisk poniżej.',
      action: 'Potwierdź adres e-mail',
      note: 'Jeśli to nie Ty zakładasz konto, zignoruj tę wiadomość.',
    },
    en: {
      subject: 'Confirm your Spendist sign-up',
      preheader: 'One more step to activate your Spendist account.',
      lead: 'Thanks for signing up for Spendist',
      paragraph:
        'To activate your account, confirm your email address with the button below.',
      action: 'Confirm email address',
      note: "If you didn't create an account, you can ignore this email.",
    },
  },
  'auth.recovery': {
    pl: {
      subject: 'Zresetuj hasło do Spendist',
      preheader: 'Ustaw nowe hasło do swojego konta Spendist.',
      lead: 'Reset hasła',
      paragraph:
        'Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Kliknij przycisk poniżej, aby ustawić nowe hasło.',
      action: 'Ustaw nowe hasło',
      note: 'Jeśli to nie Ty, zignoruj tę wiadomość — Twoje hasło pozostanie bez zmian.',
    },
    en: {
      subject: 'Reset your Spendist password',
      preheader: 'Set a new password for your Spendist account.',
      lead: 'Password reset',
      paragraph:
        'We received a request to reset the password for your account. Use the button below to set a new one.',
      action: 'Set a new password',
      note: "If this wasn't you, ignore this email — your password stays unchanged.",
    },
  },
  'auth.magiclink': {
    pl: {
      subject: 'Twój link logowania do Spendist',
      preheader: 'Zaloguj się do Spendist jednym kliknięciem.',
      lead: 'Logowanie do Spendist',
      paragraph: 'Kliknij przycisk poniżej, aby zalogować się do Spendist.',
      action: 'Zaloguj się',
      note: 'Jeśli to nie Ty, zignoruj tę wiadomość.',
    },
    en: {
      subject: 'Your Spendist sign-in link',
      preheader: 'Sign in to Spendist with one click.',
      lead: 'Sign in to Spendist',
      paragraph: 'Use the button below to sign in to Spendist.',
      action: 'Sign in',
      note: "If this wasn't you, you can ignore this email.",
    },
  },
  'auth.invite': {
    pl: {
      subject: 'Zaproszenie do Spendist',
      preheader: 'Załóż konto w Spendist i zacznij świadomie planować wydatki.',
      lead: 'Zaproszenie do Spendist',
      paragraph:
        'Otrzymujesz zaproszenie do Spendist — darmowej aplikacji open source do świadomego zarządzania wydatkami. Kliknij przycisk poniżej, aby założyć konto.',
      action: 'Przyjmij zaproszenie',
      note: 'Jeśli nie spodziewasz się tego zaproszenia, zignoruj tę wiadomość.',
    },
    en: {
      subject: "You're invited to Spendist",
      preheader: 'Create your Spendist account and start spending mindfully.',
      lead: 'Invitation to Spendist',
      paragraph:
        "You've been invited to Spendist — a free, open-source app for mindful spending. Use the button below to create your account.",
      action: 'Accept invitation',
      note: "If you weren't expecting this invitation, you can ignore this email.",
    },
  },
  'auth.email_change': {
    pl: {
      subject: 'Potwierdź zmianę adresu e-mail w Spendist',
      preheader: 'Potwierdź nowy adres e-mail swojego konta Spendist.',
      lead: 'Zmiana adresu e-mail',
      paragraph:
        'Otrzymaliśmy prośbę o zmianę adresu e-mail przypisanego do Twojego konta Spendist. Potwierdź ją, klikając przycisk poniżej.',
      action: 'Potwierdź zmianę',
      note: 'Jeśli to nie Ty, zignoruj tę wiadomość i rozważ zmianę hasła.',
    },
    en: {
      subject: 'Confirm your Spendist email change',
      preheader: 'Confirm the new email address for your Spendist account.',
      lead: 'Email address change',
      paragraph:
        'We received a request to change the email address of your Spendist account. Confirm it with the button below.',
      action: 'Confirm change',
      note: "If this wasn't you, ignore this email and consider changing your password.",
    },
  },
} as const;

function authLinkContent(
  template: keyof typeof AUTH_COPY,
  data: EmailTemplateData,
  language: Language
): EmailContent {
  const copy = AUTH_COPY[template][language];
  const url = safeLink(data.link);
  const newEmail = data.new_email?.trim();

  const details: EmailDetail[] =
    template === 'auth.email_change' && newEmail
      ? [
          {
            label: language === 'pl' ? 'Nowy adres' : 'New address',
            value: newEmail,
            tone: 'plain',
          },
        ]
      : [];

  return {
    subject: copy.subject,
    preheader: copy.preheader,
    lead: copy.lead,
    paragraphs: [copy.paragraph],
    details,
    code: null,
    action: { label: copy.action, url },
    notes: [
      language === 'pl'
        ? 'Ze względów bezpieczeństwa link działa tylko przez krótki czas.'
        : 'For your security, the link works only for a short time.',
      copy.note,
    ],
    optOutTopic: null,
    automated: true,
  };
}

// A repeated sign-up for an address that is still unconfirmed gets no confirmation
// link: password recovery lets the mailbox owner set the password instead.
function signupExistingContent(language: Language): EmailContent {
  const pl = language === 'pl';

  return {
    subject: pl
      ? 'Dokończ zakładanie konta w Spendist'
      : 'Finish setting up your Spendist account',
    preheader: pl
      ? 'Ustaw hasło, aby dokończyć zakładanie konta.'
      : 'Set a password to finish setting up your account.',
    lead: pl ? 'Dokończ zakładanie konta' : 'Finish setting up your account',
    paragraphs: [
      pl
        ? 'Ten adres e-mail był już wcześniej użyty do rejestracji w Spendist, ale konto nie zostało jeszcze potwierdzone.'
        : 'This email address was already used to sign up for Spendist, but the account has not been confirmed yet.',
      pl
        ? 'Ze względów bezpieczeństwa nie wysyłamy ponownie linku aktywacyjnego. Kliknij przycisk poniżej i użyj opcji „Nie pamiętam hasła”, aby ustawić własne hasło — to jednocześnie potwierdzi adres e-mail.'
        : 'For your security, we do not send the activation link again. Use the button below to reset your password and choose your own — this also confirms your email address.',
    ],
    details: [],
    code: null,
    action: {
      label: pl ? 'Ustaw hasło' : 'Set your password',
      url: `${APP_ORIGIN}/forgot-password`,
    },
    notes: [
      pl
        ? 'Jeśli to nie Ty zakładasz konto, zignoruj tę wiadomość.'
        : "If you didn't create an account, you can ignore this email.",
    ],
    optOutTopic: null,
    automated: true,
  };
}

function reauthenticationContent(
  data: EmailTemplateData,
  language: Language
): EmailContent {
  const code = data.code?.trim() ?? '';

  if (!/^\d{6,10}$/.test(code)) throw new Error('Invalid authentication code');

  const pl = language === 'pl';

  return {
    subject: pl
      ? 'Twój kod weryfikacyjny Spendist'
      : 'Your Spendist verification code',
    preheader: pl
      ? 'Użyj tego kodu, aby potwierdzić operację na koncie.'
      : 'Use this code to confirm your account request.',
    lead: pl ? 'Kod weryfikacyjny' : 'Verification code',
    paragraphs: [
      pl
        ? 'Użyj poniższego kodu, aby potwierdzić operację na koncie Spendist.'
        : 'Use the code below to confirm the request on your Spendist account.',
    ],
    details: [],
    code,
    action: null,
    notes: [
      pl
        ? 'Kod jest jednorazowy i ważny przez krótki czas. Nikomu go nie przekazuj.'
        : 'The code is single-use and valid for a short time. Never share it with anyone.',
      pl
        ? 'Jeśli to nie Ty, zignoruj tę wiadomość i rozważ zmianę hasła.'
        : "If this wasn't you, ignore this email and consider changing your password.",
    ],
    optOutTopic: null,
    automated: true,
  };
}

function invitationContent(
  data: EmailTemplateData,
  language: Language
): EmailContent {
  const url = appLink(data.link);
  const inviter = data.inviter_name?.trim();
  const pl = language === 'pl';

  return {
    // The inviter chooses their own name, so it stays out of the subject line.
    subject: pl
      ? 'Zaproszenie do Kieszonkowego w Spendist'
      : "You're invited to Spendist Allowance",
    preheader: pl
      ? 'Połącz konta w module Kieszonkowe i planujcie kieszonkowe razem.'
      : 'Connect accounts in Allowance and plan pocket money together.',
    lead: pl ? 'Zaproszenie do Kieszonkowego' : 'Allowance invitation',
    paragraphs: [
      pl
        ? `${
            inviter ?? 'Użytkownik Spendist'
          } zaprasza Cię do połączenia kont w module Kieszonkowe.`
        : `${
            inviter ?? 'A Spendist user'
          } invited you to connect accounts in the Allowance module.`,
      pl
        ? 'Kieszonkowe pozwala wspólnie planować i zapisywać kieszonkowe oraz wydatki. Spendist zapisuje wpisy budżetowe i nie przesyła pieniędzy.'
        : 'Allowance lets you plan and record pocket money and expenses together. Spendist records budget entries and does not transfer money.',
    ],
    details: [],
    code: null,
    action: {
      label: pl ? 'Zobacz zaproszenie' : 'View invitation',
      url,
    },
    notes: [
      pl
        ? 'Link jest ważny przez 7 dni. Jeśli nie znasz tej osoby, zignoruj tę wiadomość.'
        : "The link expires in 7 days. If you don't know this person, you can ignore this email.",
    ],
    optOutTopic: null,
    automated: false,
  };
}

interface NotificationCopy {
  readonly lead: string;
  readonly paragraph: string;
  readonly subject: (name: string | null) => string;
  readonly topic: string;
  readonly action: EmailAction;
  readonly details: (
    data: EmailTemplateData
  ) => readonly (EmailDetail | null)[];
}

function notificationCopy(type: string, language: Language): NotificationCopy {
  const pl = language === 'pl';

  const dashboard: EmailAction = {
    label: pl ? 'Otwórz Spendist' : 'Open Spendist',
    url: `${APP_ORIGIN}/dashboard`,
  };

  const recurring: EmailAction = {
    label: pl ? 'Otwórz płatności cykliczne' : 'Open recurring payments',
    url: `${APP_ORIGIN}/modules/recurring-payments`,
  };

  const allowance: EmailAction = {
    label: pl ? 'Otwórz Kieszonkowe' : 'Open Allowance',
    url: `${APP_ORIGIN}/modules/allowance`,
  };

  const allowanceTopic = pl
    ? 'z modułu Kieszonkowe'
    : 'from the Allowance module';

  const withName = (base: string) => (name: string | null) =>
    name ? `${base}: ${name}` : base;

  switch (type) {
    case 'recurring_transaction_created':
      return {
        lead: pl
          ? 'Utworzono płatność cykliczną'
          : 'Recurring payment recorded',
        paragraph: pl
          ? 'Spendist dodał nową transakcję zgodnie z harmonogramem Twojej płatności cyklicznej.'
          : 'Spendist added a new transaction from your recurring payment schedule.',
        subject: withName(
          pl ? 'Utworzono płatność cykliczną' : 'Recurring payment recorded'
        ),
        topic: pl
          ? 'o utworzonych płatnościach cyklicznych'
          : 'about recorded recurring payments',
        action: dashboard,
        details: (data) => [
          detail(pl ? 'Nazwa' : 'Name', data.description),
          amountDetail(data, language, data.direction),
          detail(pl ? 'Typ' : 'Type', directionLabel(data.direction, language)),
          detail(
            pl ? 'Data' : 'Date',
            formatDateTime(data.occurred_at, data.timezone, language)
          ),
          detail(pl ? 'Portfel' : 'Wallet', data.wallet),
          detail(pl ? 'Kategoria' : 'Category', data.category),
          detail(
            pl ? 'Częstotliwość' : 'Frequency',
            frequencyLabel(data.schedule, language)
          ),
        ],
      };
    case 'recurring_transaction_ended':
      return {
        lead: pl ? 'Płatność cykliczna zakończona' : 'Recurring payment ended',
        paragraph: pl
          ? 'Ta płatność cykliczna osiągnęła datę zakończenia i nie będzie tworzyć kolejnych transakcji.'
          : 'This recurring payment reached its end date and will not create further transactions.',
        subject: withName(
          pl ? 'Płatność cykliczna zakończona' : 'Recurring payment ended'
        ),
        topic: pl
          ? 'o zakończonych płatnościach cyklicznych'
          : 'about ended recurring payments',
        action: recurring,
        details: (data) => [
          detail(pl ? 'Nazwa' : 'Name', data.description),
          detail(
            pl ? 'Data zakończenia' : 'End date',
            formatDate(data.end_date, language)
          ),
          detail(pl ? 'Portfel' : 'Wallet', data.wallet),
          detail(pl ? 'Kategoria' : 'Category', data.category),
        ],
      };
    case 'allowance_received':
      return {
        lead: pl ? 'Otrzymano kieszonkowe' : 'Allowance received',
        paragraph: pl
          ? 'W module Kieszonkowe zapisano nowe kieszonkowe.'
          : 'A new allowance was recorded in the Allowance module.',
        subject: withName(pl ? 'Otrzymano kieszonkowe' : 'Allowance received'),
        topic: allowanceTopic,
        action: allowance,
        details: (data) => [
          detail(pl ? 'Opis' : 'Description', data.description),
          amountDetail(data, language, 'income'),
          detail(
            pl ? 'Data' : 'Date',
            formatDateTime(data.occurred_at, data.timezone, language)
          ),
        ],
      };
    case 'allowance_expense_added':
      return {
        lead: pl ? 'Dodano wydatek z kieszonkowego' : 'Allowance expense added',
        paragraph: pl
          ? 'W module Kieszonkowe zapisano nowy wydatek z Twojego kieszonkowego.'
          : 'A new expense from your allowance was recorded in the Allowance module.',
        subject: withName(
          pl ? 'Dodano wydatek z kieszonkowego' : 'Allowance expense added'
        ),
        topic: allowanceTopic,
        action: allowance,
        details: (data) => [
          detail(pl ? 'Dodane przez' : 'Added by', data.payer_name),
          detail(pl ? 'Opis' : 'Description', data.description),
          amountDetail(data, language, 'expense'),
          detail(
            pl ? 'Data' : 'Date',
            formatDateTime(data.occurred_at, data.timezone, language)
          ),
        ],
      };
    case 'allowance_invitation_accepted':
      return {
        lead: pl ? 'Zaproszenie zaakceptowane' : 'Invitation accepted',
        paragraph: pl
          ? 'Twoje zaproszenie do modułu Kieszonkowe zostało zaakceptowane. Możecie już razem planować kieszonkowe.'
          : 'Your Allowance invitation was accepted. You can now plan allowances together.',
        subject: () =>
          pl
            ? 'Zaproszenie do Kieszonkowego zaakceptowane'
            : 'Your Allowance invitation was accepted',
        topic: allowanceTopic,
        action: allowance,
        details: (data) => [
          detail(pl ? 'Osoba' : 'Person', data.recipient_name),
        ],
      };
    case 'allowance_invitation_declined':
      return {
        lead: pl ? 'Zaproszenie odrzucone' : 'Invitation declined',
        paragraph: pl
          ? 'Twoje zaproszenie do modułu Kieszonkowe zostało odrzucone.'
          : 'Your Allowance invitation was declined.',
        subject: () =>
          pl
            ? 'Zaproszenie do Kieszonkowego odrzucone'
            : 'Your Allowance invitation was declined',
        topic: allowanceTopic,
        action: allowance,
        details: () => [],
      };
    case 'allowance_transfer_failed':
      return {
        lead: pl
          ? 'Nie udało się zapisać kieszonkowego'
          : 'Allowance could not be recorded',
        paragraph: pl
          ? 'Zaplanowane kieszonkowe nie zostało zapisane. Sprawdź szczegóły w module Kieszonkowe.'
          : 'A scheduled allowance could not be recorded. Check the details in the Allowance module.',
        subject: () =>
          pl
            ? 'Nie udało się zapisać kieszonkowego'
            : 'Allowance could not be recorded',
        topic: allowanceTopic,
        action: allowance,
        details: () => [],
      };
    case 'exchange_rates_sync_failed':
      return {
        lead: pl
          ? 'Synchronizacja kursów walut nie powiodła się'
          : 'Exchange rates sync failed',
        paragraph: pl
          ? 'Automatyczne pobieranie kursów walut zakończyło się błędem. Sprawdź panel administratora.'
          : 'The automatic exchange rate download failed. Check the admin panel.',
        subject: () =>
          pl
            ? 'Synchronizacja kursów walut nie powiodła się'
            : 'Exchange rates sync failed',
        topic: pl
          ? 'o błędach synchronizacji kursów walut'
          : 'about exchange rate sync failures',
        action: {
          label: pl ? 'Otwórz panel' : 'Open admin panel',
          url: `${APP_ORIGIN}/admin`,
        },
        details: () => [],
      };
    default:
      return {
        lead: pl ? 'Nowe powiadomienie' : 'New notification',
        paragraph: pl
          ? 'Masz nowe powiadomienie w Spendist.'
          : 'You have a new notification in Spendist.',
        subject: () => (pl ? 'Nowe powiadomienie' : 'New notification'),
        topic: pl ? 'ze Spendist' : 'from Spendist',
        action: dashboard,
        details: () => [],
      };
  }
}

function notificationContent(
  data: EmailTemplateData,
  language: Language
): EmailContent {
  const copy = notificationCopy(data.type ?? '', language);
  const name = data.description?.trim() || null;
  const details: EmailDetail[] = [];

  for (const item of copy.details(data)) {
    if (item) details.push(item);
  }

  return {
    subject: copy.subject(name),
    preheader: name ? `${copy.lead}: ${name}` : copy.lead,
    lead: copy.lead,
    paragraphs: [copy.paragraph],
    details,
    code: null,
    action: copy.action,
    notes: [],
    optOutTopic: copy.topic,
    automated: false,
  };
}

function detail(
  label: string,
  value: string | null | undefined
): EmailDetail | null {
  const trimmed = value?.trim();

  return trimmed ? { label, value: trimmed, tone: 'plain' } : null;
}

function amountDetail(
  data: EmailTemplateData,
  language: Language,
  direction: string | undefined
): EmailDetail | null {
  const formatted = formatAmount(
    data.amount,
    data.currency,
    direction,
    language
  );

  if (!formatted) return null;

  return {
    label: language === 'pl' ? 'Kwota' : 'Amount',
    value: formatted,
    tone:
      direction === 'income'
        ? 'income'
        : direction === 'expense'
        ? 'expense'
        : 'plain',
  };
}

function locale(language: Language): string {
  return language === 'pl' ? 'pl-PL' : 'en-GB';
}

export function formatAmount(
  amount: string | undefined,
  currency: string | undefined,
  direction: string | undefined,
  language: Language
): string | null {
  const value = Number(amount);

  if (amount === undefined || amount.trim() === '' || !Number.isFinite(value))
    return null;

  const signed =
    direction === 'expense'
      ? -Math.abs(value)
      : direction === 'income'
      ? Math.abs(value)
      : value;

  const code = currency?.trim().toUpperCase() ?? '';

  try {
    return new Intl.NumberFormat(locale(language), {
      style: 'currency',
      currency: code,
      signDisplay: direction === 'income' ? 'exceptZero' : 'auto',
    }).format(signed);
  } catch {
    const number = new Intl.NumberFormat(locale(language), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: direction === 'income' ? 'exceptZero' : 'auto',
    }).format(signed);

    return code ? `${number} ${code}` : number;
  }
}

function directionLabel(
  direction: string | undefined,
  language: Language
): string | null {
  if (direction === 'expense') return language === 'pl' ? 'Wydatek' : 'Expense';

  if (direction === 'income') return language === 'pl' ? 'Przychód' : 'Income';

  return null;
}

export function formatDateTime(
  value: string | undefined,
  timezone: string | undefined,
  language: Language
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const format = (timeZone: string) =>
    new Intl.DateTimeFormat(locale(language), {
      dateStyle: 'long',
      timeZone,
    }).format(date);

  try {
    return format(timezone || 'Europe/Warsaw');
  } catch {
    return format('Europe/Warsaw');
  }
}

function formatDate(
  value: string | undefined,
  language: Language
): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;

  return formatDateTime(`${value.slice(0, 10)}T12:00:00Z`, 'UTC', language);
}

// Recurring schedules are UTC cron strings from the recurring payment form.
export function frequencyLabel(
  schedule: string | undefined,
  language: Language
): string | null {
  const parts = schedule?.trim().split(/\s+/) ?? [];

  if (parts.length !== 5 || parts[3] !== '*') return null;

  const [, , dayOfMonth, , dayOfWeek] = parts;
  const pl = language === 'pl';

  if (dayOfMonth === '*' && dayOfWeek === '*')
    return pl ? 'Codziennie' : 'Daily';

  if (dayOfMonth === '*') return pl ? 'Co tydzień' : 'Weekly';

  if (dayOfWeek === '*') return pl ? 'Co miesiąc' : 'Monthly';

  return null;
}

function safeLink(link: string | undefined): string {
  const url = new URL(link ?? '');

  if (url.protocol !== 'https:') throw new Error('Unsafe email link');

  return url.toString();
}

function appLink(link: string | undefined): string {
  const url = safeLink(link);

  if (new URL(url).origin !== APP_ORIGIN) throw new Error('Unsafe email link');

  return url;
}

// Control characters would break lines and bidirectional overrides can disguise
// text, so neither survives into user-provided values.
function sanitizeData(data: EmailTemplateData): EmailTemplateData {
  const clean = (value: string | undefined) =>
    value
      ?.replace(/\p{Cc}/gu, ' ')
      .replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

  return Object.fromEntries(
    Object.entries(data).map(([key, value]: [string, string | undefined]) => [
      key,
      clean(value),
    ])
  );
}

function singleLine(value: string, max: number): string {
  const line = value.replace(/\s+/g, ' ').trim();

  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(content: EmailContent, language: Language): string {
  const common = COMMON[language];

  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${
      COLORS.text
    };">${escapeHtml(text)}</p>`;

  const details = content.details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-collapse:separate;background-color:${
        COLORS.panel
      };border:1px solid ${COLORS.border};border-radius:12px;">
${content.details
  .map(
    (item, index) => `<tr>
<td style="padding:12px 16px;${
      index ? `border-top:1px solid ${COLORS.border};` : ''
    }font-size:14px;line-height:20px;color:${
      COLORS.muted
    };" valign="top">${escapeHtml(item.label)}</td>
<td align="right" style="padding:12px 16px;${
      index ? `border-top:1px solid ${COLORS.border};` : ''
    }font-size:14px;line-height:20px;font-weight:600;color:${toneColor(
      item.tone
    )};word-break:break-word;">${escapeHtml(item.value)}</td>
</tr>`
  )
  .join('\n')}
</table>`
    : '';

  const code = content.code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td align="center" style="padding:20px;background-color:${
        COLORS.panel
      };border:1px solid ${
        COLORS.border
      };border-radius:12px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;line-height:40px;font-weight:700;letter-spacing:8px;color:${
        COLORS.text
      };">${escapeHtml(content.code)}</td></tr>
</table>`
    : '';

  const action = content.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td align="center" bgcolor="${
        COLORS.primary
      }" style="border-radius:10px;background-color:${COLORS.primary};">
<a href="${escapeHtml(
        content.action.url
      )}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:${
        COLORS.primaryContent
      };text-decoration:none;border-radius:10px;">${escapeHtml(
        content.action.label
      )}</a>
</td></tr>
</table>`
    : '';

  const fallback =
    content.action && content.automated
      ? `<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${
          COLORS.muted
        };">${escapeHtml(common.fallbackLink)}<br><a href="${escapeHtml(
          content.action.url
        )}" target="_blank" style="color:${
          COLORS.primaryContent
        };word-break:break-all;">${escapeHtml(content.action.url)}</a></p>`
      : '';

  const notes = content.notes
    .map(
      (note) =>
        `<p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${
          COLORS.muted
        };">${escapeHtml(note)}</p>`
    )
    .join('\n');

  const optOut = content.optOutTopic
    ? `<p style="margin:0 0 12px;">${escapeHtml(
        common.optOut(content.optOutTopic)
      )}<br><a href="${SETTINGS_URL}" target="_blank" style="color:${
        COLORS.muted
      };text-decoration:underline;">${escapeHtml(common.optOutLink)}</a></p>`
    : '';

  const automated = content.automated
    ? `<p style="margin:0 0 12px;">${escapeHtml(common.automated)}</p>`
    : '';

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${
    COLORS.page
  };-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
    content.preheader
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${
    COLORS.page
  }" style="background-color:${COLORS.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:${FONT};">
<tr><td style="background-color:${COLORS.card};border:1px solid ${
    COLORS.border
  };border-radius:16px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td height="6" bgcolor="${
    COLORS.primary
  }" style="height:6px;line-height:6px;font-size:0;background-color:${
    COLORS.primary
  };background-image:linear-gradient(90deg,${COLORS.primaryLight},${
    COLORS.primary
  });">&nbsp;</td></tr>
<tr><td style="padding:28px 32px 8px;">
<a href="${APP_ORIGIN}" target="_blank" style="text-decoration:none;"><img src="${EMAIL_LOGO_URL}" width="139" height="32" alt="Spendist" style="display:block;border:0;outline:none;height:32px;width:139px;"></a>
</td></tr>
<tr><td style="padding:24px 32px 8px;">
<p style="margin:0 0 8px;font-size:16px;line-height:24px;color:${
    COLORS.muted
  };">${escapeHtml(common.greeting)}</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:${
    COLORS.text
  };">${escapeHtml(content.lead)}</h1>
${content.paragraphs.map(paragraph).join('\n')}
${details}
${code}
${action}
${fallback}
${notes}
<p style="margin:24px 0 32px;font-size:16px;line-height:24px;color:${
    COLORS.text
  };">${escapeHtml(common.signOff)}<br><strong>${escapeHtml(
    common.team
  )}</strong></p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:24px 16px 0;font-size:12px;line-height:18px;color:${
    COLORS.muted
  };text-align:center;">
${optOut}
${automated}
<p style="margin:0;">${escapeHtml(
    common.tagline
  )}<br><a href="${APP_ORIGIN}" target="_blank" style="color:${
    COLORS.muted
  };">spendist.app</a> · <a href="${
    common.privacyUrl
  }" target="_blank" style="color:${COLORS.muted};">${escapeHtml(
    common.privacy
  )}</a> · <a href="${common.termsUrl}" target="_blank" style="color:${
    COLORS.muted
  };">${escapeHtml(common.terms)}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function toneColor(tone: EmailDetail['tone']): string {
  if (tone === 'income') return COLORS.income;

  if (tone === 'expense') return COLORS.expense;

  return COLORS.text;
}

function renderText(content: EmailContent, language: Language): string {
  const common = COMMON[language];

  const blocks: string[] = [
    common.greeting,
    content.lead,
    ...content.paragraphs,
  ];

  if (content.details.length)
    blocks.push(
      content.details.map((item) => `${item.label}: ${item.value}`).join('\n')
    );

  if (content.code) blocks.push(content.code);

  if (content.action)
    blocks.push(`${content.action.label}: ${content.action.url}`);

  if (content.notes.length) blocks.push(content.notes.join('\n'));

  blocks.push(`${common.signOff}\n${common.team}`);

  const footer: string[] = [];

  if (content.optOutTopic)
    footer.push(
      `${common.optOut(content.optOutTopic)}\n${
        common.optOutLink
      }: ${SETTINGS_URL}`
    );

  if (content.automated) footer.push(common.automated);

  footer.push(`${common.tagline}\n${APP_ORIGIN}`);

  return `${blocks.join('\n\n')}\n\n--\n${footer.join('\n\n')}\n`;
}
