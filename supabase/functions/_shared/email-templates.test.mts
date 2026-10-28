import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMAIL_LOGO_URL,
  EMAIL_TEMPLATES,
  escapeHtml,
  formatAmount,
  frequencyLabel,
  renderEmail,
} from './email-templates.mts';

const verifyLink =
  'https://example.supabase.co/auth/v1/verify?token=hash&type=signup&redirect_to=https%3A%2F%2Fspendist.app%2Fauth%2Fconfirm';

test('signup email thanks the user and links the activation button', () => {
  const email = renderEmail('auth.signup', {
    language: 'pl',
    link: verifyLink,
  });

  assert.equal(email.subject, 'Potwierdź rejestrację w Spendist');
  assert.match(email.html, /Dziękujemy za rejestrację w Spendist/);
  assert.match(email.html, /Potwierdź adres e-mail<\/a>/);
  assert.ok(email.html.includes(`href="${escapeHtml(verifyLink)}"`));
  assert.ok(email.html.includes(EMAIL_LOGO_URL));
  assert.match(email.html, /Zespół Spendist/);
  assert.doesNotMatch(email.html, /settings#email-notifications/);
  assert.match(
    email.text,
    /Potwierdź adres e-mail: https:\/\/example\.supabase\.co/
  );
});

test('every template renders in both languages with a sign-off', () => {
  const data = {
    link: 'https://spendist.app/allowance/invite#token=abc',
    code: '123456',
    type: 'recurring_transaction_created',
  };

  for (const template of EMAIL_TEMPLATES) {
    const polish = renderEmail(template, { ...data, language: 'pl' });
    const english = renderEmail(template, { ...data, language: 'en' });

    assert.match(polish.html, /Zespół Spendist/, template);
    assert.match(english.html, /The Spendist team/, template);
    assert.match(polish.text, /Zespół Spendist/, template);
    assert.ok(polish.subject.length > 0 && !/[\r\n]/.test(polish.subject));
    assert.notEqual(polish.subject, english.subject, template);
  }
});

test('reauthentication shows the code without a button', () => {
  const email = renderEmail('auth.reauthentication', {
    language: 'en',
    code: '987654',
  });

  assert.equal(email.subject, 'Your Spendist verification code');
  assert.match(email.html, />987654<\/td>/);
  assert.doesNotMatch(email.html, /<a href="https:\/\/example/);
  assert.throws(() =>
    renderEmail('auth.reauthentication', { language: 'en', code: 'abc' })
  );
});

test('auth links must use https', () => {
  assert.throws(() =>
    renderEmail('auth.recovery', {
      language: 'en',
      link: 'javascript:alert(1)',
    })
  );
});

test('invitation links stay on the application origin', () => {
  const email = renderEmail('invitation', {
    language: 'pl',
    link: 'https://spendist.app/allowance/invite#token=abc',
    inviter_name: 'Ania',
  });

  assert.equal(email.subject, 'Zaproszenie do Kieszonkowego w Spendist');
  assert.match(email.html, /Ania zaprasza Cię do połączenia kont/);
  assert.match(email.html, /Zobacz zaproszenie<\/a>/);
  assert.throws(() =>
    renderEmail('invitation', {
      language: 'pl',
      link: 'https://evil.example/allowance/invite',
    })
  );
});

test('recurring notification lists payment details and an opt-out link', () => {
  const email = renderEmail('notification', {
    language: 'pl',
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
  });

  assert.equal(email.subject, 'Utworzono płatność cykliczną: Netflix');
  assert.match(email.html, /Witaj!/);
  assert.match(email.html, /Utworzono płatność cykliczną<\/h1>/);

  for (const value of [
    'Netflix',
    'Wydatek',
    '26 października 2026',
    'Konto główne',
    'Rozrywka',
    'Co miesiąc',
  ]) {
    assert.ok(email.html.includes(value), value);
    assert.ok(email.text.includes(value), value);
  }

  assert.match(email.text, /Kwota: -43,00\s?zł/);
  assert.ok(
    email.html.includes('https://spendist.app/settings#email-notifications')
  );
  assert.match(email.html, /o utworzonych płatnościach cyklicznych/);
  assert.match(
    email.text,
    /Wyłącz te powiadomienia w ustawieniach: https:\/\/spendist\.app\/settings#email-notifications/
  );
  assert.doesNotMatch(
    email.html,
    /recurring_transaction_id|[0-9a-f]{8}-[0-9a-f]{4}-/
  );
});

test('user-provided values are escaped in HTML and kept single-line in subjects', () => {
  const email = renderEmail('notification', {
    language: 'en',
    type: 'recurring_transaction_created',
    description: '<script>alert("x")</script>\nBcc: someone',
    wallet: 'A & B',
  });

  assert.doesNotMatch(email.html, /<script>/);
  assert.match(
    email.html,
    /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/
  );
  assert.match(email.html, /A &amp; B/);
  assert.doesNotMatch(email.subject, /[\r\n]/);
});

test('notification without details falls back to the type copy', () => {
  const email = renderEmail('notification', {
    language: 'en',
    type: 'allowance_invitation_declined',
  });

  assert.equal(email.subject, 'Your Allowance invitation was declined');
  assert.match(email.html, /from the Allowance module/);
});

test('amounts are signed by direction and tolerate unknown currencies', () => {
  assert.match(formatAmount('25', 'EUR', 'income', 'en') ?? '', /^\+€25\.00$/);
  assert.match(
    formatAmount('25', 'PLN', 'expense', 'pl') ?? '',
    /^-25,00\s?zł$/
  );
  assert.equal(formatAmount('25', 'XX1', undefined, 'en'), '25.00 XX1');
  assert.equal(formatAmount('abc', 'PLN', 'income', 'en'), null);
});

test('frequency labels cover recurring form schedules only', () => {
  assert.equal(frequencyLabel('30 6 * * *', 'pl'), 'Codziennie');
  assert.equal(frequencyLabel('0 12 * * 1', 'en'), 'Weekly');
  assert.equal(frequencyLabel('0 12 1 * *', 'pl'), 'Co miesiąc');
  assert.equal(frequencyLabel('0 12 1 6 *', 'pl'), null);
  assert.equal(frequencyLabel(undefined, 'pl'), null);
});

test('control and bidirectional characters are removed from user values', () => {
  const email = renderEmail('invitation', {
    language: 'en',
    link: 'https://spendist.app/allowance/invite#token=abc',
    inviter_name: 'Ann\u202Egnp.exe\nBcc: x\u0007',
  });

  assert.equal(email.subject, "You're invited to Spendist Allowance");

  for (const character of ['\u202E', '\u0007', '\n']) {
    assert.ok(!email.subject.includes(character));
    assert.ok(!(email.html + email.text).includes(character + 'Bcc'));
  }

  assert.ok(!(email.html + email.text).includes('\u202E'));
  assert.match(email.text, /Anngnp\.exe Bcc: x/);
});

test('repeated sign-up email points to password recovery without a token', () => {
  const email = renderEmail('auth.signup_existing', { language: 'en' });

  assert.equal(email.subject, 'Finish setting up your Spendist account');
  assert.ok(email.html.includes('href="https://spendist.app/forgot-password"'));
  assert.doesNotMatch(email.html, /token/);
});
