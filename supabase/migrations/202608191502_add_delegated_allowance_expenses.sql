create or replace function public.ensure_allowance_expense_category(
  p_recipient_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_language text;
  v_group_name text;
  v_category_name text;
  v_group_id uuid;
  v_category_id uuid;
begin
  select lower(coalesce(language, 'en')) into v_language
  from public.profiles
  where id = p_recipient_id;

  if not found then
    raise exception 'Allowance recipient not found' using errcode = 'P0002';
  end if;

  v_group_name := case when v_language = 'pl' then 'Wydatki' else 'Expenses' end;
  v_category_name := case
    when v_language = 'pl' then 'Wydatki z kieszonkowego'
    else 'Allowance spending'
  end;

  select id into v_group_id
  from public.categories_group
  where owner_id = p_recipient_id and lower(name) = lower(v_group_name)
  limit 1;

  if v_group_id is null then
    insert into public.categories_group (owner_id, name, color, icon)
    values (p_recipient_id, v_group_name, '#DC2626', 'heroBanknotes')
    returning id into v_group_id;
  end if;

  select id into v_category_id
  from public.categories
  where owner_id = p_recipient_id and system_key = 'allowance_expense'
  limit 1;

  if v_category_id is null then
    select id into v_category_id
    from public.categories
    where owner_id = p_recipient_id
      and lower(name) = lower(v_category_name)
    limit 1;
  end if;

  if v_category_id is null then
    insert into public.categories (
      owner_id, group_id, name, color, icon, system_key
    )
    values (
      p_recipient_id, v_group_id, v_category_name,
      '#DC2626', 'heroShoppingBag', 'allowance_expense'
    )
    returning id into v_category_id;
  else
    update public.categories
    set system_key = coalesce(system_key, 'allowance_expense')
    where id = v_category_id and owner_id = p_recipient_id;
  end if;

  return v_category_id;
end;
$$;

alter table public.allowance_connections
  add column if not exists recipient_expense_category_id uuid;

update public.allowance_connections
set recipient_expense_category_id =
  public.ensure_allowance_expense_category(recipient_id)
where recipient_expense_category_id is null;

alter table public.allowance_connections
  alter column recipient_expense_category_id set not null;

alter table public.allowance_connections
  drop constraint if exists allowance_connections_expense_category_fk;
alter table public.allowance_connections
  add constraint allowance_connections_expense_category_fk
    foreign key (recipient_id, recipient_expense_category_id)
    references public.categories (owner_id, id)
    on delete restrict;

create or replace function public.set_allowance_expense_category()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.recipient_expense_category_id is null
     or new.recipient_id is distinct from old.recipient_id then
    new.recipient_expense_category_id :=
      public.ensure_allowance_expense_category(new.recipient_id);
  end if;
  return new;
end;
$$;

drop trigger if exists set_allowance_expense_category
  on public.allowance_connections;
create trigger set_allowance_expense_category
  before insert or update of recipient_id, recipient_expense_category_id
  on public.allowance_connections
  for each row execute function public.set_allowance_expense_category();

create table if not exists public.allowance_delegated_expenses (
  transaction_id uuid primary key
    references public.transactions(id) on delete cascade,
  connection_id uuid not null
    references public.allowance_connections(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists allowance_delegated_expenses_connection_idx
  on public.allowance_delegated_expenses(connection_id, created_at desc);

alter table public.allowance_delegated_expenses enable row level security;
revoke all on table public.allowance_delegated_expenses from anon, authenticated;
grant all on table public.allowance_delegated_expenses to service_role;

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
    check (
      type in (
        'recurring_transaction_created',
        'recurring_transaction_ended',
        'exchange_rates_sync_failed',
        'allowance_invitation_received',
        'allowance_invitation_accepted',
        'allowance_invitation_declined',
        'allowance_received',
        'allowance_transfer_failed',
        'allowance_expense_added'
      )
    );

create or replace function public.create_allowance_recipient_expense(
  p_connection_id uuid,
  p_occurred_at timestamptz,
  p_description text,
  p_amount numeric,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection public.allowance_connections%rowtype;
  v_wallet_id uuid;
  v_wallet_currency text;
  v_exchange_rate numeric(18, 8);
  v_transaction_id uuid;
  v_payer_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0
     or upper(coalesce(p_currency, '')) !~ '^[A-Z]{3}$'
     or p_occurred_at is null then
    raise exception 'Invalid delegated expense data' using errcode = '22023';
  end if;

  select * into v_connection
  from public.allowance_connections
  where id = p_connection_id
    and payer_id = auth.uid()
    and status = 'active'
  for share;

  if not found then
    raise exception 'Active allowance connection not found' using errcode = 'P0002';
  end if;

  select w.id, c.symbol into v_wallet_id, v_wallet_currency
  from public.wallets w
  join public.currencies c on c.id = w.currency_id
  where w.owner_id = v_connection.recipient_id
  order by w.is_default desc, w.creation_date, w.id
  limit 1;

  if v_wallet_id is null then
    raise exception 'Allowance recipient wallet not found' using errcode = 'P0002';
  end if;

  v_exchange_rate := public.get_exchange_rate(
    upper(p_currency), v_wallet_currency, p_occurred_at::date
  );
  if v_exchange_rate is null then
    raise exception 'Allowance exchange rate not found' using errcode = 'P0002';
  end if;

  insert into public.transactions (
    owner_id, category_id, wallet_id, occurred_at, description,
    amount, amount_in_default, currency, exchange_rate, is_automatic,
    direction
  )
  values (
    v_connection.recipient_id,
    v_connection.recipient_expense_category_id,
    v_wallet_id,
    p_occurred_at,
    nullif(trim(p_description), ''),
    p_amount,
    round(p_amount * v_exchange_rate, 2),
    upper(p_currency),
    v_exchange_rate,
    false,
    'expense'
  )
  returning id into v_transaction_id;

  insert into public.allowance_delegated_expenses (
    transaction_id, connection_id
  )
  values (v_transaction_id, p_connection_id);

  select full_name into v_payer_name
  from public.profiles
  where id = auth.uid();

  insert into public.notifications (owner_id, type, payload)
  values (
    v_connection.recipient_id,
    'allowance_expense_added',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'connection_id', p_connection_id,
      'payer_name', coalesce(v_payer_name, ''),
      'description', nullif(trim(p_description), ''),
      'amount', p_amount,
      'currency', upper(p_currency),
      'occurred_at', p_occurred_at
    )
  );

  return v_transaction_id;
end;
$$;

create or replace function public.get_allowance_recipient_expenses()
returns table (
  transaction_id uuid,
  connection_id uuid,
  recipient_name text,
  occurred_at timestamptz,
  description text,
  amount numeric,
  currency text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    t.id,
    c.id,
    p.full_name,
    t.occurred_at,
    t.description,
    t.amount,
    t.currency::text,
    d.created_at,
    t.updated_at
  from public.allowance_delegated_expenses d
  join public.allowance_connections c on c.id = d.connection_id
  join public.transactions t
    on t.id = d.transaction_id and t.owner_id = c.recipient_id
  join public.profiles p on p.id = c.recipient_id
  where c.payer_id = auth.uid() and c.status = 'active'
  order by t.occurred_at desc, d.created_at desc, t.id desc;
$$;

create or replace function public.update_allowance_recipient_expense(
  p_transaction_id uuid,
  p_occurred_at timestamptz,
  p_description text,
  p_amount numeric,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transaction public.transactions%rowtype;
  v_wallet_currency text;
  v_exchange_rate numeric(18, 8);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0
     or upper(coalesce(p_currency, '')) !~ '^[A-Z]{3}$'
     or p_occurred_at is null then
    raise exception 'Invalid delegated expense data' using errcode = '22023';
  end if;

  select t.* into v_transaction
  from public.allowance_delegated_expenses d
  join public.allowance_connections c on c.id = d.connection_id
  join public.transactions t
    on t.id = d.transaction_id and t.owner_id = c.recipient_id
  where d.transaction_id = p_transaction_id
    and c.payer_id = auth.uid()
    and c.status = 'active'
  for update of t;

  if not found then
    raise exception 'Delegated allowance expense not found' using errcode = 'P0002';
  end if;

  select c.symbol into v_wallet_currency
  from public.wallets w
  join public.currencies c on c.id = w.currency_id
  where w.id = v_transaction.wallet_id
    and w.owner_id = v_transaction.owner_id;

  v_exchange_rate := public.get_exchange_rate(
    upper(p_currency), v_wallet_currency, p_occurred_at::date
  );
  if v_exchange_rate is null then
    raise exception 'Allowance exchange rate not found' using errcode = 'P0002';
  end if;

  update public.transactions
  set occurred_at = p_occurred_at,
      description = nullif(trim(p_description), ''),
      amount = p_amount,
      amount_in_default = round(p_amount * v_exchange_rate, 2),
      currency = upper(p_currency),
      exchange_rate = v_exchange_rate,
      direction = 'expense'
  where id = v_transaction.id;

  return v_transaction.id;
end;
$$;

create or replace function public.delete_allowance_recipient_expense(
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.transactions t
  using public.allowance_delegated_expenses d,
        public.allowance_connections c
  where t.id = p_transaction_id
    and d.transaction_id = t.id
    and c.id = d.connection_id
    and t.owner_id = c.recipient_id
    and c.payer_id = auth.uid()
    and c.status = 'active';

  if not found then
    raise exception 'Delegated allowance expense not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.ensure_allowance_expense_category(uuid)
  from public, anon, authenticated;
revoke all on function public.create_allowance_recipient_expense(
  uuid, timestamptz, text, numeric, text
) from public;
grant execute on function public.create_allowance_recipient_expense(
  uuid, timestamptz, text, numeric, text
) to authenticated;
revoke all on function public.get_allowance_recipient_expenses() from public;
grant execute on function public.get_allowance_recipient_expenses()
  to authenticated;
revoke all on function public.update_allowance_recipient_expense(
  uuid, timestamptz, text, numeric, text
) from public;
grant execute on function public.update_allowance_recipient_expense(
  uuid, timestamptz, text, numeric, text
) to authenticated;
revoke all on function public.delete_allowance_recipient_expense(uuid)
  from public;
grant execute on function public.delete_allowance_recipient_expense(uuid)
  to authenticated;

comment on table public.allowance_delegated_expenses
  is 'Tracks recipient-owned expenses created by an Allowance payer without exposing them in the payer ledger.';
