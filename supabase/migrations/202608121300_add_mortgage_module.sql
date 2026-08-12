create table public.wibor_rates (
  rate_date date not null,
  tenor text not null check (tenor in ('1M', '3M', '6M', '1Y')),
  value numeric(8, 5) not null check (value >= 0),
  source text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (rate_date, tenor)
);

create table public.mortgage_loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  principal numeric(18, 2) not null check (principal > 0),
  currency char(3) not null default 'PLN' check (currency = 'PLN'),
  disbursed_on date not null,
  first_installment_on date not null,
  term_months integer not null check (term_months between 1 and 600),
  installment_type text not null check (installment_type in ('equal', 'decreasing')),
  margin numeric(8, 5) not null default 0 check (margin >= 0),
  wibor_tenor text not null check (wibor_tenor in ('1M', '3M', '6M', '1Y')),
  upfront_cost numeric(18, 2) not null default 0 check (upfront_cost >= 0),
  wallet_id uuid not null,
  category_id uuid not null,
  revision integer not null default 0 check (revision >= 0),
  transactions_attached boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, id),
  constraint mortgage_wallet_owner_fk foreign key (owner_id, wallet_id)
    references public.wallets(owner_id, id) on delete restrict,
  constraint mortgage_category_owner_fk foreign key (owner_id, category_id)
    references public.categories(owner_id, id) on delete restrict,
  constraint mortgage_first_installment_after_disbursement
    check (first_installment_on > disbursed_on)
);

create table public.mortgage_rate_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  mortgage_id uuid not null,
  position integer not null check (position >= 0),
  starts_on date not null,
  ends_on date,
  rate_type text not null check (rate_type in ('fixed', 'variable')),
  fixed_rate numeric(8, 5),
  unique (mortgage_id, position),
  constraint mortgage_rate_period_mortgage_fk foreign key (owner_id, mortgage_id)
    references public.mortgage_loans(owner_id, id) on delete cascade,
  constraint mortgage_rate_period_shape check (
    ends_on is null or ends_on >= starts_on
  ),
  constraint mortgage_rate_value_shape check (
    (rate_type = 'fixed' and fixed_rate is not null and fixed_rate >= 0)
    or (rate_type = 'variable' and fixed_rate is null)
  )
);

create table public.mortgage_overpayments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  mortgage_id uuid not null,
  occurs_on date not null,
  amount numeric(18, 2) not null check (amount > 0),
  strategy text not null check (strategy in ('shorten_term', 'reduce_payment')),
  constraint mortgage_overpayment_mortgage_fk foreign key (owner_id, mortgage_id)
    references public.mortgage_loans(owner_id, id) on delete cascade
);

create table public.mortgage_holidays (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  mortgage_id uuid not null,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  constraint mortgage_holiday_mortgage_fk foreign key (owner_id, mortgage_id)
    references public.mortgage_loans(owner_id, id) on delete cascade
);

create table public.mortgage_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  mortgage_id uuid not null,
  revision integer not null check (revision > 0),
  sequence integer not null check (sequence > 0),
  scheduled_for date not null,
  entry_type text not null check (entry_type in ('installment', 'overpayment', 'holiday')),
  opening_balance numeric(18, 2) not null check (opening_balance >= 0),
  annual_rate numeric(8, 5) not null check (annual_rate >= 0),
  wibor_value numeric(8, 5),
  wibor_rate_date date,
  rate_status text not null check (rate_status in ('fixed', 'confirmed', 'projected', 'missing')),
  payment numeric(18, 2) not null check (payment >= 0),
  principal_part numeric(18, 2) not null check (principal_part >= 0),
  interest_part numeric(18, 2) not null check (interest_part >= 0),
  remaining_principal numeric(18, 2) not null check (remaining_principal >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (mortgage_id, revision, sequence),
  unique (owner_id, id),
  constraint mortgage_schedule_mortgage_fk foreign key (owner_id, mortgage_id)
    references public.mortgage_loans(owner_id, id) on delete cascade
);

