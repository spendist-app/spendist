-- All message bodies and recipients live in a schema that PostgREST does not expose.
create schema if not exists spendist_email;
revoke all on schema spendist_email from public, anon, authenticated;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists email_notifications boolean not null default false;

create or replace function public.protect_profile_admin()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and new.is_admin)
     or (tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin) then
    if current_user not in ('postgres', 'supabase_admin', 'service_role') then
      raise exception 'Administrator changes require a trusted database operator' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger protect_profile_admin before insert or update on public.profiles
for each row execute function public.protect_profile_admin();

create table spendist_email.control (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  app_limit integer not null default 100 check (app_limit between 1 and 100),
  expected_aws_limit integer not null default 100,
  expected_rate numeric not null default 1,
  region text,
  next_send_at timestamptz not null default now(),
  monitor_token uuid,
  monitor_until timestamptz,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  read_error boolean not null default true,
  snapshot jsonb
);
insert into spendist_email.control (id) values (true);
create table spendist_email.jobs (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  owner_id uuid not null,
  recipient text not null,
  kind text not null check (kind in ('auth', 'notification', 'invitation')),
  subject text,
  body text,
  invitation_id uuid,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','unknown','expired')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  lease_token uuid,
  error_code text,
  message_id text
);
create index on spendist_email.jobs (status, available_at);
create index on spendist_email.jobs (owner_id, created_at);
create index on spendist_email.jobs (recipient, created_at);
create table spendist_email.attempts (
  id bigint generated always as identity primary key,
  job_id uuid references spendist_email.jobs(id) on delete set null,
  reserved_at timestamptz not null default clock_timestamp()
);
create index on spendist_email.attempts (reserved_at);
create table spendist_email.alerts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  published_at timestamptz,
  publish_attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz
);
create unique index on spendist_email.alerts(code) where active;
alter table spendist_email.control enable row level security;
alter table spendist_email.jobs enable row level security;
alter table spendist_email.attempts enable row level security;
alter table spendist_email.alerts enable row level security;

