alter table public.recurring_transactions
  add column if not exists is_paused boolean not null default false,
  add column if not exists paused_at timestamptz;

alter table public.recurring_transactions
  drop constraint if exists recurring_transactions_pause_state_valid;

alter table public.recurring_transactions
  add constraint recurring_transactions_pause_state_valid
    check (
      (is_paused is true and paused_at is not null)
      or (is_paused is false and paused_at is null)
    );

create index if not exists recurring_transactions_owner_pause_idx
  on public.recurring_transactions (owner_id, is_paused);

create or replace function public.enqueue_recurring_transaction(
  p_recurring_id uuid,
  p_run_at timestamptz default timezone('utc', now())
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recurring public.recurring_transactions%rowtype;
  v_transaction_id uuid;
  v_wallet_currency text;
  v_amount_in_default numeric(18, 2);
begin
  select *
  into v_recurring
  from public.recurring_transactions
  where id = p_recurring_id
  for update;

  if not found then
    raise exception 'Recurring transaction % not found', p_recurring_id
      using errcode = 'P0002';
  end if;

  if v_recurring.is_paused is true then
    return null;
  end if;

  if p_run_at::date < v_recurring.start_date then
    return null;
  end if;

  if v_recurring.end_date is not null and p_run_at::date > v_recurring.end_date then
    insert into public.notifications (owner_id, type, payload)
    select
      v_recurring.owner_id,
      'recurring_transaction_ended',
      jsonb_build_object(
        'recurring_transaction_id', v_recurring.id,
        'description', v_recurring.name,
        'end_date', v_recurring.end_date,
        'occurred_at', p_run_at
      )
    where not exists (
      select 1
      from public.notifications n
      where n.owner_id = v_recurring.owner_id
        and n.type = 'recurring_transaction_ended'
        and n.payload ->> 'recurring_transaction_id' = v_recurring.id::text
    );

    update public.recurring_transactions
       set cron_job_id = null,
           last_run_at = p_run_at
     where id = v_recurring.id;

    return null;
  end if;

  select c.symbol
    into v_wallet_currency
  from public.wallets w
  join public.currencies c on c.id = w.currency_id
  where w.owner_id = v_recurring.owner_id
    and w.id = v_recurring.wallet_id;

  v_amount_in_default := case
    when upper(v_recurring.currency) = upper(coalesce(v_wallet_currency, v_recurring.currency))
      then v_recurring.amount
    when v_recurring.exchange_rate is not null and v_recurring.exchange_rate > 0
      then v_recurring.amount / v_recurring.exchange_rate
    else v_recurring.amount
  end;

  if v_recurring.amount_mode = 'variable' then
    insert into public.recurring_transaction_occurrences (
      owner_id,
      recurring_transaction_id,
      scheduled_for,
      currency,
      exchange_rate
    )
    values (
      v_recurring.owner_id,
      v_recurring.id,
      p_run_at,
      v_recurring.currency,
      v_recurring.exchange_rate
    )
    on conflict (owner_id, recurring_transaction_id, scheduled_for)
    do update set
      currency = excluded.currency,
      exchange_rate = excluded.exchange_rate,
      updated_at = timezone('utc', now());

    update public.recurring_transactions
       set last_run_at = p_run_at
     where id = v_recurring.id;

    return null;
  end if;

  update public.transactions
     set recurring_transaction_id = v_recurring.id,
         recurring_scheduled_for = p_run_at
   where id = (
     select t.id
     from public.transactions t
     where t.owner_id = v_recurring.owner_id
       and t.recurring_transaction_id is null
       and t.recurring_scheduled_for is null
       and t.is_automatic is true
       and t.occurred_at = p_run_at
       and t.category_id = v_recurring.category_id
       and t.wallet_id = v_recurring.wallet_id
       and t.description = v_recurring.name
       and t.amount = v_recurring.amount
       and t.currency = v_recurring.currency
       and t.direction = v_recurring.direction
     order by t.id
     limit 1
   )
  returning id
  into v_transaction_id;

  if v_transaction_id is null then
    insert into public.transactions (
      owner_id,
      category_id,
      wallet_id,
      occurred_at,
      description,
      amount,
      amount_in_default,
      currency,
      exchange_rate,
      is_automatic,
      direction,
      recurring_transaction_id,
      recurring_scheduled_for
    )
    values (
      v_recurring.owner_id,
      v_recurring.category_id,
      v_recurring.wallet_id,
      p_run_at,
      v_recurring.name,
      v_recurring.amount,
      v_amount_in_default,
      v_recurring.currency,
      v_recurring.exchange_rate,
      true,
      v_recurring.direction,
      v_recurring.id,
      p_run_at
    )
    on conflict (owner_id, recurring_transaction_id, recurring_scheduled_for)
      where recurring_transaction_id is not null
        and recurring_scheduled_for is not null
    do update set
      category_id = excluded.category_id,
      wallet_id = excluded.wallet_id,
      occurred_at = excluded.occurred_at,
      description = excluded.description,
      amount = excluded.amount,
      amount_in_default = excluded.amount_in_default,
      currency = excluded.currency,
      exchange_rate = excluded.exchange_rate,
      is_automatic = true,
      direction = excluded.direction
    returning id
    into v_transaction_id;
  end if;

  insert into public.transaction_tags (transaction_id, tag_id, owner_id)
  select v_transaction_id, rtt.tag_id, rtt.owner_id
  from public.recurring_transaction_tags rtt
  where rtt.recurring_transaction_id = v_recurring.id
    and rtt.owner_id = v_recurring.owner_id
  on conflict do nothing;

  insert into public.notifications (owner_id, type, payload)
  select
    v_recurring.owner_id,
    'recurring_transaction_created',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'recurring_transaction_id', v_recurring.id,
      'description', v_recurring.name,
      'amount', v_recurring.amount,
      'currency', v_recurring.currency,
      'direction', v_recurring.direction,
      'occurred_at', p_run_at
    )
  where not exists (
    select 1
    from public.notifications n
    where n.owner_id = v_recurring.owner_id
      and n.type = 'recurring_transaction_created'
      and n.payload ->> 'transaction_id' = v_transaction_id::text
  );

  update public.recurring_transactions
     set last_run_at = p_run_at
   where id = v_recurring.id;

  return v_transaction_id;
