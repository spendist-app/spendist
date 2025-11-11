create or replace function public.available_transaction_months(p_wallet_id uuid default null)
returns table (
  month_start date
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select distinct date_trunc('month', t.occurred_at)::date as month_start
  from public.transactions t
  where t.owner_id = auth.uid()
    and (p_wallet_id is null or t.wallet_id = p_wallet_id)
  order by month_start desc;
$$;

comment on function public.available_transaction_months(uuid)
  is 'Lists all calendar months that contain at least one transaction for the authenticated user (optionally filtered by wallet).';

grant execute on function public.available_transaction_months(uuid)
  to authenticated, service_role;

create or replace function public.monthly_category_cashflow(
  p_month_start date,
  p_wallet_id uuid default null
)
returns table (
  month_start date,
  category_id uuid,
  category_name text,
  category_color text,
  category_icon text,
  direction public.transaction_direction,
  total_amount numeric,
  transaction_count bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with bounds as (
    select
      date_trunc('month', coalesce(p_month_start, now()))::date as start_date,
      (date_trunc('month', coalesce(p_month_start, now())) + interval '1 month')::date as end_date
  )
  select
    b.start_date as month_start,
    c.id as category_id,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    t.direction,
    coalesce(sum(t.amount_in_default), 0::numeric) as total_amount,
    count(t.id) as transaction_count
  from bounds b
  join public.transactions t
    on t.owner_id = auth.uid()
    and t.occurred_at >= b.start_date
    and t.occurred_at < b.end_date
    and (p_wallet_id is null or t.wallet_id = p_wallet_id)
  join public.categories c
    on c.id = t.category_id
    and c.owner_id = t.owner_id
  group by
    b.start_date,
    c.id,
    c.name,
    c.color,
    c.icon,
    t.direction
  order by
    t.direction desc,
    total_amount desc;
$$;

comment on function public.monthly_category_cashflow(date, uuid)
  is 'Summarises income and expense totals per category for the selected month for the authenticated user (optionally filtered by wallet).';

grant execute on function public.monthly_category_cashflow(date, uuid)
  to authenticated, service_role;
