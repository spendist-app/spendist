create extension if not exists pg_cron with schema cron;

alter table public.recurring_transactions
  add column if not exists cron_job_id integer,
  add column if not exists last_run_at timestamptz;

create unique index if not exists recurring_transactions_cron_job_idx
  on public.recurring_transactions (cron_job_id)
  where cron_job_id is not null;

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

  -- Skip execution when the recurrence has not started yet.
  if p_run_at::date < v_recurring.start_date then
    return null;
  end if;

  -- Finalize recurrence if the end date has passed.
  if v_recurring.end_date is not null and p_run_at::date > v_recurring.end_date then
    if v_recurring.cron_job_id is not null then
      perform cron.unschedule(v_recurring.cron_job_id);
    end if;

    update public.recurring_transactions
       set cron_job_id = null,
           last_run_at = p_run_at
     where id = v_recurring.id;

    return null;
  end if;

  insert into public.transactions (
    owner_id,
    category_id,
    occurred_at,
    description,
    amount,
    currency,
    exchange_rate,
    is_automatic,
    direction
  )
  values (
    v_recurring.owner_id,
    v_recurring.category_id,
    p_run_at,
    v_recurring.name,
    v_recurring.amount,
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
  is 'Creates a concrete transaction from a recurring template and mirrors all tag relationships.';

grant execute on function public.enqueue_recurring_transaction(uuid, timestamptz)
  to authenticated, service_role;

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

  -- Prevent empty schedule strings from registering a job.
  if new.schedule is null or length(trim(new.schedule)) = 0 then
    if new.cron_job_id is not null then
      perform cron.unschedule(new.cron_job_id);
      new.cron_job_id := null;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Rebuild the job when the schedule pattern changes.
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

comment on function public.sync_recurring_transaction_job()
  is 'Trigger helper that keeps pg_cron jobs in sync with recurring transaction definitions.';

drop trigger if exists recurring_transactions_cron_sync on public.recurring_transactions;
drop trigger if exists recurring_transactions_cron_cleanup on public.recurring_transactions;

create trigger recurring_transactions_cron_sync
  before insert or update of schedule, start_date, end_date
  on public.recurring_transactions
  for each row
  execute function public.sync_recurring_transaction_job();

create trigger recurring_transactions_cron_cleanup
  before delete on public.recurring_transactions
  for each row
  execute function public.sync_recurring_transaction_job();

-- Re-sync existing records that qualify for scheduling.
update public.recurring_transactions
   set schedule = schedule
 where schedule is not null
   and length(trim(schedule)) > 0
   and cron_job_id is null;
