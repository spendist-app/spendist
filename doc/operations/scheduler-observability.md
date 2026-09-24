# Scheduler observability retention

Spendist runs scheduled database work with `pg_cron`. Calls to scheduled Edge Functions use `pg_net` and secrets stored in Supabase Vault.

## Diagnostic data

- `cron.job_run_details` records every `pg_cron` execution and its status. `pg_cron` does not remove this history automatically.
- `net._http_response` temporarily stores responses from asynchronous `pg_net` requests. The Supabase default TTL is six hours.
- `public.exchange_rate_sync_runs` is the small application-level history of exchange-rate synchronization, not a transport log.

These relations contain operational diagnostics. They are separate from user-owned transactions, recurring-payment definitions, wallets, notifications, mortgage data, and other financial records.

## Retention

The `spendist-purge-scheduler-observability-daily` job runs daily at `03:17` GMT/UTC. It keeps seven days of completed `pg_cron` run history and removes any `pg_net` response older than 24 hours as a fallback behind the extension's shorter native TTL.

The centralized `spendist-process-recurring-payments-every-5-minutes` job owns automatic recurring-payment processing. Legacy per-record `recurring-<uuid>` jobs and their synchronization triggers are removed; `recurring_transactions.cron_job_id` remains a compatibility column but is cleared and no longer drives execution.

Retention does not remove scheduler definitions, running jobs, exchange-rate synchronization history, or application and user data.

## Verification

Inspect the active cleanup job:

```sql
select jobname, schedule, active, command
from cron.job
where jobname = 'spendist-purge-scheduler-observability-daily';
```

Inspect bounded diagnostic ranges without reading response bodies:

```sql
select count(*), min(start_time), max(start_time)
from cron.job_run_details;

select count(*), min(created), max(created)
from net._http_response;
```
