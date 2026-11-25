-- Administrator usage statistics and the new-account notification.
-- Runs inside one transaction and rolls back; safe on a local database with data.
begin;

insert into public.currencies(id,symbol) values(1,'PLN') on conflict do nothing;

insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
values
  ('72000000-0000-0000-0000-000000000001','authenticated','authenticated','usage-admin@example.test',now(),
    '{"full_name":"Usage Admin","language":"en"}','{}',now(),now()),
  ('72000000-0000-0000-0000-000000000002','authenticated','authenticated','usage-user@example.test',null,
    '{"full_name":"Usage User","language":"en"}','{}',now(),now()),
  ('72000000-0000-0000-0000-000000000003','authenticated','authenticated','test-usage@spendist.app',null,
    '{"full_name":"Usage Test","language":"en"}','{}',now(),now()),
  ('72000000-0000-0000-0000-000000000004','authenticated','authenticated','usage-demo@example.test',null,
    '{"full_name":"Usage Demo","language":"en"}','{"demo_seed_id":"spendist-screenshots"}',now(),now());

update public.profiles set is_admin=true where id='72000000-0000-0000-0000-000000000001';

-- Privileges: anonymous callers cannot execute; signed-in non-administrators are rejected.
do $$
begin
  if has_function_privilege('anon','public.admin_usage_status()','execute') then
    raise exception 'anon can execute admin_usage_status';
  end if;
  if has_function_privilege('authenticated','public.notify_admins_new_account()','execute')
     or has_function_privilege('authenticated','public.is_operator_account(uuid,text,jsonb)','execute') then
    raise exception 'authenticated can execute an internal function';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000002',true);
do $$
declare blocked boolean := false;
begin
  begin perform public.admin_usage_status(); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Non-admin received usage statistics'; end if;
end;
$$;
reset role;

-- Baseline as the administrator.
create temporary table usage_before on commit drop as
  select 1 as id, null::jsonb as result;
grant all on usage_before to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000001',true);
update usage_before set result = public.admin_usage_status();
reset role;

-- Operator accounts confirm without a notification.
update auth.users set email_confirmed_at=now()
  where id in ('72000000-0000-0000-0000-000000000003','72000000-0000-0000-0000-000000000004');
do $$
begin
  if exists (select 1 from public.notifications where type='new_account_confirmed'
              and owner_id='72000000-0000-0000-0000-000000000001') then
    raise exception 'Operator account produced a new-account notification';
  end if;
end;
$$;

-- A real confirmation notifies the administrator once, with an aggregate only.
update auth.users set email_confirmed_at=now() where id='72000000-0000-0000-0000-000000000002';
update auth.users set email_confirmed_at=now() where id='72000000-0000-0000-0000-000000000002';
do $$
declare v_payload jsonb; v_count integer;
begin
  select count(*) into v_count from public.notifications
    where type='new_account_confirmed' and owner_id='72000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'Expected one notification, got %', v_count; end if;
  select payload into v_payload from public.notifications
    where type='new_account_confirmed' and owner_id='72000000-0000-0000-0000-000000000001';
  if (select array_agg(k order by k) from jsonb_object_keys(v_payload) k) <> array['accounts_total'] then
    raise exception 'Unexpected payload keys: %', v_payload;
  end if;
  if v_payload::text like '%72000000%' or v_payload::text like '%example.test%' then
    raise exception 'Payload identifies the new account';
  end if;
  if exists (select 1 from public.notifications where type='new_account_confirmed'
              and owner_id='72000000-0000-0000-0000-000000000002') then
    raise exception 'The new account was notified about itself';
  end if;
end;
$$;

-- The per-administrator cap holds during a burst of confirmations.
insert into auth.users(id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select ('72000000-0000-0000-0001-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated',
  'usage-burst-'||n||'@example.test','{"full_name":"Burst","language":"en"}','{}',now(),now()
from generate_series(1,25) n;
update auth.users set email_confirmed_at=now() where email like 'usage-burst-%@example.test';
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.notifications
    where type='new_account_confirmed' and owner_id='72000000-0000-0000-0000-000000000001';
  if v_count <> 20 then raise exception 'Cap not applied: % notifications', v_count; end if;
end;
$$;

-- Three manual transactions make a first use; automatic ones do not count.
do $$
declare v_wallet uuid; v_group uuid; v_category uuid; v_owner uuid := '72000000-0000-0000-0000-000000000002';
begin
  select id into v_wallet from public.wallets where owner_id=v_owner and is_default;
  if v_wallet is null then raise exception 'Test account has no default wallet'; end if;
  insert into public.categories_group(owner_id,name) values(v_owner,'Usage group') returning id into v_group;
  insert into public.categories(owner_id,group_id,name) values(v_owner,v_group,'Usage category') returning id into v_category;
  insert into public.transactions(owner_id,category_id,wallet_id,occurred_at,amount,currency,direction,is_automatic)
  select v_owner,v_category,v_wallet,now(),10,'PLN','expense',n > 3 from generate_series(1,5) n;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000001',true);
do $$
declare v_before jsonb; v_after jsonb; v_allowed text[] := array['funnel_28d','generated_at','recent','returns','totals','weeks'];
begin
  select result into v_before from usage_before;
  v_after := public.admin_usage_status();
  if (select array_agg(k order by k) from jsonb_object_keys(v_after) k) <> v_allowed then
    raise exception 'Unexpected result keys: %', (select array_agg(k) from jsonb_object_keys(v_after) k);
  end if;
  if v_after::text like '%@%' or v_after::text like '%72000000-%' then
    raise exception 'Usage statistics contain an identifier';
  end if;
  -- The baseline already holds the unconfirmed user; 25 burst accounts were added since.
  -- Operator accounts (test address, demo dataset, administrator) are never counted.
  if (v_after->'totals'->>'accounts')::int - (v_before->'totals'->>'accounts')::int <> 25
     or (v_after->'totals'->>'confirmed')::int - (v_before->'totals'->>'confirmed')::int <> 26 then
    raise exception 'Operator accounts counted: % -> %', v_before->'totals', v_after->'totals';
  end if;
  if (v_after->'totals'->>'first_use')::int - (v_before->'totals'->>'first_use')::int <> 1
     or (v_after->'totals'->>'with_transaction')::int - (v_before->'totals'->>'with_transaction')::int <> 1 then
    raise exception 'First use miscounted: % -> %', v_before->'totals', v_after->'totals';
  end if;
  if (v_after->'funnel_28d'->>'registered')::int - (v_before->'funnel_28d'->>'registered')::int <> 25
     or (v_after->'funnel_28d'->>'confirmed')::int - (v_before->'funnel_28d'->>'confirmed')::int <> 26 then
    raise exception 'Funnel miscounted: % -> %', v_before->'funnel_28d', v_after->'funnel_28d';
  end if;
  if jsonb_array_length(v_after->'weeks') <> 8 then
    raise exception 'Expected 8 weeks, got %', jsonb_array_length(v_after->'weeks');
  end if;
end;
$$;
reset role;

rollback;
