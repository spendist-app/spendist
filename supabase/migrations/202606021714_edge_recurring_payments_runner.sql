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
    direction
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
    v_recurring.direction
  )
  returning id
  into v_transaction_id;

  insert into public.transaction_tags (transaction_id, tag_id, owner_id)
  select v_transaction_id, rtt.tag_id, rtt.owner_id
  from public.recurring_transaction_tags rtt
  where rtt.recurring_transaction_id = v_recurring.id
    and rtt.owner_id = v_recurring.owner_id;

  update public.recurring_transactions
     set last_run_at = p_run_at
   where id = v_recurring.id;

  return v_transaction_id;
end;
$$;

comment on function public.enqueue_recurring_transaction(uuid, timestamptz)
  is 'Creates a concrete transaction from a recurring template and mirrors all tag relationships. Called by the recurring payments Edge Function runner.';

grant execute on function public.enqueue_recurring_transaction(uuid, timestamptz)
  to authenticated, service_role;

do $$
declare
  job record;
begin
  for job in
    select cron_job_id
    from public.recurring_transactions
    where cron_job_id is not null
  loop
    perform cron.unschedule(job.cron_job_id);
  end loop;
end;
$$;

update public.recurring_transactions
   set cron_job_id = null
 where cron_job_id is not null;

drop trigger if exists recurring_transactions_cron_sync on public.recurring_transactions;
drop trigger if exists recurring_transactions_cron_cleanup on public.recurring_transactions;

comment on table public.recurring_transactions
  is 'Recurring transaction templates. Due occurrences are processed by the process-recurring-payments Edge Function.';
