# Transactions

## What it does

Transactions are Spendist's core financial records. A transaction is income or expense with date, amount, currency, description, wallet, category, and optional tags and place. Automatic transactions created by a recurring payment are marked automatic and can retain their scheduled occurrence date.

Users can create, edit, duplicate, and delete individual records. Bulk entry can add multiple transactions from pasted rows. Clipboard table parsing is enabled by default and splits tab-, comma-, or semicolon-delimited data into columns. Users can turn it off per bulk-entry session to paste the complete clipboard text into the focused field.

## Browsing and analysis

The transaction page supports search, filters, period presets (current/previous month and year), and sorting by date, amount, or description. It loads matching records incrementally and shows category/tag spending context. Money formatting follows the active application language.

## Currencies and boundary

Transactions preserve their source-currency amount. Where conversion is needed, Spendist uses stored exchange-rate data for a default-currency amount and can fall back to the latest earlier rate for a date gap such as a weekend.

The feature records and analyses spending; it never sends a payment or imports a live bank feed.
