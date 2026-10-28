-- Allowance and account hardening.
-- 1. Amounts reject NaN. PostgreSQL orders NaN above every number, so `amount <= 0`
--    and `amount >= 0` checks let it through. NOT VALID: existing rows are not
--    rechecked, every new or updated row is.
-- 2. Profile names are limited to the 120 characters the form allows.
-- 3. Connected-app (OAuth client) tokens cannot invite, accept or respond to
--    Allowance invitations.
-- 4. Inviters no longer read invitee_id (whether the address has an account).
-- 5. Account deletion detaches Allowance records and deletes the Auth user in one
--    transaction: the deleted user's own Allowance rows are removed and the
--    counterpart keeps their history as ordinary transactions and paused
--    ordinary schedules. If the delete fails, nothing is detached.

do $$
declare
  v_column record;
begin
  for v_column in
    select * from (values
      ('transactions', 'amount'),
      ('transactions', 'amount_in_default'),
      ('transactions', 'exchange_rate'),
      ('recurring_transactions', 'amount'),
      ('recurring_transactions', 'exchange_rate'),
      ('recurring_transaction_occurrences', 'amount'),
      ('recurring_transaction_occurrences', 'amount_in_default'),
      ('recurring_transaction_occurrences', 'exchange_rate'),
      ('mortgage_loans', 'principal'),
      ('mortgage_loans', 'margin'),
      ('mortgage_loans', 'upfront_cost'),
      ('mortgage_overpayments', 'amount'),
      ('mortgage_rate_periods', 'fixed_rate')
    ) as c(table_name, column_name)
  loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      v_column.table_name, v_column.table_name || '_' || v_column.column_name || '_not_nan'
    );
    execute format(
      'alter table public.%I add constraint %I check (%I <> ''NaN''::numeric) not valid',
      v_column.table_name, v_column.table_name || '_' || v_column.column_name || '_not_nan',
      v_column.column_name
    );
  end loop;
end;
$$;

alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 120) not valid;

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
  -- OAuth client tokens (connected apps, including read-only ones) cannot create
  -- or accept cross-account relationships; only first-party sessions can.
  if coalesce(auth.jwt()->>'client_id', '') <> '' then
    raise exception 'Not available to connected apps' using errcode = '42501';
  end if;
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
  -- OAuth client tokens (connected apps, including read-only ones) cannot create
  -- or accept cross-account relationships; only first-party sessions can.
  if coalesce(auth.jwt()->>'client_id', '') <> '' then
    raise exception 'Not available to connected apps' using errcode = '42501';
  end if;
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

create or replace function public.email_allowance_invite(p_email text,p_language text default 'en')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner uuid:=auth.uid(); v_invite jsonb; v_job uuid; v_url text; v_inviter text;
begin
  -- OAuth client tokens (connected apps, including read-only ones) cannot create
  -- or accept cross-account relationships; only first-party sessions can.
  if coalesce(auth.jwt()->>'client_id', '') <> '' then
    raise exception 'Not available to connected apps' using errcode = '42501';
  end if;
  if v_owner is null or not exists(select 1 from auth.users where id=v_owner and email_confirmed_at is not null) then
    raise exception 'Verified account required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text,713071002));
  v_invite:=public.create_allowance_invitation(p_email);
  v_url:='https://spendist.app/allowance/invite#token='||(v_invite->>'token');
  select nullif(trim(full_name),'') into v_inviter from public.profiles where id=v_owner;
  v_job:=public.email_enqueue(v_owner,'invitation:'||(v_invite->>'invitation_id'),jsonb_build_array(jsonb_build_object(
    'recipient',p_email,'kind','invitation','invitation_id',v_invite->>'invitation_id',
    'subject',case when p_language='pl' then 'Zaproszenie do Kieszonkowego w Spendist' else 'Spendist Allowance invitation' end,
    'body',case when p_language='pl' then 'Zaproszenie do połączenia kont w module Kieszonkowe: '||v_url||
      E'\nLink jest ważny przez 7 dni. Spendist zapisuje wpisy budżetowe i nie przesyła pieniędzy.'
      else 'Connect through Spendist Allowance: '||v_url||
      E'\nThe link expires in 7 days. Spendist records budget entries and does not transfer money.' end,
    'template','invitation',
    'template_data',jsonb_strip_nulls(jsonb_build_object('language',p_language,'link',v_url,'inviter_name',left(v_inviter,120))),
    'expires_at',v_invite->>'expires_at')));
  if v_job is null then raise exception 'Email rate limit exceeded' using errcode='P0001'; end if;
  return jsonb_build_object('invited',true,'invitationId',v_invite->>'invitation_id','expiresAt',v_invite->>'expires_at');
end;
$$;

revoke select on table public.allowance_invitations from authenticated;
grant select (
  id, inviter_id, invitee_email, status, email_delivery_status,
  expires_at, responded_at, created_at, updated_at
) on table public.allowance_invitations to authenticated;

create or replace function public.detach_allowance_for_account_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('spendist.allowance_internal', 'on', true);

  delete from public.allowance_delegated_expenses d
  using public.allowance_connections c
  where d.connection_id = c.id
    and (c.payer_id = p_user_id or c.recipient_id = p_user_id);

  delete from public.transactions
  where owner_id = p_user_id and source_module = 'allowance';

  delete from public.recurring_transactions
  where owner_id = p_user_id and source_module = 'allowance';

  update public.transactions t
  set source_module = 'standard',
      allowance_pair_id = null,
      allowance_role = null,
      allowance_connection_id = null
  from public.allowance_connections c
  where t.allowance_connection_id = c.id
    and (c.payer_id = p_user_id or c.recipient_id = p_user_id);

  update public.recurring_transactions r
  set source_module = 'standard',
      allowance_connection_id = null,
      is_paused = true,
      paused_at = coalesce(r.paused_at, timezone('utc', now()))
  from public.allowance_connections c
  where r.allowance_connection_id = c.id
    and (c.payer_id = p_user_id or c.recipient_id = p_user_id);
end;
$$;

revoke all on function public.detach_allowance_for_account_deletion(uuid) from public, anon, authenticated, service_role;

create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.detach_allowance_for_account_deletion(p_user_id);

  -- Cascades through the profile to every user-owned row.
  delete from auth.users where id = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;
