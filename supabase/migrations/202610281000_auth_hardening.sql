-- Auth hardening.
-- 1. User metadata is writable by the user through Auth and is forwarded to the
--    send-email hook; it is capped so it cannot inflate every auth email payload.
-- 2. Supabase Auth keeps the first password when an unconfirmed address signs up
--    again and only resends the confirmation. A repeat sign-up (or resend) for an
--    account older than two minutes therefore clears the stored password: the
--    send-email hook mails a password-recovery prompt instead of a confirmation
--    link, and recovery confirms the address while the owner sets a new password.
-- 3. Sign-up mail gets its own share of the daily email budget.

create or replace function public.limit_auth_user_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if octet_length(coalesce(new.raw_user_meta_data, '{}'::jsonb)::text) > 16384 then
    raise exception 'User metadata is too large' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.limit_auth_user_metadata() from public, anon, authenticated;

drop trigger if exists limit_auth_user_metadata on auth.users;
create trigger limit_auth_user_metadata
  before insert or update of raw_user_meta_data on auth.users
  for each row execute function public.limit_auth_user_metadata();

create or replace function public.reset_repeat_signup_password()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null
     and new.email_confirmed_at is null
     and new.confirmation_sent_at is distinct from old.confirmation_sent_at
     and old.created_at < now() - interval '120 seconds' then
    -- An empty hash never matches, so nobody can sign in with a password chosen
    -- before the mailbox owner finishes recovery.
    new.encrypted_password := '';
  end if;

  return new;
end;
$$;

revoke all on function public.reset_repeat_signup_password() from public, anon, authenticated;

drop trigger if exists reset_repeat_signup_password on auth.users;
create trigger reset_repeat_signup_password
  before update of confirmation_sent_at on auth.users
  for each row execute function public.reset_repeat_signup_password();

alter table spendist_email.jobs drop constraint if exists jobs_template_check;
alter table spendist_email.jobs add constraint jobs_template_check check (
  template is null or template in (
    'auth.signup','auth.signup_existing','auth.recovery','auth.magiclink','auth.invite','auth.email_change','auth.reauthentication',
    'notification','invitation'
  )
);

-- Same admission rules as 202610260900_email_templates.sql, plus the sign-up share.
create or replace function public.email_enqueue(p_owner uuid, p_key text, p_messages jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := jsonb_array_length(p_messages);
  v_first uuid;
  v_message jsonb;
  v_index integer := 0;
  v_recipient text;
  v_kind text;
  v_template text;
begin
  perform pg_advisory_xact_lock(713071001);
  select id into v_first from spendist_email.jobs where dedupe_key = p_key || ':0';
  if found then return v_first; end if;
  if p_owner is null or length(p_key) not between 1 and 200 or v_count not between 1 and 2 then
    raise exception 'Invalid email batch' using errcode = '22023';
  end if;
  v_kind := p_messages->0->>'kind';
  if exists (select 1 from jsonb_array_elements(p_messages) m where m.value->>'kind' is distinct from v_kind) then
    raise exception 'Invalid email batch' using errcode = '22023';
  end if;
  if v_kind = 'auth' then
    -- Each sign-up comes from a new owner, so per-owner limits never apply to it.
    -- Sign-up mail gets its own share; the rest of the budget stays available for
    -- password recovery, email changes and sign-in links.
    if exists (select 1 from jsonb_array_elements(p_messages) m where m.value->>'template' like 'auth.signup%')
       and (select count(*) from spendist_email.jobs where template like 'auth.signup%' and created_at > now() - interval '24 hours') + v_count > 50 then
      return null;
    end if;
    if (select count(*) from spendist_email.jobs where created_at > now() - interval '24 hours') + v_count > 100
       or (select count(*) from spendist_email.jobs where owner_id = p_owner and kind = 'auth' and created_at > now() - interval '1 hour') + v_count > 5
       or (select count(*) from spendist_email.jobs where owner_id = p_owner and kind = 'auth' and created_at > now() - interval '24 hours') + v_count > 10 then
      return null;
    end if;
  elsif (select count(*) from spendist_email.jobs where kind <> 'auth' and created_at > now() - interval '24 hours') + v_count > 60
     or (select count(*) from spendist_email.jobs where created_at > now() - interval '24 hours') + v_count > 100
     or (select count(*) from spendist_email.jobs where owner_id = p_owner and kind <> 'auth' and created_at > now() - interval '1 hour') + v_count > 5
     or (select count(*) from spendist_email.jobs where owner_id = p_owner and kind <> 'auth' and created_at > now() - interval '24 hours') + v_count > 10 then
    return null;
  end if;
  for v_message in select value from jsonb_array_elements(p_messages) loop
    v_recipient := lower(trim(v_message->>'recipient'));
    v_template := v_message->>'template';
    if v_recipient is null or length(v_recipient) > 320
       or v_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       or v_message->>'kind' not in ('auth','notification','invitation')
       or coalesce(length(v_message->>'subject'),0) not between 1 and 200
       or coalesce(length(v_message->>'body'),0) not between 1 and 10000
       or v_message->>'subject' ~ E'[\r\n]'
       or (v_message->>'expires_at')::timestamptz <= now()
       or (v_message->>'expires_at')::timestamptz > now() + interval '7 days'
       -- A template must match its kind and carry a bounded data object.
       or (v_template is not null and (
         (v_template like 'auth.%') is distinct from (v_message->>'kind' = 'auth')
         or (v_message->>'kind' <> 'auth' and v_template is distinct from v_message->>'kind')
         or jsonb_typeof(v_message->'template_data') is distinct from 'object'
         or length((v_message->'template_data')::text) > 4096)) then
      raise exception 'Invalid email message' using errcode = '22023';
    end if;
    if (select count(*) from spendist_email.jobs where recipient = v_recipient and created_at > now() - interval '1 hour') >= 3
       or exists (select 1 from spendist_email.jobs where recipient = v_recipient and created_at > now() - interval '60 seconds') then
      return null;
    end if;
  end loop;
  for v_message in select value from jsonb_array_elements(p_messages) loop
    insert into spendist_email.jobs(dedupe_key,owner_id,recipient,kind,subject,body,expires_at,invitation_id,notification_type,
      template,template_data)
    values(p_key || ':' || v_index,p_owner,lower(trim(v_message->>'recipient')),
      v_message->>'kind',v_message->>'subject',v_message->>'body',
      (v_message->>'expires_at')::timestamptz,(v_message->>'invitation_id')::uuid,v_message->>'notification_type',
      v_message->>'template',case when v_message->>'template' is null then null else v_message->'template_data' end)
    returning id into v_first;
    v_index := v_index + 1;
  end loop;
  select id into v_first from spendist_email.jobs where dedupe_key = p_key || ':0';
  return v_first;
end;
$$;
