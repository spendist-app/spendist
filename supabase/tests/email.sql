-- Run only against the dedicated spendist_email_test database.
\set ON_ERROR_STOP on
select current_database() = 'spendist_email_test' as isolated \gset
\if :isolated
\else
  \quit 1
\endif
begin;
insert into public.currencies(id,symbol) values(1,'PLN') on conflict do nothing;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data,created_at,updated_at)
values ('71000000-0000-0000-0000-000000000001','authenticated','authenticated','test@example.test',now(),
  '{"full_name":"Email Test","language":"en","is_admin":true}',now(),now());
do $$
begin
  if (select is_admin from public.profiles where id='71000000-0000-0000-0000-000000000001') then
    raise exception 'Metadata elevated admin privileges';
  end if;
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
do $$
declare blocked boolean := false;
begin
  begin perform public.email_admin_status(); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Non-admin received statistics'; end if;
  blocked:=false;
  begin update public.profiles set is_admin=true where id=auth.uid(); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'User elevated admin privileges'; end if;
  blocked:=false;
  begin perform public.email_claim(); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'User invoked sender'; end if;
  blocked:=false;
  begin perform public.email_enqueue(auth.uid(),'malicious','[]'); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'User invoked arbitrary email enqueue'; end if;
  blocked:=false;
  begin perform 1 from spendist_email.jobs; exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'User read recipients'; end if;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update public.profiles set is_admin=true where id='71000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
do $$ declare result jsonb;
begin
  result:=public.email_admin_status();
  if result ? 'recipient' or result ? 'body' or result ? 'jobs' then raise exception 'Admin leaked message data'; end if;
end;
$$;
reset role;
do $$
declare owner uuid:='71000000-0000-0000-0000-000000000001'; first_id uuid; second_id uuid; message jsonb;
begin
  message:=jsonb_build_array(jsonb_build_object('recipient','test@example.test','kind','auth',
    'subject','Test','body','Test only','expires_at',now()+interval '15 minutes'));
  first_id:=public.email_enqueue(owner,'dedupe-test',message);
  second_id:=public.email_enqueue(owner,'dedupe-test',message);
  if first_id is null or first_id<>second_id then raise exception 'Deduplication failed'; end if;
  if public.email_enqueue(owner,'cooldown-test',message) is not null then raise exception 'Recipient cooldown bypassed'; end if;
  if public.email_claim() is not null then raise exception 'Disabled sender claimed job'; end if;
end;
$$;

update spendist_email.control set enabled=true,read_error=false,last_success_at=now(),region='eu-central-1',
  snapshot='{"sent_24h":0,"aws_limit":100,"max_rate":1,"sending_enabled":true,"production_access":true,"enforcement_status":"HEALTHY"}';
do $$
declare job jsonb;
begin
  job:=public.email_claim();
  if job is null then raise exception 'Could not claim job'; end if;
  if public.email_claim() is not null then raise exception 'Concurrent sender claimed another job'; end if;
  perform public.email_complete((job->>'id')::uuid,(job->>'lease_token')::uuid,'unknown');
  if (select status from spendist_email.jobs where id=(job->>'id')::uuid)<>'unknown' then raise exception 'Uncertain delivery requeued'; end if;
end;
$$;
-- Notification emails honour the global opt-in and the per-type opt-out, and never include payload values.
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data,created_at,updated_at)
values ('71000000-0000-0000-0000-000000000002','authenticated','authenticated','notify@example.test',now(),
  '{"full_name":"Notify Test","language":"pl"}',now(),now());
update public.profiles set email_notifications=true,email_notification_muted_types='{recurring_transaction_created}'
  where id='71000000-0000-0000-0000-000000000002';
do $$
declare blocked boolean := false;
begin
  begin
    update public.profiles set email_notification_muted_types='{unknown_type}' where id='71000000-0000-0000-0000-000000000002';
  exception when check_violation then blocked:=true; end;
  if not blocked then raise exception 'Unknown muted notification type accepted'; end if;
