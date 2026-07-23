# Authentication and account security

## What it does

Spendist uses Supabase email/password authentication. A person can sign up, sign in, sign out, request a password-reset email, complete password recovery from a link, and change their password while authenticated.

Sign-up records profile information such as username, full name, timezone, language, default currency, and optional avatar URL. The application seeds default categories after an initial or newly signed-in session.

## Routes and limits

- `/login` and `/signup` redirect an authenticated user away from the authentication screen.
- `/forgot-password` requests a reset email.
- `/reset-password` establishes a Supabase recovery session from URL parameters or fragment data before allowing a new password.
- Product routes require an authenticated session.
- Password recovery is an account utility, not an indexable marketing page.

Financial records and notifications remain user-scoped through backend access controls.

