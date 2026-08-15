# Authentication and account security

## What it does

Spendist uses Supabase email/password authentication. A person can sign up, confirm their email, sign in, sign out, request a password-reset email, complete password recovery from a link, change their password while authenticated, and permanently delete their account.

Sign-up records profile information such as username, full name, timezone, language, default currency, and optional avatar URL. When email confirmation is required, the form becomes a clear check-email state that shows the submitted address, reminds the user to check spam, and can resend the confirmation email. The response does not reveal whether another account already owns the address.

The confirmation callback accepts Supabase PKCE codes, implicit access/refresh tokens, and supported signup token hashes. It immediately removes credentials from the visible browser URL, rejects missing, failed, expired, reused, and unsupported callbacks, then establishes the session and signs the user in for that confirmation visit. A successful callback navigates to the original safe local `returnUrl`, or `/dashboard`, and displays a dismissible global success notice. External and protocol-relative return URLs are never followed.

The application seeds default categories after an initial or newly signed-in session. Confirmation navigation waits for that seed attempt to finish, and concurrent authentication events reuse the same in-flight operation instead of creating the hierarchy twice.

## Routes and limits

- `/login` and `/signup` redirect an authenticated user away from the authentication screen.
- `/forgot-password` requests a reset email.
- `/reset-password` establishes a Supabase recovery session from URL parameters or fragment data before allowing a new password.
- `/auth/confirm` is the non-indexable email-confirmation callback. Direct visits without valid one-time credentials show recovery actions instead of reporting success.
- Product routes require an authenticated session.
- Password recovery is an account utility, not an indexable marketing page.
- Email confirmation requires the callback URL to be allowed in the hosted Supabase project's Auth URL configuration. Local development enables confirmations and routes messages to Mailpit.

Financial records and notifications remain user-scoped through backend access controls.

## Account deletion

Password change and the account-deletion danger zone are visible directly in
the profile section of `/settings`; they are not hidden behind a separate
security toggle. Account deletion remains a two-step operation. It is permanent
and requires all of the following:

- the authenticated session;
- the account's current password;
- typing `DELETE` exactly;
- explicit acknowledgement that the data cannot be recovered.

The browser calls the `delete-account` Supabase Edge Function. The function
validates the bearer token, reauthenticates the same user with the supplied
password, deletes avatar objects under that user's Storage folder, and then
permanently deletes the Supabase Auth user. Database foreign keys cascade from
the Auth user through the profile to financial records; notifications also
cascade from the Auth user. The local session is cleared and the user returns to
the public landing page after success.

The function never accepts a user ID from the browser and never exposes its
service-role credential. If password verification, avatar cleanup, or Auth
deletion fails, the UI reports failure instead of claiming that the account was
deleted.

## Deliberate limits

- There is no recovery window or soft-delete period.
- Spendist does not automatically export data during deletion. Users should use
  the CSV export before confirming if they want to retain transaction history.
- Account deletion applies only to the currently authenticated user.
