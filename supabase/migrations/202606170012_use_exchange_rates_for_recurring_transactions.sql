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
  v_exchange_rate numeric(18, 8);
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

  if v_wallet_currency is null then
    raise exception 'Wallet currency for recurring transaction % not found', p_recurring_id
      using errcode = 'P0002';
  end if;

  v_exchange_rate := public.get_exchange_rate(
    v_recurring.currency,
    v_wallet_currency,
    p_run_at::date
  );

  if v_exchange_rate is null or v_exchange_rate <= 0 then
    raise exception 'Exchange rate % to % for % not found',
      v_recurring.currency,
      v_wallet_currency,
      p_run_at::date
      using errcode = 'P0002';
  end if;

  v_amount_in_default := round(v_recurring.amount * v_exchange_rate, 2);

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
      v_exchange_rate
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
      v_exchange_rate,
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
  is 'Creates due recurring transactions using get_exchange_rate for the scheduled date; falls back to the latest earlier NBP rate through get_exchange_rate.';
