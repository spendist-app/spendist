// Renders every email template with sample data into tmp/email-preview/ for review in a browser.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  EMAIL_LOGO_URL,
  renderEmail,
} from '../../supabase/functions/_shared/email-templates.mts';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const outputRoot = resolve(workspaceRoot, 'tmp/email-preview');

// The production logo URL works only after deployment; previews use the local file.
const localLogo = pathToFileURL(
  resolve(workspaceRoot, 'apps/web/public/brand/email/spendist-logo-email.png')
).href;

const verifyLink =
  'https://example.supabase.co/auth/v1/verify?token=preview&type=signup&redirect_to=https%3A%2F%2Fspendist.app%2Fauth%2Fconfirm';

const samples = [
  ['auth-signup', 'auth.signup', { link: verifyLink }],
  ['auth-signup-existing', 'auth.signup_existing', {}],
  ['auth-recovery', 'auth.recovery', { link: verifyLink }],
  ['auth-magiclink', 'auth.magiclink', { link: verifyLink }],
  ['auth-invite', 'auth.invite', { link: verifyLink }],
  [
    'auth-email-change',
    'auth.email_change',
    { link: verifyLink, new_email: 'nowy@example.com' },
  ],
  ['auth-reauthentication', 'auth.reauthentication', { code: '482913' }],
  [
    'invitation',
    'invitation',
    {
      link: 'https://spendist.app/allowance/invite#token=preview',
      inviter_name: 'Milena',
    },
  ],
  [
    'notification-recurring-created',
    'notification',
    {
      type: 'recurring_transaction_created',
      timezone: 'Europe/Warsaw',
      description: 'Netflix',
      amount: '43.00',
      currency: 'PLN',
      direction: 'expense',
      occurred_at: '2026-10-26T11:00:00+00:00',
      wallet: 'Konto główne',
      category: 'Rozrywka',
      schedule: '0 11 26 * *',
    },
  ],
  [
    'notification-recurring-ended',
    'notification',
    {
      type: 'recurring_transaction_ended',
      description: 'Siłownia',
      end_date: '2026-10-31',
      wallet: 'Konto główne',
      category: 'Sport',
    },
  ],
  [
    'notification-allowance-received',
    'notification',
    {
      type: 'allowance_received',
      timezone: 'Europe/Warsaw',
      description: 'Kieszonkowe tygodniowe',
      amount: '50',
      currency: 'PLN',
      occurred_at: '2026-10-26T08:00:00+00:00',
    },
  ],
  [
    'notification-allowance-expense',
    'notification',
    {
      type: 'allowance_expense_added',
      timezone: 'Europe/Warsaw',
      payer_name: 'Milena',
      description: 'Bilet do kina',
      amount: '28.5',
      currency: 'PLN',
      occurred_at: '2026-10-25T16:30:00+00:00',
    },
  ],
  [
    'notification-allowance-accepted',
    'notification',
    { type: 'allowance_invitation_accepted', recipient_name: 'Ola' },
  ],
  [
    'notification-exchange-rates',
    'notification',
    { type: 'exchange_rates_sync_failed' },
  ],
];

await mkdir(outputRoot, { recursive: true });

const links = [];

for (const [name, template, data] of samples) {
  for (const language of ['pl', 'en']) {
    const email = renderEmail(template, { ...data, language });
    const file = `${name}.${language}`;

    await writeFile(
      resolve(outputRoot, `${file}.html`),
      email.html.replaceAll(EMAIL_LOGO_URL, localLogo)
    );

    await writeFile(
      resolve(outputRoot, `${file}.txt`),
      `Subject: ${email.subject}\n\n${email.text}`
    );

    links.push(
      `<li><a href="${file}.html">${file}</a> — ${email.subject} (<a href="${file}.txt">txt</a>)</li>`
    );
  }
}

await writeFile(
  resolve(outputRoot, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Spendist email preview</title><ul>${links.join(
    ''
  )}</ul>`
);

console.log(`Email previews written to ${outputRoot}/index.html`);
