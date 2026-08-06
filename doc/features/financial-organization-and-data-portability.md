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

## Quick transaction import and review

The Transactions page offers a browser-only import flow beside single and bulk
entry. It supports the same Spendist CSV schema used in Settings, either from a
file or pasted text, and Biedronka e-receipt JSON files. An adapter registry owns
format detection and parsing so another format can be added without changing
the import modal's workflow.

Every import is limited to 500 transactions and opens the existing bulk editor
before saving. A Spendist CSV batch must use one wallet and one direction. The
wallet is matched to an existing wallet by name; unknown categories and tags
must be mapped to existing reference data or cleared in the review editor. This
quick flow never creates reference data. The CSV schema help lists all 17
columns and marks the required fields.

Each Biedronka sell line becomes one expense. Discounts immediately following a
sell line reduce that item's amount, while its quantity and unit price are kept
in the description. A wallet and category are required before review, and a
place is optional. Receipt totals must match, and storno lines are rejected.
Signed payloads, receipt images, signatures, and payment/card details are
ignored and never stored.

Imports retain their source fingerprint and minimal metadata. Existing or
repeated fingerprints are skipped at save time and included in the completion
message. Spendist CSV also preserves base-currency, automatic, and recurring
schedule values unless its financial fields are edited, in which case the base
amount is recalculated for the selected wallet and date.