end;
$$;
do $$
declare owner uuid:='71000000-0000-0000-0000-000000000002'; job spendist_email.jobs;
begin
  insert into public.notifications(owner_id,type,payload)
    values(owner,'allowance_received','{"description":"Secret gift","amount":"123.45","currency":"PLN"}');
  select * into job from spendist_email.jobs where owner_id=owner;
  if job.id is null or job.kind<>'notification' or job.notification_type<>'allowance_received' then
    raise exception 'Notification email not queued';
  end if;
  if job.subject<>'Spendist: Otrzymano kieszonkowe' or job.body not like 'Otrzymano kieszonkowe.%' then
    raise exception 'Notification email does not name its type';
  end if;
  if job.body like '%Secret%' or job.body like '%123.45%' then raise exception 'Notification email leaked payload'; end if;
  update spendist_email.jobs set created_at=now()-interval '2 days' where owner_id=owner;

  insert into public.notifications(owner_id,type) values(owner,'recurring_transaction_created');
  insert into public.notifications(owner_id,type) values(owner,'allowance_invitation_received');
  if (select count(*) from spendist_email.jobs where owner_id=owner)<>1 then
    raise exception 'Muted or invitation notification queued an email';
  end if;

  update public.profiles set email_notifications=false where id=owner;
  insert into public.notifications(owner_id,type) values(owner,'allowance_expense_added');
  if (select count(*) from spendist_email.jobs where owner_id=owner)<>1 then raise exception 'Opted-out user queued an email'; end if;

  update public.profiles set email_notifications=true,email_notification_muted_types='{}' where id=owner;
  insert into public.notifications(owner_id,type) values(owner,'allowance_expense_added');
  select * into job from spendist_email.jobs where owner_id=owner and notification_type='allowance_expense_added';
  if job.id is null then raise exception 'Unmuted notification not queued'; end if;

  update public.profiles set email_notification_muted_types='{allowance_expense_added}' where id=owner;
  update spendist_email.jobs set status='expired' where owner_id=owner and id<>job.id;
  update spendist_email.control set next_send_at=now()-interval '1 second';
  if public.email_claim() is not null then raise exception 'Claimed notification muted after enqueue'; end if;
  if (select status from spendist_email.jobs where id=job.id)<>'expired' then raise exception 'Muted notification not expired'; end if;
  delete from spendist_email.jobs where owner_id=owner;
end;
$$;
-- Notification and invitation volume cannot consume the auth email reserve.
insert into spendist_email.jobs(owner_id,dedupe_key,recipient,kind,subject,body,expires_at)
select '71000000-0000-0000-0000-000000000001','budget-'||i,'budget-'||i||'@example.test','notification','Budget','Test',now()+interval '1 hour'
from generate_series(1,60) i;
do $$
declare owner uuid:='71000000-0000-0000-0000-000000000001';
begin
  if public.email_enqueue(owner,'budget-notification',jsonb_build_array(jsonb_build_object('recipient','notify@example.test',
    'kind','notification','subject','Test','body','Test only','expires_at',now()+interval '15 minutes'))) is not null then
    raise exception 'Non-auth email exceeded its share of the daily budget';
  end if;
  if public.email_enqueue(owner,'budget-auth',jsonb_build_array(jsonb_build_object('recipient','reset@example.test',
    'kind','auth','subject','Test','body','Test only','expires_at',now()+interval '15 minutes'))) is null then
    raise exception 'Auth email blocked by non-auth volume';
  end if;
  begin
    perform public.email_enqueue(owner,'mixed-batch',jsonb_build_array(
      jsonb_build_object('recipient','a@example.test','kind','auth','subject','T','body','T','expires_at',now()+interval '15 minutes'),
      jsonb_build_object('recipient','b@example.test','kind','notification','subject','T','body','T','expires_at',now()+interval '15 minutes')));
    raise exception 'Mixed email batch accepted';
  exception when invalid_parameter_value then null;
  end;
  delete from spendist_email.jobs where owner_id=owner;
