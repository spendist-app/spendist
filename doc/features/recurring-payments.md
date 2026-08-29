# Recurring payments

## What it does

Recurring payments model expected repeated income or expense, such as a subscription, salary, or bill. A record supports fixed or variable amount, direction, currency, wallet, category, tags, schedule, and optional end date.

Users can create, edit, delete, and filter recurring records by active, stopped, or all status. The module also exposes statistics, category/tag summaries, a monthly plan, and pending occurrences.

## Automatic transaction creation

Supabase-native scheduled work evaluates due occurrences and creates ordinary Spendist transaction records. Those records are marked automatic and appear in transactions and the dashboard's recurring widget. Related activity can appear as notifications.

Creating a recurring payment whose start and end dates are both in the past backfills every scheduled occurrence within that historical range. Spendist finalizes the recurring record only after those due transactions have been processed. Repeated processing is idempotent and does not create another transaction for an already recorded occurrence.

## Boundary

This feature tracks a planned or completed record inside Spendist. It does not pay an invoice, access a bank account, or move money in the real world.
