import {
  renderEmail,
  type EmailTemplate,
  type EmailTemplateData,
} from './email-templates.mts';

export function deliveryResult(
  name: string
): 'throttled' | 'rejected' | 'unknown' {
  if (name === 'TooManyRequestsException' || name === 'ThrottlingException')
    return 'throttled';

  if (
    [
      'MessageRejected',
      'MessageRejectedException',
      'MailFromDomainNotVerifiedException',
      'AccountSuspendedException',
      'SendingPausedException',
      'BadRequestException',
      'AccessDeniedException',
      'NotFoundException',
    ].includes(name)
  )
    return 'rejected';

  // A network/server error can happen after SES accepts the message.
  return 'unknown';
}

// The display name replaces the bare mailbox name ("hello") in inbox lists.
// IAM ses:FromAddress conditions match the address part only.
export function senderFor(kind: string): string {
  return kind === 'auth'
    ? 'Spendist Team <noreply@spendist.app>'
    : 'Spendist Team <hello@spendist.app>';
}

// Metadata is writable by the user, so only a known language is trusted.
export function emailLanguage(value: string | undefined): 'pl' | 'en' {
  return value === 'pl' ? 'pl' : 'en';
}

// Supabase Auth keeps the first password when an unconfirmed address signs up
// again and only resends the confirmation. A fresh sign-up arrives seconds after
// the user row is created; anything older (or without a timestamp) is a repeat.
export function isRepeatSignup(
  createdAt: string | undefined,
  now: Date
): boolean {
  const created = createdAt ? Date.parse(createdAt) : Number.NaN;

  return !Number.isFinite(created) || now.getTime() - created > 120_000;
}

export function authMessages(
  action: string,
  email: string,
  newEmail: string | undefined,
  hash: string,
  oldHash: string | undefined,
  code: string | undefined,
  appUrl: string,
  supabaseUrl: string,
  language: string,
  repeatSignup: boolean
) {
  const template =
    action === 'signup' && repeatSignup
      ? 'auth.signup_existing'
      : authTemplate(action);

  const app = new URL(appUrl);

  if (app.protocol !== 'https:' || app.hostname !== 'spendist.app')
    throw new Error('Invalid application URL');

  const link = (tokenHash: string): string => {
    const url = new URL('/auth/v1/verify', supabaseUrl);
    url.searchParams.set('token', tokenHash);
    url.searchParams.set('type', action);
    url.searchParams.set(
      'redirect_to',
      app.origin + (action === 'recovery' ? '/reset-password' : '/auth/confirm')
    );

    return url.toString();
  };

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const queued = (recipient: string, data: EmailTemplateData) => {
    const rendered = renderEmail(template, data);

    return {
      recipient,
      kind: 'auth',
      subject: rendered.subject,
      body: rendered.text,
      template,
      template_data: data,
      expires_at: expiresAt,
    };
  };

  const message = (recipient: string, tokenHash: string) =>
    queued(recipient, {
      language,
      link: link(tokenHash),
      new_email: action === 'email_change' ? newEmail : undefined,
    });

  if (template === 'auth.signup_existing') return [queued(email, { language })];

  if (action === 'reauthentication') {
    if (!code || !/^\d{6,10}$/.test(code))
      throw new Error('Invalid authentication code');

    return [queued(email, { language, code })];
  }

  if (!hash) throw new Error('Missing authentication token');

  if (action === 'email_change') {
    if (!newEmail) throw new Error('Missing new email');

    // Supabase documents the reversed hash names for secure email changes.
    return oldHash
      ? [message(email, oldHash), message(newEmail, hash)]
      : [message(newEmail, hash)];
  }

  return [message(email, hash)];
}

function authTemplate(action: string): EmailTemplate {
  switch (action) {
    case 'signup':
      return 'auth.signup';
    case 'recovery':
      return 'auth.recovery';
    case 'magiclink':
      return 'auth.magiclink';
    case 'invite':
      return 'auth.invite';
    case 'email_change':
      return 'auth.email_change';
    case 'reauthentication':
      return 'auth.reauthentication';
    default:
      throw new Error('Unsupported authentication email');
  }
}