create index mortgage_loans_owner_idx on public.mortgage_loans(owner_id, created_at desc);
create index mortgage_schedule_lookup_idx on public.mortgage_schedule_entries(mortgage_id, revision, scheduled_for);
create index mortgage_overpayments_lookup_idx on public.mortgage_overpayments(mortgage_id, occurs_on);

alter table public.transactions
  add column transaction_state text not null default 'completed',
  add column mortgage_loan_id uuid,
  add column mortgage_schedule_entry_id uuid,
  add column mortgage_entry_type text;

alter table public.transactions
  add constraint transactions_state_check check (transaction_state in ('planned', 'completed')),
  add constraint transactions_mortgage_entry_type_check
    check (mortgage_entry_type is null or mortgage_entry_type in ('installment', 'overpayment', 'upfront_cost')),
  add constraint transactions_mortgage_owner_fk foreign key (owner_id, mortgage_loan_id)
    references public.mortgage_loans(owner_id, id) on delete restrict,
  add constraint transactions_mortgage_schedule_owner_fk foreign key (owner_id, mortgage_schedule_entry_id)
    references public.mortgage_schedule_entries(owner_id, id) on delete restrict;

alter table public.transactions drop constraint if exists transactions_source_module_check;
alter table public.transactions add constraint transactions_source_module_check
  check (source_module in ('standard', 'allowance', 'mortgage'));

alter table public.transactions drop constraint if exists transactions_allowance_shape_check;
alter table public.transactions add constraint transactions_allowance_shape_check check (
  (source_module = 'standard' and allowance_pair_id is null and allowance_role is null
    and allowance_connection_id is null and mortgage_loan_id is null
    and mortgage_schedule_entry_id is null and mortgage_entry_type is null)
  or (source_module = 'allowance' and allowance_pair_id is not null and allowance_role is not null
    and allowance_connection_id is not null and mortgage_loan_id is null
    and mortgage_schedule_entry_id is null and mortgage_entry_type is null)
  or (source_module = 'mortgage' and allowance_pair_id is null and allowance_role is null
    and allowance_connection_id is null and mortgage_loan_id is not null
    and mortgage_entry_type is not null
    and ((mortgage_entry_type = 'upfront_cost' and mortgage_schedule_entry_id is null)
      or (mortgage_entry_type <> 'upfront_cost' and mortgage_schedule_entry_id is not null)))
);

create unique index transactions_mortgage_schedule_idx
  on public.transactions(mortgage_schedule_entry_id) where mortgage_schedule_entry_id is not null;
create unique index transactions_mortgage_upfront_idx
  on public.transactions(mortgage_loan_id, mortgage_entry_type) where mortgage_entry_type = 'upfront_cost';

alter table public.wibor_rates enable row level security;
alter table public.mortgage_loans enable row level security;
alter table public.mortgage_rate_periods enable row level security;
alter table public.mortgage_overpayments enable row level security;
alter table public.mortgage_holidays enable row level security;
alter table public.mortgage_schedule_entries enable row level security;

create policy "WIBOR rates are readable by signed-in users" on public.wibor_rates
  for select to authenticated using (true);
create policy "Mortgage loans are managed by owner" on public.mortgage_loans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Mortgage rate periods are managed by owner" on public.mortgage_rate_periods
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Mortgage overpayments are managed by owner" on public.mortgage_overpayments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Mortgage holidays are managed by owner" on public.mortgage_holidays
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Mortgage schedule is managed by owner" on public.mortgage_schedule_entries
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select on public.wibor_rates to authenticated;
grant all on public.mortgage_loans, public.mortgage_rate_periods, public.mortgage_overpayments,
  public.mortgage_holidays, public.mortgage_schedule_entries to authenticated, service_role;

create or replace function public.guard_mortgage_transaction_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_internal boolean := coalesce(current_setting('spendist.mortgage_internal', true), '') = 'on';
begin
  if not v_internal and ((tg_op <> 'INSERT' and old.source_module = 'mortgage')
    or (tg_op <> 'DELETE' and new.source_module = 'mortgage')) then
    raise exception 'Mortgage transactions must be changed through the mortgage API' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end; $$;

