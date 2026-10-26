-- Branded HTML emails are rendered at send time by process-email. A job stores the
-- template name and the data it needs; subject/body stay as the plain-text fallback.
-- Notification emails now include transaction details. template_data is cleared
-- together with subject/body as soon as a job is sent, fails or expires.
alter table spendist_email.jobs add column if not exists template text;
alter table spendist_email.jobs add column if not exists template_data jsonb;
alter table spendist_email.jobs drop constraint if exists jobs_template_check;
alter table spendist_email.jobs add constraint jobs_template_check check (
  template is null or template in (
    'auth.signup','auth.recovery','auth.magiclink','auth.invite','auth.email_change','auth.reauthentication',
    'notification','invitation'
  )
);
alter table spendist_email.jobs drop constraint if exists jobs_template_data_check;
alter table spendist_email.jobs add constraint jobs_template_data_check check (
  template_data is null or (jsonb_typeof(template_data) = 'object' and length(template_data::text) <= 4096)
);

-- Same admission rules as 202610091300_reserve_auth_email_budget.sql, plus template validation.
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

create or replace function public.email_claim()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_control spendist_email.control; v_job spendist_email.jobs;
begin
  perform pg_advisory_xact_lock(713071001);
  update spendist_email.jobs set status='unknown',error_code='worker_interrupted',subject=null,body=null,template_data=null
    where status='sending' and attempted_at < now() - interval '2 minutes';
  update spendist_email.jobs set status='expired',subject=null,body=null,template_data=null
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
  -- Preferences may change while a notification email waits in the queue.
  if v_job.kind='notification' and not exists(select 1 from public.profiles where id=v_job.owner_id and email_notifications
      and not (coalesce(v_job.notification_type,'') = any(email_notification_muted_types))) then
    update spendist_email.jobs set status='expired',subject=null,body=null,template_data=null where id=v_job.id;
    return null;
  end if;
  update spendist_email.jobs set status='sending',attempts=attempts+1,attempted_at=clock_timestamp(),lease_token=gen_random_uuid()
    where id=v_job.id returning * into v_job;
  insert into spendist_email.attempts(job_id) values(v_job.id);
  update spendist_email.control set next_send_at=clock_timestamp()+interval '1 second' where id;
  return jsonb_build_object('id',v_job.id,'lease_token',v_job.lease_token,'kind',v_job.kind,
    'recipient',v_job.recipient,'subject',v_job.subject,'body',v_job.body,
    'template',v_job.template,'template_data',v_job.template_data);
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
    body=case when p_result='throttled' and attempts<3 then body else null end,
    template_data=case when p_result='throttled' and attempts<3 then template_data else null end
  where id=p_id;
  if v_job.invitation_id is not null and p_result <> 'throttled' then
    perform public.set_allowance_invitation_delivery(v_job.invitation_id,case when p_result='sent' then 'sent' else 'failed' end);
  end if;
end;
$$;

-- Subject and body stay as the plain-text fallback; process-email renders the HTML version.
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
    'recipient_name',left(new.payload->>'recipient_name',200)));
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

create or replace function public.email_allowance_invite(p_email text,p_language text default 'en')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner uuid:=auth.uid(); v_invite jsonb; v_job uuid; v_url text; v_inviter text;
begin
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
    'template_data',jsonb_strip_nulls(jsonb_build_object('language',p_language,'link',v_url,'inviter_name',left(v_inviter,200))),
    'expires_at',v_invite->>'expires_at')));
  if v_job is null then raise exception 'Email rate limit exceeded' using errcode='P0001'; end if;
  return jsonb_build_object('invited',true,'invitationId',v_invite->>'invitation_id','expiresAt',v_invite->>'expires_at');
end;
$$;

comment on function spendist_email.notification_copy(text,text) is
  'Plain-text fallback subject and body per notification type. HTML emails are rendered by process-email.';

revoke all on function public.email_enqueue(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.email_claim() from public, anon, authenticated;
revoke all on function public.email_complete(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.email_notification_enqueue() from public, anon, authenticated;
grant execute on function public.email_enqueue(uuid,text,jsonb) to service_role;
grant execute on function public.email_claim() to service_role;
grant execute on function public.email_complete(uuid,uuid,text,text) to service_role;
revoke all on function public.email_allowance_invite(text,text) from public, anon;
grant execute on function public.email_allowance_invite(text,text) to authenticated;
