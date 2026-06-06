create or replace function public.monthly_cashflow_summary(
  p_months integer default 12,
  p_wallet_id uuid default null
)
returns table (
  month_start date,
  income_total numeric,
  expense_total numeric
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with params as (
    select greatest(1, least(coalesce(p_months, 12), 12)) as month_limit
  ),
  ranked_months as (
    select
      date_trunc('month', t.occurred_at)::date as month_start,
      row_number() over (order by date_trunc('month', t.occurred_at)::date desc) as rn
    from public.transactions t
    where t.owner_id = auth.uid()
      and (p_wallet_id is null or t.wallet_id = p_wallet_id)
    group by date_trunc('month', t.occurred_at)
  ),
  limited_months as (
    select rm.month_start
    from ranked_months rm
    cross join params p
    where rm.rn <= p.month_limit
  ),
  aggregated as (
    select
      date_trunc('month', t.occurred_at)::date as month_start,
      coalesce(sum(case when t.direction = 'income' then t.amount_in_default else 0 end), 0::numeric) as income_total,
      coalesce(sum(case when t.direction = 'expense' then t.amount_in_default else 0 end), 0::numeric) as expense_total
    from public.transactions t
    where t.owner_id = auth.uid()
      and (p_wallet_id is null or t.wallet_id = p_wallet_id)
      and date_trunc('month', t.occurred_at)::date in (select month_start from limited_months)
    group by 1
  )
  select
    lm.month_start,
    coalesce(a.income_total, 0::numeric) as income_total,
    coalesce(a.expense_total, 0::numeric) as expense_total
  from limited_months lm
  left join aggregated a using (month_start)
  order by lm.month_start desc;
$$;

comment on function public.monthly_cashflow_summary(integer, uuid)
  is 'Returns up to 12 months of income and expense totals for the authenticated user (optionally scoped to a wallet).';

grant execute on function public.monthly_cashflow_summary(integer, uuid)
  to authenticated, service_role;
