# Financial organization and data portability

## Financial organization

Settings maintains the reference data used by transactions and recurring payments:

- an always-editable profile and avatar, with automatic saving for full name,
  language, and timezone;
- wallets, their currencies, and default status;
- category groups;
- nested categories, colors, and Heroicons;
- reusable tags.

## Kontomierz XLSX import

The Kontomierz flow imports a user-selected XLSX export into a chosen wallet. The file is parsed in the browser, then valid transactions, categories, and tags are saved. It is a migration path, not a continuous bank synchronisation.

## Spendist CSV export and import

Spendist CSV is a separate portable format. Users can export all or filtered transactions; a parent-category filter includes subcategories.

Before importing a Spendist CSV, the app reports valid transactions, duplicate candidates, missing groups/categories/wallets/tags, and file issues. Valid missing reference data can be created during import; duplicate transaction rows are skipped. The readable format includes date, description, direction, amount, currency, category path, wallet, tags, and automatic/recurring metadata.

Spendist CSV and Kontomierz import metadata stay separate.
