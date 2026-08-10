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
entry. The source step has separate upload and pasted-CSV tabs, not a manual
format selector. Its single upload surface accepts the same Spendist CSV schema
used in Settings and Biedronka e-receipt JSON files, detects their format from
the content, and validates them immediately. Pasted Spendist CSV is validated
automatically after input. An adapter registry owns format detection and parsing
so another format can be added without changing the import modal's workflow.

The source status identifies the detected format, file name, validation result,
and transaction count. Unsupported content is reported as an unknown format.
The review action remains unavailable until the batch is valid, an existing
wallet is selected, and Biedronka imports have a common category. An optional
place can also be applied to every Biedronka item before review.

The pasted-CSV tab can prepare a provider-neutral AI prompt for expense
documents. The prompt contains the user's category paths, tag names, and wallet
names with currencies, but never identifiers, balances, transaction history, or
profile data. Spendist only copies the prompt locally: the user chooses an
external AI chat, supplies one receipt, invoice, order screenshot, or purchase
email, and returns the generated CSV to the normal validator. No document or
catalog data is sent by Spendist, and there is no LLM API or token integration.

The prompt requires one existing wallet whose currency matches the document,
one existing category per gross line item, and expenses only. It also requires
the model to reconcile line amounts to the final payable total in minor currency
units. The model must ask for clarification instead of inventing missing data or
adding a balancing row when the document cannot be reconciled. Imported output
still opens the bulk review editor before saving.

Every import is limited to 500 transactions and opens the existing bulk editor
before saving. A Spendist CSV batch must use one wallet and one direction. The
wallet is matched to an existing wallet by name; unknown categories and tags
must be mapped to existing reference data or cleared in the review editor. This
quick flow never creates reference data. The CSV schema help lists all 17
columns and marks the required fields.

Each Biedronka sell line becomes one expense. Discounts immediately following a
sell line reduce that item's amount, while its quantity and unit price are kept
in the description. Receipt totals must match, and storno lines are rejected.
Signed payloads, receipt images, signatures, and payment/card details are
ignored and never stored.

Imports retain their source fingerprint and minimal metadata. Existing or
repeated fingerprints are skipped at save time and included in the completion
message. Spendist CSV also preserves base-currency, automatic, and recurring
schedule values unless its financial fields are edited, in which case the base
amount is recalculated for the selected wallet and date.
