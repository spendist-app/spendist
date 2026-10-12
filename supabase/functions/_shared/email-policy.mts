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

export function senderFor(kind: string): string {
  return kind === 'auth' ? 'noreply@spendist.app' : 'hello@spendist.app';
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
  language: string
) {
  const allowed = [
    'signup',
    'recovery',
    'magiclink',
    'invite',
    'email_change',
    'reauthentication',
  ];

  if (!allowed.includes(action))
    throw new Error('Unsupported authentication email');

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

  const subject =
    language === 'pl'
      ? 'Spendist: potwierdź operację na koncie'
      : 'Spendist: confirm your account request';

  const message = (recipient: string, tokenHash: string) => ({
    recipient,
    kind: 'auth',
    subject,
    body:
      language === 'pl'
        ? 'Potwierdź operację w Spendist: ' + link(tokenHash)
        : 'Confirm your Spendist request: ' + link(tokenHash),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  if (action === 'reauthentication') {
    if (!code || !/^\d{6,10}$/.test(code))
      throw new Error('Invalid authentication code');

    return [
      {
        ...message(email, hash),
        body:
          language === 'pl'
            ? 'Kod Spendist: ' + code
            : 'Spendist code: ' + code,
      },
    ];
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