create trigger guard_mortgage_transaction_mutation
  before insert or update or delete on public.transactions
  for each row execute function public.guard_mortgage_transaction_mutation();

create or replace function public.sync_mortgage_transactions(p_mortgage_id uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_loan public.mortgage_loans%rowtype; v_count integer; v_internal text;
begin
  select * into v_loan from public.mortgage_loans
    where id = p_mortgage_id and owner_id = auth.uid();
  if not found then raise exception 'Mortgage not found' using errcode = 'P0002'; end if;
  perform set_config('spendist.mortgage_internal', 'on', true);
  delete from public.transactions where owner_id = auth.uid() and mortgage_loan_id = p_mortgage_id;

  if v_loan.upfront_cost > 0 then
    insert into public.transactions(owner_id, category_id, wallet_id, occurred_at, description,
      amount, amount_in_default, currency, exchange_rate, is_automatic, direction, source_module,
      transaction_state, mortgage_loan_id, mortgage_entry_type)
    values (v_loan.owner_id, v_loan.category_id, v_loan.wallet_id, v_loan.disbursed_on,
      v_loan.name || ' - initial cost', v_loan.upfront_cost, v_loan.upfront_cost, 'PLN', 1,
      true, 'expense', 'mortgage', 'completed', v_loan.id, 'upfront_cost');
  end if;

  insert into public.transactions(owner_id, category_id, wallet_id, occurred_at, description,
    amount, amount_in_default, currency, exchange_rate, is_automatic, direction, source_module,
    transaction_state, mortgage_loan_id, mortgage_schedule_entry_id, mortgage_entry_type)
  select e.owner_id, v_loan.category_id, v_loan.wallet_id, e.scheduled_for,
    v_loan.name || case when e.entry_type = 'overpayment' then ' - overpayment' else ' - installment' end,
    e.payment, e.payment, 'PLN', 1, true, 'expense', 'mortgage',
    case when e.scheduled_for <= current_date and e.rate_status in ('fixed', 'confirmed')
      then 'completed' else 'planned' end,
    v_loan.id, e.id, e.entry_type
  from public.mortgage_schedule_entries e
  where e.mortgage_id = v_loan.id and e.revision = v_loan.revision
    and e.entry_type in ('installment', 'overpayment') and e.payment > 0;

  get diagnostics v_count = row_count;
  update public.mortgage_loans set transactions_attached = true,
    updated_at = timezone('utc', now()) where id = v_loan.id;
  perform set_config('spendist.mortgage_internal', 'off', true);
  return v_count + case when v_loan.upfront_cost > 0 then 1 else 0 end;
end; $$;

create or replace function public.detach_mortgage_transactions(p_mortgage_id uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if not exists(select 1 from public.mortgage_loans where id = p_mortgage_id and owner_id = auth.uid()) then
    raise exception 'Mortgage not found' using errcode = 'P0002';
  end if;
  perform set_config('spendist.mortgage_internal', 'on', true);
  delete from public.transactions where owner_id = auth.uid() and mortgage_loan_id = p_mortgage_id;
  get diagnostics v_count = row_count;
  update public.mortgage_loans set transactions_attached = false,
    updated_at = timezone('utc', now()) where id = p_mortgage_id;
  perform set_config('spendist.mortgage_internal', 'off', true);
  return v_count;
end; $$;

create or replace function public.activate_due_mortgage_transactions(p_as_of date default current_date)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  perform set_config('spendist.mortgage_internal', 'on', true);
  update public.transactions t set transaction_state = 'completed'
  from public.mortgage_schedule_entries e
  where t.owner_id = auth.uid() and t.source_module = 'mortgage'
    and t.transaction_state = 'planned' and t.mortgage_schedule_entry_id = e.id
    and e.scheduled_for <= p_as_of and e.rate_status in ('fixed', 'confirmed');
  get diagnostics v_count = row_count;
  perform set_config('spendist.mortgage_internal', 'off', true);
  return v_count;
end; $$;

grant execute on function public.sync_mortgage_transactions(uuid) to authenticated;
grant execute on function public.detach_mortgage_transactions(uuid) to authenticated;
grant execute on function public.activate_due_mortgage_transactions(date) to authenticated;

create or replace function public.activate_all_due_mortgage_transactions(p_as_of date default current_date)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_owner uuid; v_total integer := 0; v_changed integer;
begin
  for v_owner in select distinct owner_id from public.mortgage_loans where transactions_attached loop
    perform set_config('request.jwt.claim.sub', v_owner::text, true);
    v_changed := public.activate_due_mortgage_transactions(p_as_of);
    v_total := v_total + v_changed;
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
  return v_total;
end; $$;

revoke all on function public.activate_all_due_mortgage_transactions(date) from public, anon, authenticated;
grant execute on function public.activate_all_due_mortgage_transactions(date) to service_role;

select cron.schedule(
  'activate-due-mortgage-transactions',
  '15 1 * * *',
  'select public.activate_all_due_mortgage_transactions(current_date);'
)
where not exists(select 1 from cron.job where jobname = 'activate-due-mortgage-transactions');

create or replace function public.monthly_cashflow_summary(
  p_months integer default 12, p_wallet_id uuid default null
)
returns table(month_start date, income_total numeric, expense_total numeric)
language sql security definer set search_path = public, pg_temp as $$
  with params as (select greatest(1, least(coalesce(p_months, 12), 12)) as month_limit),
  ranked_months as (
    select date_trunc('month', t.occurred_at)::date as month_start,
      row_number() over(order by date_trunc('month', t.occurred_at)::date desc) as rn
    from public.transactions t where t.owner_id = auth.uid()
      and t.transaction_state = 'completed' and (p_wallet_id is null or t.wallet_id = p_wallet_id)
    group by date_trunc('month', t.occurred_at)
  ), limited_months as (
    select rm.month_start from ranked_months rm cross join params p where rm.rn <= p.month_limit
  ), aggregated as (
    select date_trunc('month', t.occurred_at)::date as month_start,
      coalesce(sum(case when t.direction = 'income' then t.amount_in_default else 0 end), 0::numeric) as income_total,
      coalesce(sum(case when t.direction = 'expense' then t.amount_in_default else 0 end), 0::numeric) as expense_total
    from public.transactions t where t.owner_id = auth.uid() and t.transaction_state = 'completed'
      and (p_wallet_id is null or t.wallet_id = p_wallet_id)
      and date_trunc('month', t.occurred_at)::date in(select month_start from limited_months) group by 1
  ) select lm.month_start, coalesce(a.income_total, 0), coalesce(a.expense_total, 0)
    from limited_months lm left join aggregated a using(month_start) order by lm.month_start desc;
$$;

create or replace function public.available_transaction_months(p_wallet_id uuid default null)
returns table(month_start date) language sql security definer set search_path = public, pg_temp as $$
  select distinct date_trunc('month', t.occurred_at)::date from public.transactions t
  where t.owner_id = auth.uid() and t.transaction_state = 'completed'
    and (p_wallet_id is null or t.wallet_id = p_wallet_id) order by 1 desc;
$$;

create or replace function public.monthly_category_cashflow(p_month_start date, p_wallet_id uuid default null)
returns table(month_start date, category_id uuid, category_name text, category_color text,
  category_icon text, direction public.transaction_direction, total_amount numeric, transaction_count bigint)
language sql security definer set search_path = public, pg_temp as $$
  with bounds as (select date_trunc('month', coalesce(p_month_start, now()))::date start_date,
    (date_trunc('month', coalesce(p_month_start, now())) + interval '1 month')::date end_date)
  select b.start_date, c.id, c.name, c.color, c.icon, t.direction,
    coalesce(sum(t.amount_in_default), 0), count(t.id)
  from bounds b join public.transactions t on t.owner_id = auth.uid()
    and t.transaction_state = 'completed' and t.occurred_at >= b.start_date and t.occurred_at < b.end_date
    and (p_wallet_id is null or t.wallet_id = p_wallet_id)
  join public.categories c on c.id = t.category_id and c.owner_id = t.owner_id
  group by b.start_date, c.id, c.name, c.color, c.icon, t.direction
  order by t.direction desc, sum(t.amount_in_default) desc;
$$;
