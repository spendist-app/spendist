# Allowance

## What it does

Allowance (`Kieszonkowe` in Polish) connects a payer with one or more
recipients through an email invitation. The relationship is directional: one
person records an allowance expense and the recipient receives a matching
income entry.

An invitation can be accepted from an in-app notification or a single-use
email link. The recipient may already have a Spendist account or create one
with the invited email address. Either participant can disconnect. Disconnecting
keeps history and pauses future allowance schedules. The counterpart's email
address is shown only while the connection is active.

Invitations are created only through the email invitation path, which requires
a confirmed email address on the inviter's account and applies the shared email
rate limits. The inviter sees the invited address and status but not whether
the address belongs to an existing account. Sending, accepting and responding to
invitations require a first-party Spendist session; tokens issued to connected
apps (MCP OAuth clients) are rejected. Allowance and other amounts reject `NaN`
in the database.

When either participant deletes their Spendist account, the other participant
keeps the shared history as ordinary transactions and any Allowance schedules
become ordinary paused schedules.

## Preview visibility

Allowance is a preview module. The web application shows its navigation links and
route only to administrators (`public.profiles.is_admin`); other users are
redirected to `/dashboard`. An administrator can hide preview modules for
their own browser from `/admin`. This is a front-end visibility flag only: the
database, RLS, RPCs, MCP tools, and existing transactions are unchanged.

Related front-end surfaces follow the same flag: the transaction form target
and Allowance email-notification preferences. Invitation notifications and the
`/allowance/invite` link stay reachable so a pending invitation can still be
answered.

## Transactions and schedules

A manual allowance creates two ordinary Spendist transactions atomically. The
payer owns an expense and the recipient owns an income. The shared pair
identifier supplies the Allowance badge and keeps amount and currency in sync.
While the connection is active, the payer can change the amount or currency of
both entries or remove both entries. After a disconnect the payer can still edit
payer-only fields of their own expense, but cannot change the amount or
currency, and deleting removes only the payer's expense; the recipient keeps
their income. The recipient can organize local category, wallet, tags, place,
description, and date without exposing those choices.

A payer can also record a purchase directly on a recipient's account, for
example when a child pays for an item from their allowance while the payer is
signed in. This creates only an expense owned by the recipient, so it never
appears in the payer's transaction list, balances, or analysis. Spendist uses
the recipient's current default wallet and a localized system expense category
named `Allowance spending` (`Wydatki z kieszonkowego` in Polish), then notifies
the recipient. The category joins the recipient's starter `Lifestyle` (`Styl
życia`) group; a separate `Expenses` (`Wydatki`) group is created only when that
group does not exist. Allowance income uses the starter `Income` (`Przychody`)
group.

While the connection remains active, the payer can review, edit, and delete
expenses they created this way from the Allowance module. The recipient can
also manage the transaction as an ordinary expense. Disconnecting preserves
the transaction but removes the payer's access to it.

Allowance schedules reuse recurring payments, including daily, weekly, monthly,
fixed, and variable amount behavior. They remain visible in Recurring payments
with an Allowance badge. Editing a schedule affects future occurrences only.

The recipient side uses the current default wallet and a localized
Allowance/Kieszonkowe income category. Different wallet currencies use the
existing Spendist exchange-rate calculation.

## Privacy and security

Connections do not share balances, wallets, categories, or unrelated
transactions. RLS remains owner-scoped and every cross-owner write runs through
an atomic security-definer function. Email tokens are stored as hashes, expire
after seven days, and can be used once.

## Deployment

Invitations now use the shared transactional email queue through the `email_allowance_invite` RPC and revised Edge Function. Its runtime needs only Supabase public configuration; AWS sending permissions belong to the separate queue worker. See [email and administration](email-and-administration.md).

## Boundary

Allowance records corresponding budget entries. Spendist does not move money,
initiate a bank payment, or verify that money changed hands.
