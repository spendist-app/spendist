# Transactions

## What it does

Transactions are Spendist's core financial records. A transaction is income or expense with date, amount, currency, description, wallet, category, and optional tags and place. Automatic transactions created by a recurring payment are marked automatic and can retain their scheduled occurrence date.

Users can create, edit, duplicate, and delete individual records. Bulk entry can add multiple transactions from pasted rows. Clipboard table parsing is enabled by default and splits tab-, comma-, or semicolon-delimited data into columns. Users can turn it off per bulk-entry session to paste the complete clipboard text into the focused field.

## Browsing and analysis

The transaction page supports search, category and tag multi-select filters, place and amount filters, exact date ranges, period presets (current/previous month and year), and sorting by date, amount, or description. With no category restriction, every category checkbox is shown as selected. Clicking a category activates only that category; further clicks can build a multi-category selection without implicitly adding descendants. Selecting a group includes all categories in that group, and group checkboxes show a partial state when only some categories are selected. Clearing the category filter restores the all-selected state. Empty categories can be hidden with a pressed filter button.

The complete browsing state is shareable and restorable from `/transactions` query parameters: `category`, `tag`, `place`, `q`, `min`, `max`, `from`, `to`, `period=all`, `sort`, `panel`, `hideEmpty`, and `advanced`. A bare route is replaced with the exact current-month range. Invalid owned values are canonicalized while unrelated query parameters are preserved. Discrete filter changes add browser history entries; search is debounced for 300 ms and view-only panel controls replace the current entry. Browser Back and Forward apply the restored filter set atomically.

Matching records load incrementally and the sidebar shows category/tag spending context. Money formatting follows the active application language.

The local AI prompt helper asks an external chat for CSV content in one copyable code block, not for a downloadable file. Its `tags` values may come only from the filtered saved-tag catalog; category names, category paths, category groups, merchants, and places are explicitly excluded from tags. Because the CSV schema has no quantity column, a document line with multiple units must expand to one transaction per physical unit at the unit price. Indexed descriptions such as `[1/2]` and `[2/2]` make the units clearer, while minor-unit remainder allocation preserves the exact line total. Identical rows within one new CSV are intentionally all imported. Duplicate detection compares fingerprint counts with earlier imports: a full re-import skips every row, while a previously partial import adds only the missing copies.

## Currencies and boundary

Transactions preserve their source-currency amount. Where conversion is needed, Spendist uses stored exchange-rate data for a default-currency amount and can fall back to the latest earlier rate for a date gap such as a weekend.

The feature records and analyses spending; it never sends a payment or imports a live bank feed.
