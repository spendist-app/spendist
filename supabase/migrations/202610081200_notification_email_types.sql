-- Per-type email opt-out inside the global email_notifications opt-in. New types are emailed by default.
alter table public.profiles add column if not exists email_notification_muted_types text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_email_notification_muted_types_check;
alter table public.profiles add constraint profiles_email_notification_muted_types_check
  check (email_notification_muted_types <@ array[
    'recurring_transaction_created','recurring_transaction_ended','exchange_rates_sync_failed',
    'allowance_invitation_received','allowance_invitation_accepted','allowance_invitation_declined',
    'allowance_received','allowance_transfer_failed','allowance_expense_added'
  ]::text[]);

-- Lets the sender re-check the per-type preference when the job is claimed.
alter table spendist_email.jobs add column if not exists notification_type text;

-- Static per-type copy: names the notification kind, never amounts, names, descriptions or payload values.
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
    insert into spendist_email.jobs(dedupe_key,owner_id,recipient,kind,subject,body,expires_at,invitation_id,notification_type)
    values(p_key || ':' || v_index,p_owner,lower(trim(v_message->>'recipient')),
      v_message->>'kind',v_message->>'subject',v_message->>'body',
      (v_message->>'expires_at')::timestamptz,(v_message->>'invitation_id')::uuid,v_message->>'notification_type')
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
  -- Preferences may change while a notification email waits in the queue.
  if v_job.kind='notification' and not exists(select 1 from public.profiles where id=v_job.owner_id and email_notifications
      and not (coalesce(v_job.notification_type,'') = any(email_notification_muted_types))) then
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

create or replace function public.email_notification_enqueue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_email text; v_language text; v_copy jsonb;
begin
  -- Invitation emails already have a dedicated queue entry.
  if new.type='allowance_invitation_received' then return new; end if;
  select u.email,p.language into v_email,v_language from auth.users u join public.profiles p on p.id=u.id
    where u.id=new.owner_id and u.email_confirmed_at is not null and p.email_notifications
      and not (new.type = any(p.email_notification_muted_types));
  if v_email is null then return new; end if;
  v_copy := spendist_email.notification_copy(new.type,v_language);
  perform public.email_enqueue(new.owner_id,'notification:'||new.id,jsonb_build_array(jsonb_build_object(
    'recipient',v_email,'kind','notification','notification_type',new.type,
    'subject',v_copy->>'subject','body',v_copy->>'body',
    'expires_at',now()+interval '24 hours')));
  return new;
end;
$$;
