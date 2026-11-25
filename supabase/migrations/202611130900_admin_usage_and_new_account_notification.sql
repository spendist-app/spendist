-- Administrator insight into adoption.
-- 1. A new notification type, created for administrators when an account confirms
--    its email address. It follows the existing notification path, so the email is
--    sent only to administrators who enabled email notifications and did not mute
--    the type. The payload holds one aggregate (confirmed accounts); the new
--    account's id, address and name never reach the notification or the email.
-- 2. admin_usage_status(): aggregate usage statistics for the private /admin panel.
--    It returns counts only. No identifiers, addresses, amounts or descriptions.

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
        'allowance_expense_added',
        'new_account_confirmed'
      )
    );

alter table public.profiles drop constraint if exists profiles_email_notification_muted_types_check;
alter table public.profiles add constraint profiles_email_notification_muted_types_check
  check (email_notification_muted_types <@ array[
    'recurring_transaction_created','recurring_transaction_ended','exchange_rates_sync_failed',
    'allowance_invitation_received','allowance_invitation_accepted','allowance_invitation_declined',
    'allowance_received','allowance_transfer_failed','allowance_expense_added','new_account_confirmed'
  ]::text[]);

-- Same copy as 202610081200_notification_email_types.sql, plus the new type.
create or replace function spendist_email.notification_copy(p_type text, p_language text)
returns jsonb language sql immutable set search_path = '' as $$
  with t(title) as (
    select case when p_language='pl' then case p_type
        when 'recurring_transaction_created' then 'Utworzono transakcję cykliczną'
        when 'recurring_transaction_ended' then 'Płatność cykliczna zakończona'
        when 'exchange_rates_sync_failed' then 'Synchronizacja kursów walut nie powiodła się'
        when 'allowance_invitation_received' then 'Nowe zaproszenie do modułu Kieszonkowe'
        when 'allowance_invitation_accepted' then 'Zaproszenie do modułu Kieszonkowe zostało zaakceptowane'
        when 'allowance_invitation_declined' then 'Zaproszenie do modułu Kieszonkowe zostało odrzucone'
        when 'allowance_received' then 'Otrzymano kieszonkowe'
        when 'allowance_expense_added' then 'Dodano wydatek z kieszonkowego'
        when 'allowance_transfer_failed' then 'Nie udało się zapisać kieszonkowego'
        when 'new_account_confirmed' then 'Nowe konto'
      end
      else case p_type
        when 'recurring_transaction_created' then 'Recurring transaction created'
        when 'recurring_transaction_ended' then 'Recurring payment ended'
        when 'exchange_rates_sync_failed' then 'Exchange rates sync failed'
        when 'allowance_invitation_received' then 'New Allowance invitation'
        when 'allowance_invitation_accepted' then 'Your Allowance invitation was accepted'
        when 'allowance_invitation_declined' then 'Your Allowance invitation was declined'
        when 'allowance_received' then 'Allowance received'
        when 'allowance_expense_added' then 'Allowance expense added'
        when 'allowance_transfer_failed' then 'Allowance could not be recorded'
        when 'new_account_confirmed' then 'New account'
      end
    end
  )
  select case when p_language='pl' then jsonb_build_object(
      'subject','Spendist: '||coalesce(title,'nowe powiadomienie'),
      'body',coalesce(title||'.','Masz nowe powiadomienie.')||' Szczegóły zobaczysz po zalogowaniu: https://spendist.app/dashboard')
    else jsonb_build_object(
      'subject','Spendist: '||coalesce(title,'new notification'),
      'body',coalesce(title||'.','You have a new notification.')||' Sign in to see the details: https://spendist.app/dashboard')
    end
  from t;
$$;
revoke all on function spendist_email.notification_copy(text,text) from public, anon, authenticated;

-- Same as 202610260900_email_templates.sql, plus the whitelisted accounts_total value.
create or replace function public.email_notification_enqueue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_language text;
  v_timezone text;
  v_copy jsonb;
  v_data jsonb;
  v_recurring record;
