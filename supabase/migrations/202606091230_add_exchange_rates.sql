alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.prevent_profile_admin_self_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.is_admin is distinct from new.is_admin
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only service role can change profile admin status'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_admin_self_update on public.profiles;
create trigger prevent_profile_admin_self_update
  before update on public.profiles
  for each row
  execute function public.prevent_profile_admin_self_update();

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
    check (
      type in (
        'recurring_transaction_created',
        'recurring_transaction_ended',
        'exchange_rates_sync_failed'
      )
    );

create table if not exists public.exchange_rates (
  currency char(3) not null,
  rate_date date not null,
  rate numeric(18, 8) not null,
  source text not null default 'nbp_table_a',
  source_no text,
  fetched_at timestamptz not null default timezone('utc', now()),
  primary key (currency, rate_date),
  constraint exchange_rates_currency_fkey
    foreign key (currency)
    references public.currencies(symbol)
    on update cascade
    on delete restrict,
  constraint exchange_rates_currency_not_pln
    check (currency <> 'PLN'),
  constraint exchange_rates_currency_uppercase
    check (currency = upper(currency)),
  constraint exchange_rates_positive_rate
    check (rate > 0),
  constraint exchange_rates_source_check
    check (source in ('nbp_table_a'))
);

create index if not exists exchange_rates_currency_rate_date_desc_idx
  on public.exchange_rates (currency, rate_date desc);

alter table public.exchange_rates enable row level security;

drop policy if exists "Exchange rates are readable" on public.exchange_rates;
create policy "Exchange rates are readable"
  on public.exchange_rates
  for select
  to anon, authenticated
  using (true);

grant select on public.exchange_rates to anon, authenticated;
grant all on public.exchange_rates to service_role;

create table if not exists public.exchange_rate_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  status text not null,
  range_start date not null,
  range_end date not null,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  constraint exchange_rate_sync_runs_status_check
    check (status in ('started', 'succeeded', 'failed')),
  constraint exchange_rate_sync_runs_counts_non_negative
    check (inserted_count >= 0 and updated_count >= 0),
  constraint exchange_rate_sync_runs_range_valid
    check (range_start <= range_end)
);

create index if not exists exchange_rate_sync_runs_started_at_idx
  on public.exchange_rate_sync_runs (started_at desc);

alter table public.exchange_rate_sync_runs enable row level security;

grant all on public.exchange_rate_sync_runs to service_role;

create or replace function public.get_exchange_rate(
  p_source_currency text,
  p_target_currency text,
  p_rate_date date default current_date
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_source_currency text := upper(trim(coalesce(p_source_currency, '')));
  v_target_currency text := upper(trim(coalesce(p_target_currency, '')));
  v_source_pln_rate numeric(18, 8);
  v_target_pln_rate numeric(18, 8);
begin
  if p_rate_date is null
     or v_source_currency !~ '^[A-Z]{3}$'
     or v_target_currency !~ '^[A-Z]{3}$' then
    return null;
  end if;

  if v_source_currency = v_target_currency then
    return 1;
  end if;

  if v_source_currency = 'PLN' then
    v_source_pln_rate := 1;
  else
    select er.rate
      into v_source_pln_rate
    from public.exchange_rates er
    where er.currency = v_source_currency
      and er.rate_date <= p_rate_date
    order by er.rate_date desc
    limit 1;
  end if;

  if v_target_currency = 'PLN' then
    v_target_pln_rate := 1;
  else
    select er.rate
      into v_target_pln_rate
    from public.exchange_rates er
    where er.currency = v_target_currency
      and er.rate_date <= p_rate_date
    order by er.rate_date desc
    limit 1;
  end if;

  if v_source_pln_rate is null
     or v_target_pln_rate is null
     or v_source_pln_rate <= 0
     or v_target_pln_rate <= 0 then
    return null;
  end if;

  return round(v_source_pln_rate / v_target_pln_rate, 8);
end;
$$;

grant execute on function public.get_exchange_rate(text, text, date)
  to anon, authenticated, service_role;

create or replace function public.notify_admins_exchange_rates_sync_failed(
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer := 0;
begin
  insert into public.notifications (owner_id, type, payload)
  select
    p.id,
    'exchange_rates_sync_failed',
    coalesce(p_payload, '{}'::jsonb)
  from public.profiles p
  where p.is_admin is true;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.notify_admins_exchange_rates_sync_failed(jsonb)
  to service_role;

comment on table public.exchange_rates
  is 'Daily NBP table A exchange rates stored as PLN per one unit of currency.';

comment on function public.get_exchange_rate(text, text, date)
  is 'Returns target-currency units per one source-currency unit for the requested date, using the latest earlier NBP rate when the exact date is missing.';
