create or replace function public.monthly_recurring_transaction_summary(p_wallet_id uuid default null)
returns table (
  month_start date,
  income_total numeric,
  expense_total numeric,
  transaction_count bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    date_trunc('month', t.occurred_at)::date as month_start,
    coalesce(sum(case when t.direction = 'income' then t.amount_in_default else 0 end), 0::numeric) as income_total,
    coalesce(sum(case when t.direction = 'expense' then t.amount_in_default else 0 end), 0::numeric) as expense_total,
    count(t.id) as transaction_count
  from public.transactions t
  where t.owner_id = auth.uid()
    and (p_wallet_id is null or t.wallet_id = p_wallet_id)
    and t.recurring_transaction_id is not null
  group by date_trunc('month', t.occurred_at)::date
  order by month_start desc;
$$;

comment on function public.monthly_recurring_transaction_summary(uuid)
  is 'Returns monthly counts and totals for transactions generated from recurring payments for the authenticated user (optionally scoped to a wallet).';

grant execute on function public.monthly_recurring_transaction_summary(uuid)
  to authenticated, service_role;