-- Service-only, atomic batch admission (including both secure email-change recipients).
create or replace function public.email_enqueue(p_owner uuid, p_key text, p_messages jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := jsonb_array_length(p_messages);
  v_first uuid;
  v_message jsonb;
  v_index integer := 0;
  v_recipient text;
begin
  perform pg_advisory_xact_lock(713071001);
  select id into v_first from spendist_email.jobs where dedupe_key = p_key || ':0';
  if found then return v_first; end if;
  if p_owner is null or length(p_key) not between 1 and 200 or v_count not between 1 and 2 then
    raise exception 'Invalid email batch' using errcode = '22023';
  end if;
  if (select count(*) from spendist_email.jobs where created_at > now() - interval '24 hours') + v_count > 100
     or (select count(*) from spendist_email.jobs where owner_id = p_owner and created_at > now() - interval '1 hour') + v_count > 5
     or (select count(*) from spendist_email.jobs where owner_id = p_owner and created_at > now() - interval '24 hours') + v_count > 10 then
    return null;
  end if;
  for v_message in select value from jsonb_array_elements(p_messages) loop
    v_recipient := lower(trim(v_message->>'recipient'));
    if v_recipient is null or length(v_recipient) > 320
       or v_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       or v_message->>'kind' not in ('auth','notification','invitation')
       or coalesce(length(v_message->>'subject'),0) not between 1 and 200
       or coalesce(length(v_message->>'body'),0) not between 1 and 10000
       or v_message->>'subject' ~ E'[\r\n]'
       or (v_message->>'expires_at')::timestamptz <= now()
       or (v_message->>'expires_at')::timestamptz > now() + interval '7 days' then
      raise exception 'Invalid email message' using errcode = '22023';
    end if;
    if (select count(*) from spendist_email.jobs where recipient = v_recipient and created_at > now() - interval '1 hour') >= 3
       or exists (select 1 from spendist_email.jobs where recipient = v_recipient and created_at > now() - interval '60 seconds') then
      return null;
    end if;
  end loop;
  for v_message in select value from jsonb_array_elements(p_messages) loop
    insert into spendist_email.jobs(dedupe_key,owner_id,recipient,kind,subject,body,expires_at,invitation_id)
    values(p_key || ':' || v_index,p_owner,lower(trim(v_message->>'recipient')),
      v_message->>'kind',v_message->>'subject',v_message->>'body',
      (v_message->>'expires_at')::timestamptz,(v_message->>'invitation_id')::uuid)
    returning id into v_first;
    v_index := v_index + 1;
  end loop;
  select id into v_first from spendist_email.jobs where dedupe_key = p_key || ':0';
  return v_first;
end;
$$;

create or replace function public.email_claim()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_control spendist_email.control; v_job spendist_email.jobs;
begin
  perform pg_advisory_xact_lock(713071001);
  update spendist_email.jobs set status='unknown',error_code='worker_interrupted',subject=null,body=null
    where status='sending' and attempted_at < now() - interval '2 minutes';
  update spendist_email.jobs set status='expired',subject=null,body=null
    where status='queued' and expires_at <= now();
  select * into v_control from spendist_email.control where id;
  if not v_control.enabled or v_control.read_error or v_control.last_success_at < now()-interval '10 minutes'
     or v_control.last_success_at is null or v_control.next_send_at > clock_timestamp()
     or coalesce((v_control.snapshot->>'sending_enabled')::boolean,false) = false
     or least(v_control.app_limit,coalesce((v_control.snapshot->>'aws_limit')::numeric,0)) <=
       coalesce((v_control.snapshot->>'sent_24h')::numeric,0) +
       (select count(*) from spendist_email.attempts where reserved_at > v_control.last_success_at)
     or (select count(*) from spendist_email.attempts where reserved_at > clock_timestamp()-interval '24 hours') >= v_control.app_limit
     or exists(select 1 from spendist_email.jobs where status='sending') then
    return null;
  end if;
  select * into v_job from spendist_email.jobs where status='queued' and available_at <= now()
    order by (kind='auth') desc, created_at limit 1 for update skip locked;
  if not found then return null; end if;
  if v_job.kind='notification' and not exists(select 1 from public.profiles where id=v_job.owner_id and email_notifications) then
    update spendist_email.jobs set status='expired',subject=null,body=null where id=v_job.id;
    return null;
  end if;
  update spendist_email.jobs set status='sending',attempts=attempts+1,attempted_at=clock_timestamp(),lease_token=gen_random_uuid()
    where id=v_job.id returning * into v_job;
  insert into spendist_email.attempts(job_id) values(v_job.id);
  update spendist_email.control set next_send_at=clock_timestamp()+interval '1 second' where id;
  return jsonb_build_object('id',v_job.id,'lease_token',v_job.lease_token,'kind',v_job.kind,
    'recipient',v_job.recipient,'subject',v_job.subject,'body',v_job.body);
end;
$$;

create or replace function public.email_complete(p_id uuid,p_token uuid,p_result text,p_message_id text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_job spendist_email.jobs;
begin
  perform pg_advisory_xact_lock(713071001);
  select * into v_job from spendist_email.jobs where id=p_id and status='sending' and lease_token=p_token for update;
  if not found then return; end if;
  if p_result not in ('sent','throttled','rejected','unknown') then raise exception 'Invalid result'; end if;
  update spendist_email.jobs set
    status=case when p_result='sent' then 'sent' when p_result='throttled' and attempts < 3 then 'queued'
      when p_result='unknown' then 'unknown' else 'failed' end,
    available_at=now()+interval '10 minutes',
    error_code=case when p_result='sent' then null else p_result end,
    message_id=left(p_message_id,200),
    subject=case when p_result='throttled' and attempts<3 then subject else null end,
    body=case when p_result='throttled' and attempts<3 then body else null end
  where id=p_id;
  if v_job.invitation_id is not null and p_result <> 'throttled' then
    perform public.set_allowance_invitation_delivery(v_job.invitation_id,case when p_result='sent' then 'sent' else 'failed' end);
  end if;
end;
$$;

create or replace function public.email_monitor_claim()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_token uuid := gen_random_uuid();
begin
  update spendist_email.control set monitor_token=v_token,monitor_until=now()+interval '2 minutes'
    where id and (monitor_until is null or monitor_until < now());
  if found then return v_token; end if;
  return null;
end;
$$;

create or replace function public.email_monitor_record(p_token uuid,p_snapshot jsonb,p_region text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_control spendist_email.control; v_codes text[] := '{}'; v_code text; v_used numeric;
begin
  select * into v_control from spendist_email.control where id for update;
  if v_control.monitor_token is distinct from p_token or v_control.monitor_until < now() then return false; end if;
  update spendist_email.control set last_attempt_at=now(),read_error=(p_snapshot is null),
    last_success_at=case when p_snapshot is null then last_success_at else now() end,
    snapshot=coalesce(p_snapshot,snapshot) where id;
  if p_snapshot is null then
    v_codes:=array_append(v_codes,'monitor_read_failed');
    -- Keep previous active conditions until a successful read resolves them.
    select v_codes || coalesce(array_agg(code),'{}') into v_codes from spendist_email.alerts where active;
  else
    if (p_snapshot->>'aws_limit')::numeric <> v_control.expected_aws_limit
      or (p_snapshot->>'max_rate')::numeric <> v_control.expected_rate
      or p_region is distinct from v_control.region then v_codes:=array_append(v_codes,'quota_mismatch'); end if;
    if not (p_snapshot->>'sending_enabled')::boolean then v_codes:=array_append(v_codes,'sending_disabled'); end if;
    if (p_snapshot->>'sent_24h')::numeric >= (p_snapshot->>'aws_limit')::numeric then v_codes:=array_append(v_codes,'aws_quota_exhausted'); end if;
    if p_snapshot->>'enforcement_status' <> 'HEALTHY' then v_codes:=array_append(v_codes,'ses_account_problem'); end if;
    select greatest((p_snapshot->>'sent_24h')::numeric,count(*)) into v_used
      from spendist_email.attempts where reserved_at > now()-interval '24 hours';
    if v_used >= v_control.app_limit*0.8 then v_codes:=array_append(v_codes,'usage_80'); end if;
    if v_used >= v_control.app_limit*0.95 then v_codes:=array_append(v_codes,'usage_95'); end if;
    if v_used >= v_control.app_limit then v_codes:=array_append(v_codes,'app_limit_exhausted'); end if;
  end if;
  if exists(select 1 from spendist_email.jobs where status in ('failed','unknown') and attempted_at > now()-interval '24 hours')
    then v_codes:=array_append(v_codes,'delivery_problem'); end if;
  if exists(select 1 from spendist_email.jobs where status='queued' and created_at < now()-interval '10 minutes')
    then v_codes:=array_append(v_codes,'queue_delayed'); end if;
  update spendist_email.alerts set active=false,resolved_at=now() where active and not(code=any(v_codes));
  foreach v_code in array v_codes loop
    insert into spendist_email.alerts(code) values(v_code) on conflict(code) where active do nothing;
  end loop;
  return true;
end;
$$;

create or replace function public.email_monitor_release(p_token uuid)
returns void language sql security definer set search_path = '' as $$
  update spendist_email.control set monitor_until=null,monitor_token=null where id and monitor_token=p_token;
$$;

create or replace function public.email_alert_claim(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_alert spendist_email.alerts;
begin
  if not exists(select 1 from spendist_email.control where monitor_token=p_token and monitor_until>now()) then return null; end if;
  select * into v_alert from spendist_email.alerts where active and published_at is null and publish_attempts<3
    and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by created_at limit 1 for update skip locked;
  if not found then return null; end if;
  update spendist_email.alerts set lease_token=gen_random_uuid(),lease_until=now()+interval '1 minute',
    publish_attempts=publish_attempts+1,next_attempt_at=now()+interval '10 minutes'
    where id=v_alert.id returning * into v_alert;
  return jsonb_build_object('id',v_alert.id,'code',v_alert.code,'lease_token',v_alert.lease_token);
end;
$$;
create or replace function public.email_alert_complete(p_id uuid,p_token uuid,p_success boolean)
returns void language sql security definer set search_path = '' as $$
  update spendist_email.alerts set published_at=case when p_success then now() else null end,lease_until=null
    where id=p_id and lease_token=p_token;
$$;

create or replace function public.email_admin_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  select jsonb_build_object('enabled',enabled,'app_limit',app_limit,'expected_aws_limit',expected_aws_limit,
    'expected_rate',expected_rate,'region',region,'last_attempt_at',last_attempt_at,
    'last_success_at',last_success_at,'read_error',read_error,'snapshot',snapshot,
    'attempts_24h',(select count(*) from spendist_email.attempts where reserved_at>now()-interval '24 hours'),
    'sent_24h',(select count(*) from spendist_email.jobs where status='sent' and attempted_at>now()-interval '24 hours'),
    'queue',(select coalesce(jsonb_object_agg(status,total),'{}') from
      (select status,count(*) total from spendist_email.jobs group by status) q),
    'alerts',(select coalesce(jsonb_agg(a),'[]') from
      (select code,active,created_at,resolved_at,published_at,publish_attempts from spendist_email.alerts order by created_at desc limit 50) a))
    into v_result from spendist_email.control where id;
  return v_result;
end;
$$;

create or replace function public.email_notification_enqueue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_email text; v_language text;
begin
  -- Invitation emails already have a dedicated queue entry.
  if new.type='allowance_invitation_received' then return new; end if;
  select u.email,p.language into v_email,v_language from auth.users u join public.profiles p on p.id=u.id
    where u.id=new.owner_id and u.email_confirmed_at is not null and p.email_notifications;
  if v_email is null then return new; end if;
  perform public.email_enqueue(new.owner_id,'notification:'||new.id,jsonb_build_array(jsonb_build_object(
    'recipient',v_email,'kind','notification',
    'subject',case when v_language='pl' then 'Nowe powiadomienie w Spendist' else 'New Spendist notification' end,
    'body',case when v_language='pl' then 'Masz nowe powiadomienie. Zaloguj się: https://spendist.app/dashboard'
      else 'You have a new notification. Sign in: https://spendist.app/dashboard' end,
    'expires_at',now()+interval '24 hours')));
  return new;
end;
$$;
create trigger email_notification_enqueue after insert on public.notifications for each row execute function public.email_notification_enqueue();

-- Never grant a browser direct access to recipients, bodies, controls or alert history.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like 'email_%' or p.proname='protect_profile_admin') loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end;
$$;
grant execute on function public.email_admin_status() to authenticated;

-- Admission and invitation creation share a transaction; concurrent requests cannot bypass limits.
create or replace function public.email_allowance_invite(p_email text,p_language text default 'en')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner uuid:=auth.uid(); v_invite jsonb; v_job uuid; v_url text;
begin
  if v_owner is null or not exists(select 1 from auth.users where id=v_owner and email_confirmed_at is not null) then
    raise exception 'Verified account required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text,713071002));
  v_invite:=public.create_allowance_invitation(p_email);
  v_url:='https://spendist.app/allowance/invite#token='||(v_invite->>'token');
  v_job:=public.email_enqueue(v_owner,'invitation:'||(v_invite->>'invitation_id'),jsonb_build_array(jsonb_build_object(
    'recipient',p_email,'kind','invitation','invitation_id',v_invite->>'invitation_id',
    'subject',case when p_language='pl' then 'Zaproszenie do Kieszonkowego w Spendist' else 'Spendist Allowance invitation' end,
    'body',case when p_language='pl' then 'Zaproszenie do połączenia kont w module Kieszonkowe: '||v_url||
      E'\nLink jest ważny przez 7 dni. Spendist zapisuje wpisy budżetowe i nie przesyła pieniędzy.'
      else 'Connect through Spendist Allowance: '||v_url||
      E'\nThe link expires in 7 days. Spendist records budget entries and does not transfer money.' end,
    'expires_at',v_invite->>'expires_at')));
  if v_job is null then raise exception 'Email rate limit exceeded' using errcode='P0001'; end if;
  return jsonb_build_object('invited',true,'invitationId',v_invite->>'invitation_id','expiresAt',v_invite->>'expires_at');
end;
$$;
revoke all on function public.email_allowance_invite(text,text) from public,anon;
grant execute on function public.email_allowance_invite(text,text) to authenticated;

create or replace function public.email_account_cleanup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from spendist_email.jobs where owner_id=old.id;
  return old;
end;
$$;
revoke all on function public.email_account_cleanup() from public, anon, authenticated;
create trigger email_account_cleanup after delete on auth.users for each row execute function public.email_account_cleanup();