begin
  -- Invitation emails already have a dedicated queue entry.
  if new.type='allowance_invitation_received' then return new; end if;
  select u.email,p.language,p.timezone into v_email,v_language,v_timezone from auth.users u join public.profiles p on p.id=u.id
    where u.id=new.owner_id and u.email_confirmed_at is not null and p.email_notifications
      and not (new.type = any(p.email_notification_muted_types));
  if v_email is null then return new; end if;
  v_copy := spendist_email.notification_copy(new.type,v_language);
  -- Whitelisted, length-capped payload values only; identifiers never leave the database.
  v_data := jsonb_strip_nulls(jsonb_build_object(
    'type',new.type,
    'language',v_language,
    'timezone',left(v_timezone,64),
    'description',left(new.payload->>'description',200),
    'amount',left(new.payload->>'amount',40),
    'currency',left(new.payload->>'currency',10),
    'direction',left(new.payload->>'direction',10),
    'occurred_at',left(new.payload->>'occurred_at',40),
    'end_date',left(new.payload->>'end_date',40),
    'payer_name',left(new.payload->>'payer_name',200),
    'recipient_name',left(new.payload->>'recipient_name',200),
    'accounts_total',left(new.payload->>'accounts_total',12)));
  if new.type like 'recurring_transaction_%' then
    select r.schedule,w.name as wallet,c.name as category into v_recurring
      from public.recurring_transactions r
      left join public.wallets w on w.id=r.wallet_id and w.owner_id=r.owner_id
      left join public.categories c on c.id=r.category_id and c.owner_id=r.owner_id
      where r.owner_id=new.owner_id and r.id::text=new.payload->>'recurring_transaction_id';
    if found then
      v_data := v_data || jsonb_strip_nulls(jsonb_build_object(
        'schedule',left(v_recurring.schedule,100),
        'wallet',left(v_recurring.wallet,200),
        'category',left(v_recurring.category,200)));
    end if;
  end if;
  perform public.email_enqueue(new.owner_id,'notification:'||new.id,jsonb_build_array(jsonb_build_object(
    'recipient',v_email,'kind','notification','notification_type',new.type,
    'subject',v_copy->>'subject','body',v_copy->>'body',
    'template','notification','template_data',v_data,
    'expires_at',now()+interval '24 hours')));
  return new;
end;
$$;
revoke all on function public.email_notification_enqueue() from public, anon, authenticated;

-- Accounts that are not real users: operator test addresses, the demo dataset and administrators.
create or replace function public.is_operator_account(p_id uuid, p_email text, p_app_metadata jsonb)
returns boolean language sql stable security definer set search_path = '' as $$
  select lower(coalesce(p_email,'')) like 'test-%@spendist.app'
    or coalesce(p_app_metadata,'{}'::jsonb) ? 'demo_seed_id'
    or exists (select 1 from public.profiles p where p.id = p_id and p.is_admin);
$$;
revoke all on function public.is_operator_account(uuid,text,jsonb) from public, anon, authenticated;

create or replace function public.notify_admins_new_account()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_total bigint;
begin
  -- Email confirmation must succeed even when this notification cannot be created.
  begin
    if public.is_operator_account(new.id,new.email,new.raw_app_meta_data) then
      return new;
    end if;

    select count(*) into v_total from auth.users u
      where u.email_confirmed_at is not null
        and not public.is_operator_account(u.id,u.email,u.raw_app_meta_data);

    -- Each confirmation comes from a new account, so the cap is per administrator:
    -- a burst of sign-ups cannot fill the notification list or the email budget.
    insert into public.notifications(owner_id,type,payload)
    select p.id,'new_account_confirmed',jsonb_build_object('accounts_total',v_total)
      from public.profiles p
      where p.is_admin and p.id <> new.id
        and (select count(*) from public.notifications n
              where n.owner_id = p.id and n.type = 'new_account_confirmed'
                and n.created_at > now() - interval '24 hours') < 20;
  exception when others then
    null;
  end;

  return new;
end;
$$;
revoke all on function public.notify_admins_new_account() from public, anon, authenticated;

drop trigger if exists notify_admins_new_account on auth.users;
create trigger notify_admins_new_account
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.notify_admins_new_account();

