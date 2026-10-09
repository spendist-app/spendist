-- Allowance hardening after the 2026-10-09 security review.
-- 1. A former payer cannot change the amount of, or delete, the recipient's
--    paired income once the connection is disconnected. Payer-only fields stay
--    editable and deleting removes only the payer's own expense.
-- 2. Counterpart e-mail addresses are visible only while a connection is active.
-- 3. Invitations go only through email_allowance_invite, which requires a
--    confirmed e-mail and serializes rate limits.
-- 4. Users may change only read_at on their own notifications.

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
  v_connection_active boolean;
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

  select exists (
    select 1 from public.allowance_connections
    where id = v_payer.allowance_connection_id and status = 'active'
  ) into v_connection_active;
  if not v_connection_active
     and (p_amount is distinct from v_payer.amount
       or upper(p_currency) is distinct from v_payer.currency) then
    raise exception 'Allowance connection is not active' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Allowance amount must be positive' using errcode = '22023';
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
  where id = v_recipient.id and v_connection_active;
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
  v_connection_id uuid;
begin
  select allowance_pair_id, allowance_connection_id into v_pair_id, v_connection_id
  from public.transactions
  where id = p_transaction_id and owner_id = auth.uid()
    and source_module = 'allowance' and allowance_role = 'payer'
  for update;
  if v_pair_id is null then
    raise exception 'Allowance transaction not found' using errcode = 'P0002';
  end if;
  perform set_config('spendist.allowance_internal', 'on', true);
  if exists (
    select 1 from public.allowance_connections
    where id = v_connection_id and status = 'active'
  ) then
    delete from public.transactions where allowance_pair_id = v_pair_id;
  else
    -- After a disconnect the recipient's income belongs to the recipient only.
    delete from public.transactions where id = p_transaction_id;
  end if;
  perform set_config('spendist.allowance_internal', 'off', true);
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
    case when c.status = 'active' then lower(u.email) end,
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

revoke all on function public.create_allowance_invitation(text)
  from public, anon, authenticated;

revoke update on table public.notifications from anon, authenticated;
grant update (read_at) on table public.notifications to authenticated;

revoke all on function public.create_allowance_recipient_expense(
  uuid, timestamptz, text, numeric, text
) from anon;
revoke all on function public.get_allowance_recipient_expenses() from anon;
revoke all on function public.update_allowance_recipient_expense(
  uuid, timestamptz, text, numeric, text
) from anon;
revoke all on function public.delete_allowance_recipient_expense(uuid) from anon;
