# Recurring payments

## What it does

Recurring payments model expected repeated income or expense, such as a subscription, salary, or bill. A record supports fixed or variable amount, direction, currency, wallet, category, tags, schedule, and optional end date.

Users can create, edit, delete, and filter recurring records by active, stopped, or all status. The module also exposes statistics, category/tag summaries, a monthly plan, and pending occurrences.

Variable-amount occurrences ask for an actual amount only while their recurring record is active. Stopping a record hides its outstanding amount prompts, including a prompt reopened after its posted transaction is deleted. Resuming the record makes still-unposted occurrences available again.

## Automatic transaction creation

Supabase-native scheduled work evaluates due occurrences and creates ordinary Spendist transaction records. Those records are marked automatic and appear in transactions and the dashboard's recurring widget. Related activity can appear as notifications.

Creating a recurring payment whose start and end dates are both in the past backfills every scheduled occurrence within that historical range. Spendist finalizes the recurring record only after those due transactions have been processed. Repeated processing is idempotent and does not create another transaction for an already recorded occurrence.

## Boundary

This feature tracks a planned or completed record inside Spendist. It does not pay an invoice, access a bank account, or move money in the real world.
