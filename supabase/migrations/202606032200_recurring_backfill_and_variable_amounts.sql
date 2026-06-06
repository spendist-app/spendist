alter table public.recurring_transactions
  add column if not exists amount_mode text not null default 'fixed';

alter table public.recurring_transactions
  drop constraint if exists recurring_transactions_amount_mode_check;

alter table public.recurring_transactions
  add constraint recurring_transactions_amount_mode_check
    check (amount_mode in ('fixed', 'variable'));

alter table public.transactions
  add column if not exists recurring_transaction_id uuid,
  add column if not exists recurring_scheduled_for timestamptz;

alter table public.transactions
  drop constraint if exists transactions_recurring_transaction_fk;

alter table public.transactions
  add constraint transactions_recurring_transaction_fk
    foreign key (owner_id, recurring_transaction_id)
    references public.recurring_transactions (owner_id, id)
    on delete set null (recurring_transaction_id);

create unique index if not exists transactions_recurring_occurrence_idx
  on public.transactions (owner_id, recurring_transaction_id, recurring_scheduled_for)
  where recurring_transaction_id is not null
    and recurring_scheduled_for is not null;

create table if not exists public.recurring_transaction_occurrences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  recurring_transaction_id uuid not null,
  scheduled_for timestamptz not null,
  amount numeric(12, 2),
  amount_in_default numeric(18, 2),
  currency char(3) not null,
  exchange_rate numeric(18, 6),
  transaction_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, id),
  constraint recurring_transaction_occurrences_recurring_fk
    foreign key (owner_id, recurring_transaction_id)
    references public.recurring_transactions (owner_id, id)
    on delete cascade,
  constraint recurring_transaction_occurrences_transaction_fk
    foreign key (owner_id, transaction_id)
    references public.transactions (owner_id, id)
    on delete set null (transaction_id),
  constraint recurring_transaction_occurrences_amount_non_negative
    check (amount is null or amount >= 0),
  constraint recurring_transaction_occurrences_currency_format
    check (char_length(currency) = 3 and currency = upper(currency))
);

create unique index if not exists recurring_transaction_occurrences_unique_idx
  on public.recurring_transaction_occurrences (owner_id, recurring_transaction_id, scheduled_for);

create index if not exists recurring_transaction_occurrences_owner_pending_idx
  on public.recurring_transaction_occurrences (owner_id, scheduled_for)
  where transaction_id is null;

alter table public.recurring_transaction_occurrences enable row level security;

drop policy if exists "Recurring occurrences are accessible by owner" on public.recurring_transaction_occurrences;
create policy "Recurring occurrences are accessible by owner"
  on public.recurring_transaction_occurrences
  for select
  using (auth.uid() = owner_id);

drop policy if exists "Recurring occurrences can be managed by owner" on public.recurring_transaction_occurrences;
create policy "Recurring occurrences can be managed by owner"
  on public.recurring_transaction_occurrences
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

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

comment on function public.enqueue_recurring_transaction(uuid, timestamptz)
  is 'Creates or reuses a concrete transaction for fixed recurring templates, creates pending occurrences for variable templates, and records source occurrence metadata for idempotent backfills.';

create or replace function public.complete_recurring_transaction_occurrence(
  p_occurrence_id uuid,
  p_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_occurrence public.recurring_transaction_occurrences%rowtype;
  v_recurring public.recurring_transactions%rowtype;
  v_wallet_currency text;
  v_amount_in_default numeric(18, 2);
  v_transaction_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero'
      using errcode = '22003';
  end if;

  select *
  into v_occurrence
  from public.recurring_transaction_occurrences
  where id = p_occurrence_id
  for update;

  if not found then
    raise exception 'Recurring occurrence % not found', p_occurrence_id
      using errcode = 'P0002';
  end if;

  if auth.uid() is not null and auth.uid() <> v_occurrence.owner_id then
    raise exception 'Not allowed'
      using errcode = '42501';
  end if;

  select *
  into v_recurring
  from public.recurring_transactions
  where owner_id = v_occurrence.owner_id
    and id = v_occurrence.recurring_transaction_id;

  if not found then
    raise exception 'Recurring transaction % not found', v_occurrence.recurring_transaction_id
      using errcode = 'P0002';
  end if;

  select c.symbol
    into v_wallet_currency
  from public.wallets w
  join public.currencies c on c.id = w.currency_id
  where w.owner_id = v_recurring.owner_id
    and w.id = v_recurring.wallet_id;

  v_amount_in_default := case
    when upper(v_recurring.currency) = upper(coalesce(v_wallet_currency, v_recurring.currency))
      then p_amount
    when v_recurring.exchange_rate is not null and v_recurring.exchange_rate > 0
      then p_amount / v_recurring.exchange_rate
    else p_amount
  end;

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
    v_occurrence.scheduled_for,
    v_recurring.name,
    p_amount,
    v_amount_in_default,
    v_recurring.currency,
    v_recurring.exchange_rate,
    true,
    v_recurring.direction,
    v_recurring.id,
    v_occurrence.scheduled_for
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

  insert into public.transaction_tags (transaction_id, tag_id, owner_id)
  select v_transaction_id, rtt.tag_id, rtt.owner_id
  from public.recurring_transaction_tags rtt
  where rtt.recurring_transaction_id = v_recurring.id
    and rtt.owner_id = v_recurring.owner_id
  on conflict do nothing;

  update public.recurring_transaction_occurrences
     set amount = p_amount,
         amount_in_default = v_amount_in_default,
         currency = v_recurring.currency,
         exchange_rate = v_recurring.exchange_rate,
         transaction_id = v_transaction_id,
         updated_at = timezone('utc', now())
   where id = v_occurrence.id;

  insert into public.notifications (owner_id, type, payload)
  select
    v_recurring.owner_id,
    'recurring_transaction_created',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'recurring_transaction_id', v_recurring.id,
      'description', v_recurring.name,
      'amount', p_amount,
      'currency', v_recurring.currency,
      'direction', v_recurring.direction,
      'occurred_at', v_occurrence.scheduled_for
    )
  where not exists (
    select 1
    from public.notifications n
    where n.owner_id = v_recurring.owner_id
      and n.type = 'recurring_transaction_created'
      and n.payload ->> 'transaction_id' = v_transaction_id::text
  );

  return v_transaction_id;
end;
$$;

comment on function public.complete_recurring_transaction_occurrence(uuid, numeric)
  is 'Completes a pending variable recurring occurrence by creating or updating its generated transaction idempotently.';

grant execute on function public.enqueue_recurring_transaction(uuid, timestamptz)
  to authenticated, service_role;

grant execute on function public.complete_recurring_transaction_occurrence(uuid, numeric)
  to authenticated, service_role;
