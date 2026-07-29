alter table public.categories
  add column if not exists system_key text;

create unique index if not exists categories_owner_system_key_idx
  on public.categories (owner_id, system_key)
  where system_key is not null;

create table if not exists public.allowance_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid references public.profiles (id) on delete cascade,
  invitee_email text not null,
  token_hash text not null,
  status text not null default 'pending',
  email_delivery_status text not null default 'pending',
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint allowance_invitations_status_check
    check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  constraint allowance_invitations_delivery_check
    check (email_delivery_status in ('pending', 'sent', 'failed')),
  constraint allowance_invitations_email_normalized
    check (invitee_email = lower(trim(invitee_email))),
  constraint allowance_invitations_not_self
    check (invitee_id is null or invitee_id <> inviter_id)
);

create index if not exists allowance_invitations_inviter_idx
  on public.allowance_invitations (inviter_id, created_at desc);
create index if not exists allowance_invitations_invitee_idx
  on public.allowance_invitations (invitee_id, created_at desc)
  where invitee_id is not null;
create unique index if not exists allowance_invitations_pending_pair_idx
  on public.allowance_invitations (inviter_id, invitee_email)
  where status = 'pending';
create unique index if not exists allowance_invitations_token_hash_idx
  on public.allowance_invitations (token_hash);

create table if not exists public.allowance_connections (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  recipient_category_id uuid not null,
  status text not null default 'active',
  accepted_invitation_id uuid references public.allowance_invitations (id)
    on delete set null,
  connected_at timestamptz not null default timezone('utc', now()),
  disconnected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint allowance_connections_distinct_users
    check (payer_id <> recipient_id),
  constraint allowance_connections_status_check
    check (status in ('active', 'disconnected')),
  constraint allowance_connections_category_fk
    foreign key (recipient_id, recipient_category_id)
    references public.categories (owner_id, id)
    on delete restrict,
  unique (payer_id, recipient_id)
);

create index if not exists allowance_connections_payer_idx
  on public.allowance_connections (payer_id, status);
create index if not exists allowance_connections_recipient_idx
  on public.allowance_connections (recipient_id, status);

alter table public.transactions
  add column if not exists source_module text not null default 'standard',
  add column if not exists allowance_pair_id uuid,
  add column if not exists allowance_role text,
  add column if not exists allowance_connection_id uuid;

alter table public.transactions
  drop constraint if exists transactions_source_module_check;
alter table public.transactions
  add constraint transactions_source_module_check
    check (source_module in ('standard', 'allowance'));

alter table public.transactions
  drop constraint if exists transactions_allowance_role_check;
alter table public.transactions
  add constraint transactions_allowance_role_check
    check (allowance_role is null or allowance_role in ('payer', 'recipient'));

alter table public.transactions
  drop constraint if exists transactions_allowance_shape_check;
alter table public.transactions
  add constraint transactions_allowance_shape_check
    check (
      (source_module = 'standard'
        and allowance_pair_id is null
        and allowance_role is null
        and allowance_connection_id is null)
      or
      (source_module = 'allowance'
        and allowance_pair_id is not null
        and allowance_role is not null
        and allowance_connection_id is not null)
    );

alter table public.transactions
  drop constraint if exists transactions_allowance_connection_fk;
alter table public.transactions
  add constraint transactions_allowance_connection_fk
    foreign key (allowance_connection_id)
    references public.allowance_connections (id)
    on delete restrict;

create unique index if not exists transactions_allowance_pair_role_idx
  on public.transactions (allowance_pair_id, allowance_role)
  where allowance_pair_id is not null;

alter table public.recurring_transactions
  add column if not exists source_module text not null default 'standard',
  add column if not exists allowance_connection_id uuid;

alter table public.recurring_transactions
  drop constraint if exists recurring_transactions_source_module_check;
alter table public.recurring_transactions
  add constraint recurring_transactions_source_module_check
    check (source_module in ('standard', 'allowance'));