-- Aggregate usage for the administration panel. Weeks start on Monday and days
-- follow Europe/Warsaw, the operator's reporting time zone. "Manual" excludes
-- transactions created by the recurring-payment scheduler.
create or replace function public.admin_usage_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
  v_week date := date_trunc('week', (now() at time zone 'Europe/Warsaw'))::date;
  v_result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then
    raise exception 'Administrator access required' using errcode='42501';
  end if;

  with accounts as (
    select u.id,
           (u.created_at at time zone 'Europe/Warsaw')::date as created_day,
           u.email_confirmed_at is not null as confirmed,
           u.last_sign_in_at is not null as signed_in,
           (u.last_sign_in_at at time zone 'Europe/Warsaw')::date as last_sign_in_day
      from auth.users u
      where not public.is_operator_account(u.id,u.email,u.raw_app_meta_data)
  ),
  tx as (
    select t.owner_id, (t.creation_date at time zone 'Europe/Warsaw')::date as day
      from public.transactions t
      join accounts a on a.id = t.owner_id
      where not t.is_automatic
  ),
  ranked as (
    select owner_id, day, row_number() over (partition by owner_id order by day) as rn from tx
  ),
  per_account as (
    select a.id, a.created_day, a.confirmed, a.signed_in, a.last_sign_in_day,
           count(tx.day) as manual_total,
           count(distinct date_trunc('week', tx.day)) filter (where tx.day > v_today - 28) as weeks_active_28d,
           count(tx.day) filter (where tx.day > v_today - 7) as manual_7d,
           (select r.day from ranked r where r.owner_id = a.id and r.rn = 3) as first_use_day
      from accounts a
      left join tx on tx.owner_id = a.id
      group by a.id, a.created_day, a.confirmed, a.signed_in, a.last_sign_in_day
  ),
  return_windows as (
    select p.id,
           exists (select 1 from tx where tx.owner_id = p.id
                     and tx.day >= p.first_use_day + 7 and tx.day <= p.first_use_day + 14) as returned
      from per_account p
      where p.first_use_day is not null and p.first_use_day <= v_today - 15
  ),
  weeks as (
    select (v_week - (n * 7))::date as week_start from generate_series(0, 7) as n
  )
  select jsonb_build_object(
    'generated_at', now(),
    'totals', (select jsonb_build_object(
        'accounts', count(*),
        'confirmed', count(*) filter (where confirmed),
        'with_transaction', count(*) filter (where manual_total >= 1),
        'first_use', count(*) filter (where manual_total >= 3),
        'regular_28d', count(*) filter (where weeks_active_28d >= 2),
        'active_7d', count(*) filter (where manual_7d >= 1),
        'signed_in_14d', count(*) filter (where last_sign_in_day > v_today - 14))
      from per_account),
    'recent', (select jsonb_build_object(
        'accounts_7d', count(*) filter (where created_day > v_today - 7),
        'accounts_28d', count(*) filter (where created_day > v_today - 28),
        'first_use_7d', count(*) filter (where first_use_day > v_today - 7))
      from per_account),
    'returns', (select jsonb_build_object(
        'windows', count(*),
        'returned', count(*) filter (where returned))
      from return_windows),
    'funnel_28d', (select jsonb_build_object(
        'registered', count(*),
        'confirmed', count(*) filter (where confirmed),
        'signed_in', count(*) filter (where signed_in),
        'with_transaction', count(*) filter (where manual_total >= 1),
        'first_use', count(*) filter (where manual_total >= 3))
      from per_account where created_day > v_today - 28),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object(
        'week_start', w.week_start,
        'new_accounts', (select count(*) from per_account p
                          where p.created_day between w.week_start and w.week_start + 6),
        'first_uses', (select count(*) from per_account p
                        where p.first_use_day between w.week_start and w.week_start + 6),
        'active_accounts', (select count(distinct tx.owner_id) from tx
                             where tx.day between w.week_start and w.week_start + 6))
        order by w.week_start), '[]'::jsonb)
      from weeks w)
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.admin_usage_status() from public, anon, authenticated;
grant execute on function public.admin_usage_status() to authenticated, service_role;
