# Authentication and account security

## What it does

Spendist uses Supabase email/password authentication. A person can sign up, sign in, sign out, request a password-reset email, complete password recovery from a link, change their password while authenticated, and permanently delete their account.

Sign-up records profile information such as username, full name, timezone, language, default currency, and optional avatar URL. The application seeds default categories after an initial or newly signed-in session. When sign-up returns an authenticated session, navigation waits for that seed attempt to finish, and concurrent authentication events reuse the same in-flight operation instead of creating the hierarchy twice.

## Routes and limits

- `/login` and `/signup` redirect an authenticated user away from the authentication screen.
- `/forgot-password` requests a reset email.
- `/reset-password` establishes a Supabase recovery session from URL parameters or fragment data before allowing a new password.
- Product routes require an authenticated session.
- Password recovery is an account utility, not an indexable marketing page.

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
