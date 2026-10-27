import assert from 'node:assert/strict';
import test from 'node:test';
import { authMessages, deliveryResult, senderFor } from './email-policy.mts';

test('network failures and unknown errors never retry automatically', () => {
  for (const error of [
    'TimeoutError',
    'NetworkingError',
    'InternalServerError',
    '',
  ]) {
    assert.equal(deliveryResult(error), 'unknown');
  }

  assert.equal(deliveryResult('TooManyRequestsException'), 'throttled');
  assert.equal(deliveryResult('MessageRejected'), 'rejected');
});

test('system sender is separated from invitation and notification sender', () => {
  assert.equal(senderFor('auth'), 'Spendist Team <noreply@spendist.app>');
  assert.equal(senderFor('invitation'), 'Spendist Team <hello@spendist.app>');
  assert.equal(senderFor('notification'), 'Spendist Team <hello@spendist.app>');
});

test('secure email change maps old and new token hashes correctly', () => {
  const messages = authMessages(
    'email_change',
    'old@example.test',
    'new@example.test',
    'new-address-hash',
    'old-address-hash',
    '',
    'https://spendist.app',
    'https://example.supabase.co',
    'en'
  );

  assert.equal(messages.length, 2);
  assert.equal(messages[0].recipient, 'old@example.test');
  assert.match(messages[0].body, /token=old-address-hash/);
  assert.equal(messages[1].recipient, 'new@example.test');
  assert.match(messages[1].body, /token=new-address-hash/);
});

test('recovery links use the configured app origin and dedicated reset route', () => {
  const [message] = authMessages(
    'recovery',
    'user@example.test',
    undefined,
    'safe-hash',
    undefined,
    undefined,
    'https://spendist.app',
    'https://example.supabase.co',
    'pl'
  );

  assert.match(
    message.body,
    /redirect_to=https%3A%2F%2Fspendist.app%2Freset-password/
  );
  assert.throws(() =>
    authMessages(
      'signup',
      'user@example.test',
      undefined,
      'hash',
      undefined,
      undefined,
      'https://attacker.test',
      'https://example.supabase.co',
      'en'
    )
  );
});

test('unsupported actions fail closed and reauthentication uses a validated code', () => {
  assert.throws(() =>
    authMessages(
      'unknown',
      'user@example.test',
      undefined,
      'hash',
      undefined,
      undefined,
      'https://spendist.app',
      'https://example.supabase.co',
      'en'
    )
  );

  const [message] = authMessages(
    'reauthentication',
    'user@example.test',
    undefined,
    '',
    undefined,
    '123456',
    'https://spendist.app',
    'https://example.supabase.co',
    'en'
  );

  assert.equal(message.subject, 'Your Spendist verification code');
  assert.match(message.body, /\n123456\n/);
  assert.equal(message.template, 'auth.reauthentication');
  assert.deepEqual(message.template_data, { language: 'en', code: '123456' });
});

test('each auth action gets its own template, subject and fallback text', () => {
  const subjects = new Map([
    ['signup', 'Potwierdź rejestrację w Spendist'],
    ['recovery', 'Zresetuj hasło do Spendist'],
    ['magiclink', 'Twój link logowania do Spendist'],
    ['invite', 'Zaproszenie do Spendist'],
  ]);

  for (const [action, subject] of subjects) {
    const [message] = authMessages(
      action,
      'user@example.test',
      undefined,
      'hash',
      undefined,
      undefined,
      'https://spendist.app',
      'https://example.supabase.co',
      'pl'
    );

    assert.equal(message.subject, subject);
    assert.equal(message.template, 'auth.' + action);
    assert.equal(message.template_data.language, 'pl');
    assert.match(message.template_data.link ?? '', /token=hash/);
    assert.match(message.body, /Zespół Spendist/);
    assert.ok(message.body.length <= 10000);
  }
});