end;
$$;

create or replace function public.sync_recurring_transaction_job()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_command text;
  v_job_id integer;
begin
  if tg_op = 'DELETE' then
    if old.cron_job_id is not null then
      perform cron.unschedule(old.cron_job_id);
    end if;
    return old;
  end if;

  if new.schedule is null or length(trim(new.schedule)) = 0 then
    if new.cron_job_id is not null then
      perform cron.unschedule(new.cron_job_id);
      new.cron_job_id := null;
    end if;
    return new;
  end if;

  if new.is_paused is true then
    if new.cron_job_id is not null then
      perform cron.unschedule(new.cron_job_id);
      new.cron_job_id := null;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.cron_job_id is not null and new.schedule <> old.schedule then
      perform cron.unschedule(old.cron_job_id);
      new.cron_job_id := null;
    end if;
  end if;

  if new.end_date is not null and new.end_date < current_date then
    if new.cron_job_id is not null then
      perform cron.unschedule(new.cron_job_id);
    end if;
    new.cron_job_id := null;
    return new;
  end if;

  if new.cron_job_id is null then
    v_command := format(
      'select public.enqueue_recurring_transaction(''%s''::uuid);',
      new.id::text
    );

    v_job_id := cron.schedule(
      format('recurring-%s', new.id::text),
      new.schedule,
      v_command
    );

    new.cron_job_id := v_job_id;
  end if;

  return new;
end;
$$;

drop trigger if exists recurring_transactions_cron_sync on public.recurring_transactions;

create trigger recurring_transactions_cron_sync
  before insert or update of schedule, start_date, end_date, is_paused
  on public.recurring_transactions
  for each row
  execute function public.sync_recurring_transaction_job();

create or replace view public.recurring_transactions_overview as
with current_period as (
  select
    t.owner_id,
    coalesce(sum(coalesce(t.amount_in_default, t.amount)) filter (
      where date_trunc('year', t.occurred_at) = date_trunc('year', now())
    ), 0::numeric) as yearly_expense,
    coalesce(sum(coalesce(t.amount_in_default, t.amount)) filter (
      where date_trunc('month', t.occurred_at) = date_trunc('month', now())
    ), 0::numeric) as monthly_expense
  from public.transactions t
  where t.direction = 'expense'
    and t.is_automatic is true
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
    and rt.is_paused is false
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

grant select on public.recurring_transactions_overview
  to authenticated, service_role, anon;

comment on column public.recurring_transactions.is_paused
  is 'Manual pause flag. Paused recurring payments are kept for history and filtering but are excluded from scheduling.';

comment on column public.recurring_transactions.paused_at
  is 'UTC timestamp when the recurring payment was manually paused.';