alter table public.recurring_transactions
  drop constraint if exists recurring_transactions_allowance_shape_check;
alter table public.recurring_transactions
  add constraint recurring_transactions_allowance_shape_check
    check (
      (source_module = 'standard' and allowance_connection_id is null)
      or
      (source_module = 'allowance' and allowance_connection_id is not null
        and direction = 'expense')
    );

alter table public.recurring_transactions
  drop constraint if exists recurring_transactions_allowance_connection_fk;
alter table public.recurring_transactions
  add constraint recurring_transactions_allowance_connection_fk
    foreign key (allowance_connection_id)
    references public.allowance_connections (id)
    on delete restrict;

alter table public.allowance_invitations enable row level security;
alter table public.allowance_connections enable row level security;

drop policy if exists "Allowance invitations are visible to participants"
  on public.allowance_invitations;
create policy "Allowance invitations are visible to participants"
  on public.allowance_invitations
  for select
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

drop policy if exists "Allowance connections are visible to participants"
  on public.allowance_connections;
create policy "Allowance connections are visible to participants"
  on public.allowance_connections
  for select
  using (payer_id = auth.uid() or recipient_id = auth.uid());

grant select on table public.allowance_invitations to authenticated;
grant select on table public.allowance_connections to authenticated;
grant all on table public.allowance_invitations to service_role;
grant all on table public.allowance_connections to service_role;

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
        'allowance_transfer_failed'
      )
    );