end;
$$;
-- Every retry consumes another reservation; definitive throttles stop after three attempts.
insert into spendist_email.jobs(owner_id,dedupe_key,recipient,kind,subject,body,expires_at)
values('71000000-0000-0000-0000-000000000001','retry-test','retry@example.test','auth','Retry','Test',now()+interval '1 hour');
do $$
declare job jsonb; i integer;
begin
  for i in 1..3 loop
    update spendist_email.control set next_send_at=now()-interval '1 second';
    update spendist_email.jobs set available_at=now()-interval '1 second' where dedupe_key='retry-test';
    job:=public.email_claim();
    if job is null then raise exception 'Retry not claimed'; end if;
    perform public.email_complete((job->>'id')::uuid,(job->>'lease_token')::uuid,'throttled');
  end loop;
  if (select status from spendist_email.jobs where dedupe_key='retry-test')<>'failed' then raise exception 'Retries were not bounded'; end if;
  if (select count(*) from spendist_email.attempts)<>4 then raise exception 'Retry did not reserve budget'; end if;
end;
$$;
-- Reservations at capacity prevent sending even while the AWS snapshot is still below capacity.
insert into spendist_email.attempts(job_id) select id from spendist_email.jobs cross join generate_series(1,96) where dedupe_key='retry-test';
update spendist_email.control set next_send_at=now()-interval '1 second';
do $$ begin
  if public.email_claim() is not null then raise exception 'Exceeded daily reservation budget'; end if;
end; $$;
delete from spendist_email.attempts where id not in (select min(id) from spendist_email.attempts);
do $$
declare token uuid; old_snapshot jsonb; event_count integer;
begin
  token:=public.email_monitor_claim();
  if token is null or public.email_monitor_claim() is not null then raise exception 'Monitor lease failed'; end if;
  perform public.email_monitor_record(token,'{"sent_24h":80,"aws_limit":100,"max_rate":1,"sending_enabled":true,"production_access":true,"enforcement_status":"HEALTHY"}','eu-central-1');
  if not exists(select 1 from spendist_email.alerts where code='usage_80' and active)
    or exists(select 1 from spendist_email.alerts where code='usage_95' and active) then raise exception '80 percent threshold failed'; end if;
  perform public.email_monitor_record(token,'{"sent_24h":95,"aws_limit":100,"max_rate":1,"sending_enabled":true,"production_access":true,"enforcement_status":"HEALTHY"}','eu-central-1');
  if not exists(select 1 from spendist_email.alerts where code='usage_95' and active) then raise exception '95 percent threshold failed'; end if;
  select count(*) into event_count from spendist_email.alerts;
  select snapshot into old_snapshot from spendist_email.control;
  perform public.email_monitor_record(token,old_snapshot,'eu-central-1');
  if (select count(*) from spendist_email.alerts)<>event_count then raise exception 'Repeated monitoring duplicated alerts'; end if;
  perform public.email_monitor_record(token,null,'eu-central-1');
  if (select snapshot from spendist_email.control)<>old_snapshot then raise exception 'Failed read replaced known usage'; end if;
  if public.email_claim() is not null then raise exception 'Sending allowed during read failure'; end if;
  perform public.email_monitor_record(token,'{"sent_24h":100,"aws_limit":100,"max_rate":1,"sending_enabled":false,"production_access":true,"enforcement_status":"HEALTHY"}','eu-central-1');
  if not exists(select 1 from spendist_email.alerts where code='aws_quota_exhausted' and active)
    or not exists(select 1 from spendist_email.alerts where code='sending_disabled' and active) then raise exception 'AWS failure alerts missing'; end if;
  perform public.email_monitor_record(token,'{"sent_24h":0,"aws_limit":200,"max_rate":1,"sending_enabled":true,"production_access":false,"enforcement_status":"HEALTHY"}','eu-central-1');
  if not exists(select 1 from spendist_email.alerts where code='quota_mismatch' and active) then raise exception 'Quota mismatch not detected'; end if;
  perform public.email_monitor_release(token);
end;
$$;
do $$
declare reservations bigint;
begin
  select count(*) into reservations from spendist_email.attempts;
  delete from auth.users where id='71000000-0000-0000-0000-000000000001';
  if exists(select 1 from spendist_email.jobs where owner_id='71000000-0000-0000-0000-000000000001') then raise exception 'Account deletion retained email data'; end if;
  if (select count(*) from spendist_email.attempts)<>reservations then raise exception 'Account deletion reset budget'; end if;
end;
$$;
rollback;
