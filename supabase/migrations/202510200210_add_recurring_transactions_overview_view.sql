create or replace view public.recurring_transactions_overview as
with current_period as (
  select
    t.owner_id,
    coalesce(sum(t.amount) filter (
      where date_trunc('year', t.occurred_at) = date_trunc('year', now())
    ), 0::numeric) as yearly_expense,
    coalesce(sum(t.amount) filter (
      where date_trunc('month', t.occurred_at) = date_trunc('month', now())
    ), 0::numeric) as monthly_expense
  from public.transactions t
  where t.direction = 'expense'
  group by t.owner_id
),
active_recurring as (
  select
    rt.owner_id,
    jsonb_agg(
      jsonb_build_object(
        'id', rt.id,
        'name', rt.name,
        'start_date', rt.start_date,
        'end_date', rt.end_date,
        'schedule', rt.schedule,
        'amount', rt.amount,
        'currency', rt.currency,
        'exchange_rate', rt.exchange_rate,
        'direction', rt.direction,
        'category', jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'color', c.color,
          'icon', c.icon
        ),
        'tags', coalesce(tags.tags, '[]'::jsonb)
      )
      order by rt.start_date, lower(rt.name)
    ) as recurring_transactions
  from public.recurring_transactions rt
  left join public.categories c
    on c.id = rt.category_id
   and c.owner_id = rt.owner_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', tg.id,
        'name', tg.name,
        'color', tg.color,
        'icon', tg.icon
      )
      order by lower(tg.name)
    ) as tags
    from public.recurring_transaction_tags rtt
    join public.tags tg
      on tg.id = rtt.tag_id
     and tg.owner_id = rtt.owner_id
    where rtt.recurring_transaction_id = rt.id
      and rtt.owner_id = rt.owner_id
  ) as tags on true
  where rt.start_date <= current_date
    and (rt.end_date is null or rt.end_date >= current_date)
  group by rt.owner_id
)
select
  p.id as owner_id,
  coalesce(cp.yearly_expense, 0::numeric) as yearly_expense,
  coalesce(cp.monthly_expense, 0::numeric) as monthly_expense,
  coalesce(ar.recurring_transactions, '[]'::jsonb) as recurring_transactions
from public.profiles p
left join current_period cp
  on cp.owner_id = p.id
left join active_recurring ar
  on ar.owner_id = p.id;

grant select on public.recurring_transactions_overview to authenticated, service_role, anon;