create or replace function public.guard_allowance_transaction_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_internal boolean :=
    coalesce(current_setting('spendist.allowance_internal', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if new.source_module = 'allowance' and not v_internal then
      raise exception 'Allowance transactions must be created through the allowance API'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.source_module = 'allowance' and not v_internal then
      raise exception 'Allowance transactions must be deleted through the allowance API'
        using errcode = '42501';
    end if;
    return old;
  end if;

  if (old.source_module = 'allowance' or new.source_module = 'allowance')
     and not v_internal
     and (
       new.amount is distinct from old.amount
       or new.amount_in_default is distinct from old.amount_in_default
       or new.currency is distinct from old.currency
       or new.exchange_rate is distinct from old.exchange_rate
       or new.direction is distinct from old.direction
       or new.source_module is distinct from old.source_module
       or new.allowance_pair_id is distinct from old.allowance_pair_id
       or new.allowance_role is distinct from old.allowance_role
       or new.allowance_connection_id is distinct from old.allowance_connection_id
     ) then
    raise exception 'Synchronized allowance fields must be changed through the allowance API'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_allowance_transaction_mutation
  on public.transactions;
create trigger guard_allowance_transaction_mutation
  before insert or update or delete on public.transactions
  for each row execute function public.guard_allowance_transaction_mutation();

create or replace function public.validate_allowance_recurring_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.source_module = 'allowance' and not exists (
    select 1
    from public.allowance_connections c
    where c.id = new.allowance_connection_id
      and c.payer_id = new.owner_id
      and c.status = 'active'
  ) then
    raise exception 'An active allowance connection is required'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_allowance_recurring_transaction
  on public.recurring_transactions;
create trigger validate_allowance_recurring_transaction
  before insert or update of source_module, allowance_connection_id, owner_id,
    direction on public.recurring_transactions
  for each row execute function public.validate_allowance_recurring_transaction();

create or replace function public.create_allowance_invitation(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_own_email text;
  v_invitee_id uuid;
  v_invitation_id uuid;
  v_token text;
  v_token_hash text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(v_email) > 320 then
    raise exception 'Invalid email address' using errcode = '22023';
  end if;

  select lower(email) into v_own_email from auth.users where id = v_user_id;
  if v_email = v_own_email then
    raise exception 'You cannot invite yourself' using errcode = '22023';
  end if;
  if (
    select count(*)
    from public.allowance_invitations
    where inviter_id = v_user_id
      and created_at >= timezone('utc', now()) - interval '1 hour'
  ) >= 5 then
    raise exception 'Invitation rate limit exceeded' using errcode = 'P0001';
  end if;

  select id into v_invitee_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_invitee_id is not null and exists (
    select 1 from public.allowance_connections
    where payer_id = v_user_id
      and recipient_id = v_invitee_id
      and status = 'active'
  ) then
    raise exception 'Connection already exists' using errcode = '23505';
  end if;

  update public.allowance_invitations
  set status = 'expired',
      responded_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where inviter_id = v_user_id
    and invitee_email = v_email
    and status = 'pending';

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into public.allowance_invitations (
    inviter_id, invitee_id, invitee_email, token_hash, expires_at
  )
  values (
    v_user_id, v_invitee_id, v_email, v_token_hash,
    timezone('utc', now()) + interval '7 days'
  )
  returning id into v_invitation_id;

  if v_invitee_id is not null then
    insert into public.notifications (owner_id, type, payload)
    values (
      v_invitee_id,
      'allowance_invitation_received',
      jsonb_build_object(
        'invitation_id', v_invitation_id,
        'inviter_name', (
          select full_name from public.profiles where id = v_user_id
        )
      )
    );
  end if;

  return jsonb_build_object(
    'invitation_id', v_invitation_id,
    'token', v_token,
    'expires_at', timezone('utc', now()) + interval '7 days'
  );
end;
$$;

create or replace function public.set_allowance_invitation_delivery(
  p_invitation_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('sent', 'failed') then
    raise exception 'Invalid delivery status' using errcode = '22023';
  end if;
  update public.allowance_invitations
  set email_delivery_status = p_status,
      updated_at = timezone('utc', now())
  where id = p_invitation_id;
end;
$$;

create or replace function public.ensure_allowance_connection(
  p_invitation_id uuid,
  p_recipient_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation public.allowance_invitations%rowtype;
  v_language text;
  v_group_name text;
  v_category_name text;
  v_group_id uuid;
  v_category_id uuid;
  v_connection_id uuid;
begin
  select * into v_invitation
  from public.allowance_invitations
  where id = p_invitation_id
  for update;

  if not found or v_invitation.status <> 'pending'
     or v_invitation.expires_at <= timezone('utc', now()) then
    raise exception 'Invitation is not available' using errcode = 'P0002';
  end if;

  select lower(coalesce(language, 'en')) into v_language
  from public.profiles where id = p_recipient_id;
  v_group_name := case when v_language = 'pl' then 'Przychody' else 'Income' end;
  v_category_name := case when v_language = 'pl' then 'Kieszonkowe' else 'Allowance' end;

  select id into v_group_id
  from public.categories_group
  where owner_id = p_recipient_id and lower(name) = lower(v_group_name)
  limit 1;
  if v_group_id is null then
    insert into public.categories_group (owner_id, name, color, icon)
    values (p_recipient_id, v_group_name, '#16A34A', 'heroBanknotes')
    returning id into v_group_id;
  end if;

  select id into v_category_id
  from public.categories
  where owner_id = p_recipient_id and system_key = 'allowance_income'
  limit 1;
  if v_category_id is null then
    select id into v_category_id
    from public.categories
    where owner_id = p_recipient_id and lower(name) = lower(v_category_name)
    limit 1;
  end if;
  if v_category_id is null then
    insert into public.categories (
      owner_id, group_id, name, color, icon, system_key
    )
    values (
      p_recipient_id, v_group_id, v_category_name,
      '#16A34A', 'heroGift', 'allowance_income'
    )
    returning id into v_category_id;
  else
    update public.categories
    set system_key = coalesce(system_key, 'allowance_income')
    where id = v_category_id and owner_id = p_recipient_id;
  end if;

  insert into public.allowance_connections (
    payer_id, recipient_id, recipient_category_id,
    status, accepted_invitation_id
  )
  values (
    v_invitation.inviter_id, p_recipient_id, v_category_id,
    'active', v_invitation.id
  )
  on conflict (payer_id, recipient_id)
  do update set
    recipient_category_id = excluded.recipient_category_id,
    status = 'active',
    accepted_invitation_id = excluded.accepted_invitation_id,
    connected_at = timezone('utc', now()),
    disconnected_at = null,
    updated_at = timezone('utc', now())
  returning id into v_connection_id;

  update public.allowance_invitations
  set status = 'accepted',
      invitee_id = p_recipient_id,
      responded_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = v_invitation.id;

  insert into public.notifications (owner_id, type, payload)
  values (
    v_invitation.inviter_id,
    'allowance_invitation_accepted',
    jsonb_build_object(
      'connection_id', v_connection_id,
      'recipient_name', (
        select full_name from public.profiles where id = p_recipient_id
      )
    )
  );

  return v_connection_id;
end;
$$;

create or replace function public.respond_allowance_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.allowance_invitations%rowtype;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = v_user_id;
  select * into v_invitation
  from public.allowance_invitations
  where id = p_invitation_id
  for update;
  if not found or v_invitation.status <> 'pending'
     or (v_invitation.invitee_id is distinct from v_user_id
       and v_invitation.invitee_email <> v_email) then
    raise exception 'Invitation is not available' using errcode = 'P0002';
  end if;
  if p_accept then
    return public.ensure_allowance_connection(v_invitation.id, v_user_id);
  end if;
  update public.allowance_invitations
  set status = 'declined', invitee_id = v_user_id,
      responded_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = v_invitation.id;
  insert into public.notifications (owner_id, type, payload)
  values (
    v_invitation.inviter_id,
    'allowance_invitation_declined',
    jsonb_build_object('invitation_id', v_invitation.id)
  );
  return null;
end;
$$;

create or replace function public.accept_allowance_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.allowance_invitations%rowtype;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = v_user_id;
  select * into v_invitation
  from public.allowance_invitations
  where token_hash = encode(
    extensions.digest(coalesce(p_token, ''), 'sha256'),
    'hex'
  )
    and status = 'pending'
    and expires_at > timezone('utc', now())
  for update;
  if not found or v_invitation.invitee_email <> v_email then
    raise exception 'Invitation is not available' using errcode = 'P0002';
  end if;
  return public.ensure_allowance_connection(v_invitation.id, v_user_id);
end;
$$;

create or replace function public.get_allowance_connections()
returns table (
  id uuid,
  role text,
  counterpart_id uuid,
  counterpart_name text,
  counterpart_email text,
  status text,
  connected_at timestamptz
)
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  select
    c.id,
    case when c.payer_id = auth.uid() then 'payer' else 'recipient' end,
    case when c.payer_id = auth.uid() then c.recipient_id else c.payer_id end,
    p.full_name,
    lower(u.email),
    c.status,
    c.connected_at
  from public.allowance_connections c
  join public.profiles p
    on p.id = case when c.payer_id = auth.uid()
      then c.recipient_id else c.payer_id end
  join auth.users u on u.id = p.id
  where c.payer_id = auth.uid() or c.recipient_id = auth.uid()
  order by c.connected_at desc;
$$;

create or replace function public.create_allowance_transaction_pair_internal(
  p_connection_id uuid,
  p_payer_id uuid,
  p_category_id uuid,
  p_wallet_id uuid,
  p_occurred_at timestamptz,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_place_id uuid default null,
  p_is_automatic boolean default false,
  p_recurring_id uuid default null,
  p_scheduled_for timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection public.allowance_connections%rowtype;
  v_pair_id uuid := gen_random_uuid();
  v_payer_transaction_id uuid;
  v_recipient_transaction_id uuid;
  v_recipient_wallet_id uuid;
  v_payer_wallet_currency text;
  v_recipient_wallet_currency text;
  v_payer_rate numeric(18, 8);
  v_recipient_rate numeric(18, 8);
begin
  if p_amount is null or p_amount <= 0
     or upper(coalesce(p_currency, '')) !~ '^[A-Z]{3}$' then
    raise exception 'Invalid allowance amount or currency' using errcode = '22023';
  end if;
  select * into v_connection
  from public.allowance_connections
  where id = p_connection_id and payer_id = p_payer_id and status = 'active'
  for share;
  if not found then
    raise exception 'Active allowance connection not found' using errcode = 'P0002';
  end if;

  if p_recurring_id is not null and p_scheduled_for is not null then
    select id into v_payer_transaction_id
    from public.transactions
    where owner_id = p_payer_id
      and recurring_transaction_id = p_recurring_id
      and recurring_scheduled_for = p_scheduled_for;
    if v_payer_transaction_id is not null then
      select id into v_recipient_transaction_id
      from public.transactions
      where allowance_pair_id = (
        select allowance_pair_id from public.transactions
        where id = v_payer_transaction_id
      ) and allowance_role = 'recipient';
      return jsonb_build_object(
        'payer_transaction_id', v_payer_transaction_id,
        'recipient_transaction_id', v_recipient_transaction_id
      );
    end if;
  end if;

  select w.id, c.symbol into v_recipient_wallet_id, v_recipient_wallet_currency
  from public.wallets w
  join public.currencies c on c.id = w.currency_id
  where w.owner_id = v_connection.recipient_id
  order by w.is_default desc, w.creation_date, w.id
  limit 1;
  select c.symbol into v_payer_wallet_currency
  from public.wallets w join public.currencies c on c.id = w.currency_id
  where w.owner_id = p_payer_id and w.id = p_wallet_id;
  if v_recipient_wallet_id is null or v_payer_wallet_currency is null then
    raise exception 'Allowance wallet not found' using errcode = 'P0002';
  end if;

  v_payer_rate := public.get_exchange_rate(
    upper(p_currency), v_payer_wallet_currency, p_occurred_at::date
  );
  v_recipient_rate := public.get_exchange_rate(
    upper(p_currency), v_recipient_wallet_currency, p_occurred_at::date
  );
  if v_payer_rate is null or v_recipient_rate is null then
    raise exception 'Allowance exchange rate not found' using errcode = 'P0002';
  end if;

  perform set_config('spendist.allowance_internal', 'on', true);
  insert into public.transactions (
    owner_id, category_id, wallet_id, occurred_at, description,
    amount, amount_in_default, currency, exchange_rate, is_automatic,
    direction, place_id, recurring_transaction_id, recurring_scheduled_for,
    source_module, allowance_pair_id, allowance_role, allowance_connection_id
  )
  values (
    p_payer_id, p_category_id, p_wallet_id, p_occurred_at, p_description,
    p_amount, round(p_amount * v_payer_rate, 2), upper(p_currency),
    v_payer_rate, p_is_automatic, 'expense', p_place_id, p_recurring_id,
    p_scheduled_for, 'allowance', v_pair_id, 'payer', p_connection_id
  )
  returning id into v_payer_transaction_id;

  insert into public.transactions (
    owner_id, category_id, wallet_id, occurred_at, description,
    amount, amount_in_default, currency, exchange_rate, is_automatic,
    direction, source_module, allowance_pair_id, allowance_role,
    allowance_connection_id
  )
  values (
    v_connection.recipient_id, v_connection.recipient_category_id,
    v_recipient_wallet_id, p_occurred_at, p_description, p_amount,
    round(p_amount * v_recipient_rate, 2), upper(p_currency),
    v_recipient_rate, p_is_automatic, 'income', 'allowance',
    v_pair_id, 'recipient', p_connection_id
  )
  returning id into v_recipient_transaction_id;

  insert into public.notifications (owner_id, type, payload)
  values (
    v_connection.recipient_id,
    'allowance_received',
    jsonb_build_object(
      'transaction_id', v_recipient_transaction_id,
      'connection_id', p_connection_id,
      'description', p_description,
      'amount', p_amount,
      'currency', upper(p_currency),
      'occurred_at', p_occurred_at
    )
  );

  perform set_config('spendist.allowance_internal', 'off', true);
  return jsonb_build_object(
    'payer_transaction_id', v_payer_transaction_id,
    'recipient_transaction_id', v_recipient_transaction_id
  );
end;
$$;

create or replace function public.create_allowance_transaction(
  p_connection_id uuid,
  p_category_id uuid,
  p_wallet_id uuid,
  p_occurred_at timestamptz,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_place_id uuid default null,
  p_tag_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_transaction_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  v_result := public.create_allowance_transaction_pair_internal(
    p_connection_id, auth.uid(), p_category_id, p_wallet_id, p_occurred_at,
    p_description, p_amount, p_currency, p_place_id, false, null, null
  );
  v_transaction_id := (v_result ->> 'payer_transaction_id')::uuid;
  insert into public.transaction_tags (transaction_id, tag_id, owner_id)
  select v_transaction_id, t.id, auth.uid()
  from public.tags t
  where t.owner_id = auth.uid() and t.id = any(coalesce(p_tag_ids, '{}'::uuid[]))
  on conflict do nothing;
  return v_result;
end;
$$;

create or replace function public.update_allowance_transaction(
  p_transaction_id uuid,
  p_category_id uuid,
  p_wallet_id uuid,
  p_occurred_at timestamptz,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_place_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payer public.transactions%rowtype;
  v_recipient public.transactions%rowtype;
  v_payer_wallet_currency text;
  v_recipient_wallet_currency text;
  v_payer_rate numeric(18, 8);
  v_recipient_rate numeric(18, 8);
begin
  select * into v_payer from public.transactions
  where id = p_transaction_id and owner_id = auth.uid()
    and source_module = 'allowance' and allowance_role = 'payer'
  for update;
  if not found then
    raise exception 'Allowance transaction not found' using errcode = 'P0002';
  end if;
  select * into v_recipient from public.transactions
  where allowance_pair_id = v_payer.allowance_pair_id
    and allowance_role = 'recipient'
  for update;
  if not found then
    raise exception 'Allowance recipient transaction not found' using errcode = 'P0002';
  end if;

  select c.symbol into v_payer_wallet_currency
  from public.wallets w join public.currencies c on c.id = w.currency_id
  where w.owner_id = auth.uid() and w.id = p_wallet_id;
  select c.symbol into v_recipient_wallet_currency
  from public.wallets w join public.currencies c on c.id = w.currency_id
  where w.owner_id = v_recipient.owner_id and w.id = v_recipient.wallet_id;
  v_payer_rate := public.get_exchange_rate(
    upper(p_currency), v_payer_wallet_currency, p_occurred_at::date
  );
  v_recipient_rate := public.get_exchange_rate(
    upper(p_currency), v_recipient_wallet_currency, v_recipient.occurred_at::date
  );
  if v_payer_rate is null or v_recipient_rate is null then
    raise exception 'Allowance exchange rate not found' using errcode = 'P0002';
  end if;

  perform set_config('spendist.allowance_internal', 'on', true);
  update public.transactions set
    category_id = p_category_id,
    wallet_id = p_wallet_id,
    occurred_at = p_occurred_at,
    description = p_description,
    amount = p_amount,
    amount_in_default = round(p_amount * v_payer_rate, 2),
    currency = upper(p_currency),
    exchange_rate = v_payer_rate,
    place_id = p_place_id
  where id = v_payer.id;
  update public.transactions set
    amount = p_amount,
    amount_in_default = round(p_amount * v_recipient_rate, 2),
    currency = upper(p_currency),
    exchange_rate = v_recipient_rate
  where id = v_recipient.id;
  perform set_config('spendist.allowance_internal', 'off', true);
  return v_payer.id;
end;
$$;

create or replace function public.delete_allowance_transaction(
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pair_id uuid;
begin
  select allowance_pair_id into v_pair_id
  from public.transactions
  where id = p_transaction_id and owner_id = auth.uid()
    and source_module = 'allowance' and allowance_role = 'payer'
  for update;
  if v_pair_id is null then
    raise exception 'Allowance transaction not found' using errcode = 'P0002';
  end if;
  perform set_config('spendist.allowance_internal', 'on', true);
  delete from public.transactions where allowance_pair_id = v_pair_id;
  perform set_config('spendist.allowance_internal', 'off', true);
end;
$$;

create or replace function public.disconnect_allowance_connection(
  p_connection_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.allowance_connections
  set status = 'disconnected',
      disconnected_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_connection_id
    and status = 'active'
    and (payer_id = auth.uid() or recipient_id = auth.uid());
  if not found then
    raise exception 'Active allowance connection not found' using errcode = 'P0002';
  end if;
  update public.recurring_transactions
  set is_paused = true,
      paused_at = timezone('utc', now())
  where allowance_connection_id = p_connection_id
    and source_module = 'allowance'
    and is_paused = false;
end;
$$;

alter function public.enqueue_recurring_transaction(uuid, timestamptz)
  rename to enqueue_standard_recurring_transaction;
alter function public.complete_recurring_transaction_occurrence(uuid, numeric)
  rename to complete_standard_recurring_transaction_occurrence;

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
  v_result jsonb;
  v_transaction_id uuid;
begin
  select * into v_recurring
  from public.recurring_transactions where id = p_recurring_id for update;
  if found and auth.uid() is not null and auth.uid() <> v_recurring.owner_id then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not found or v_recurring.source_module <> 'allowance' then
    return public.enqueue_standard_recurring_transaction(p_recurring_id, p_run_at);
  end if;
  if v_recurring.is_paused or p_run_at::date < v_recurring.start_date then
    return null;
  end if;
  if v_recurring.end_date is not null and p_run_at::date > v_recurring.end_date then
    return public.enqueue_standard_recurring_transaction(p_recurring_id, p_run_at);
  end if;
  if v_recurring.amount_mode = 'variable' then
    return public.enqueue_standard_recurring_transaction(p_recurring_id, p_run_at);
  end if;
  v_result := public.create_allowance_transaction_pair_internal(
    v_recurring.allowance_connection_id, v_recurring.owner_id,
    v_recurring.category_id, v_recurring.wallet_id, p_run_at,
    v_recurring.name, v_recurring.amount, v_recurring.currency, null,
    true, v_recurring.id, p_run_at
  );
  v_transaction_id := (v_result ->> 'payer_transaction_id')::uuid;
  insert into public.transaction_tags (transaction_id, tag_id, owner_id)
  select v_transaction_id, tag_id, owner_id
  from public.recurring_transaction_tags
  where recurring_transaction_id = v_recurring.id
  on conflict do nothing;
  insert into public.notifications (owner_id, type, payload)
  values (
    v_recurring.owner_id,
    'recurring_transaction_created',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'recurring_transaction_id', v_recurring.id,
      'description', v_recurring.name,
      'amount', v_recurring.amount,
      'currency', v_recurring.currency,
      'direction', 'expense',
      'occurred_at', p_run_at
    )
  );
  update public.recurring_transactions
  set last_run_at = p_run_at where id = v_recurring.id;
  return v_transaction_id;
end;
$$;

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
  v_result jsonb;
  v_transaction_id uuid;
  v_rate numeric(18, 8);
begin
  select * into v_occurrence
  from public.recurring_transaction_occurrences
  where id = p_occurrence_id for update;
  if not found then
    raise exception 'Recurring occurrence not found' using errcode = 'P0002';
  end if;
  select * into v_recurring
  from public.recurring_transactions
  where id = v_occurrence.recurring_transaction_id;
  if v_recurring.source_module <> 'allowance' then
    return public.complete_standard_recurring_transaction_occurrence(
      p_occurrence_id, p_amount
    );
  end if;
  if auth.uid() is not null and auth.uid() <> v_recurring.owner_id then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  v_result := public.create_allowance_transaction_pair_internal(
    v_recurring.allowance_connection_id, v_recurring.owner_id,
    v_recurring.category_id, v_recurring.wallet_id,
    v_occurrence.scheduled_for, v_recurring.name, p_amount,
    v_recurring.currency, null, true, v_recurring.id,
    v_occurrence.scheduled_for
  );
  v_transaction_id := (v_result ->> 'payer_transaction_id')::uuid;
  v_rate := public.get_exchange_rate(
    v_recurring.currency,
    (select c.symbol from public.wallets w join public.currencies c
      on c.id = w.currency_id where w.id = v_recurring.wallet_id),
    v_occurrence.scheduled_for::date
  );
  update public.recurring_transaction_occurrences
  set amount = p_amount,
      amount_in_default = round(p_amount * v_rate, 2),
      exchange_rate = v_rate,
      transaction_id = v_transaction_id,
      updated_at = timezone('utc', now())
  where id = v_occurrence.id;
  return v_transaction_id;
end;
$$;

revoke all on function public.create_allowance_invitation(text)
  from public, anon;
grant execute on function public.create_allowance_invitation(text)
  to authenticated;
revoke all on function public.respond_allowance_invitation(uuid, boolean)
  from public, anon;
grant execute on function public.respond_allowance_invitation(uuid, boolean)
  to authenticated;
revoke all on function public.accept_allowance_invitation(text)
  from public, anon;
grant execute on function public.accept_allowance_invitation(text)
  to authenticated;
revoke all on function public.get_allowance_connections()
  from public, anon;
grant execute on function public.get_allowance_connections()
  to authenticated;
revoke all on function public.create_allowance_transaction(
  uuid, uuid, uuid, timestamptz, text, numeric, text, uuid, uuid[]
) from public, anon;
grant execute on function public.create_allowance_transaction(
  uuid, uuid, uuid, timestamptz, text, numeric, text, uuid, uuid[]
) to authenticated;
revoke all on function public.update_allowance_transaction(
  uuid, uuid, uuid, timestamptz, text, numeric, text, uuid
) from public, anon;
grant execute on function public.update_allowance_transaction(
  uuid, uuid, uuid, timestamptz, text, numeric, text, uuid
) to authenticated;
revoke all on function public.delete_allowance_transaction(uuid)
  from public, anon;
grant execute on function public.delete_allowance_transaction(uuid)
  to authenticated;
revoke all on function public.disconnect_allowance_connection(uuid)
  from public, anon;
grant execute on function public.disconnect_allowance_connection(uuid)
  to authenticated;
revoke all on function public.enqueue_recurring_transaction(uuid, timestamptz)
  from public, anon;
grant execute on function public.enqueue_recurring_transaction(uuid, timestamptz)
  to authenticated, service_role;
revoke all on function public.complete_recurring_transaction_occurrence(uuid, numeric)
  from public, anon;
grant execute on function public.complete_recurring_transaction_occurrence(uuid, numeric)
  to authenticated, service_role;
revoke all on function public.set_allowance_invitation_delivery(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_allowance_invitation_delivery(uuid, text)
  to service_role;

revoke all on function public.ensure_allowance_connection(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.create_allowance_transaction_pair_internal(
  uuid, uuid, uuid, uuid, timestamptz, text, numeric, text, uuid,
  boolean, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.enqueue_standard_recurring_transaction(
  uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.complete_standard_recurring_transaction_occurrence(
  uuid, numeric
) from public, anon, authenticated;

comment on table public.allowance_connections
  is 'Directional payer-to-recipient ledger connections. No financial data is shared.';
comment on column public.transactions.allowance_pair_id
  is 'Links two ordinary transaction rows created by the Allowance module.';
