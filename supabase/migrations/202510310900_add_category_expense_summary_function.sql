create or replace function public.category_expense_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  group_id uuid,
  group_name text,
  group_color text,
  group_icon text,
  group_total_amount numeric,
  group_transaction_count bigint,
  category_id uuid,
  category_name text,
  category_color text,
  category_icon text,
  category_total_amount numeric,
  category_transaction_count bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with filtered_transactions as (
    select
      t.id,
      t.category_id,
      t.amount
    from public.transactions t
    where t.owner_id = auth.uid()
      and t.direction = 'expense'
      and (p_from is null or t.occurred_at >= p_from)
      and (p_to is null or t.occurred_at <= p_to)
  ),
  category_totals as (
    select
      c.id as category_id,
      c.owner_id,
      c.group_id,
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon,
      coalesce(sum(ft.amount), 0::numeric) as total_amount,
      coalesce(count(ft.id), 0::bigint) as transaction_count
    from public.categories c
    left join filtered_transactions ft
      on ft.category_id = c.id
    where c.owner_id = auth.uid()
    group by c.id, c.owner_id, c.group_id, c.name, c.color, c.icon
  ),
  group_totals as (
    select
      ct.group_id,
      coalesce(sum(ct.total_amount), 0::numeric) as total_amount,
      coalesce(sum(ct.transaction_count), 0::bigint) as transaction_count
    from category_totals ct
    group by ct.group_id
  )
  select
    ct.group_id,
    cg.name as group_name,
    cg.color as group_color,
    cg.icon as group_icon,
    coalesce(gt.total_amount, 0::numeric) as group_total_amount,
    coalesce(gt.transaction_count, 0::bigint) as group_transaction_count,
    ct.category_id,
    ct.category_name,
    ct.category_color,
    ct.category_icon,
    ct.total_amount as category_total_amount,
    ct.transaction_count as category_transaction_count
  from category_totals ct
  left join public.categories_group cg
    on cg.id = ct.group_id
    and cg.owner_id = ct.owner_id
  left join group_totals gt
    on gt.group_id = ct.group_id
  order by cg.name nulls last, ct.category_name;
$$;

comment on function public.category_expense_summary(timestamptz, timestamptz)
  is 'Aggregates expense totals and counts per category and category group for the authenticated user within the provided date range.';

grant execute on function public.category_expense_summary(timestamptz, timestamptz)
  to authenticated, service_role;
