begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '40000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'places-owner@example.test', '',
    timezone('utc', now()), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Places Owner","language":"pl","wallet_currency_id":1}',
    timezone('utc', now()), timezone('utc', now())
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'places-other@example.test', '',
    timezone('utc', now()), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Places Other","language":"pl","wallet_currency_id":1}',
    timezone('utc', now()), timezone('utc', now())
  );

-- Test-only failure injection: an update that sets this description fails,
-- so the merge must roll back everything it already changed.
create function pg_temp.fail_marked_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.description = 'fail on merge' and new.place_id is distinct from old.place_id then
    raise exception 'Injected merge failure';
  end if;
  return new;
end;
$$;

create trigger fail_marked_transaction
  before update on public.transactions
  for each row execute function pg_temp.fail_marked_transaction();


set local role authenticated;

do $$
declare
  v_other_id constant uuid := '40000000-0000-0000-0000-000000000002';
begin
  perform set_config('request.jwt.claim.sub', v_other_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other_id, 'role', 'authenticated')::text,
    true
  );

  insert into public.places (id, owner_id, name)
  values ('50000000-0000-0000-0000-000000000099', v_other_id, 'Targ Piast');
end;
$$;

do $$
declare
  v_owner_id constant uuid := '40000000-0000-0000-0000-000000000001';
  v_wallet_id uuid;
  v_group_id uuid;
  v_category_id uuid;
  v_recurring_id uuid;
  v_target constant uuid := '50000000-0000-0000-0000-000000000001';
  v_source constant uuid := '50000000-0000-0000-0000-000000000002';
  v_third constant uuid := '50000000-0000-0000-0000-000000000003';
  v_fourth constant uuid := '50000000-0000-0000-0000-000000000004';
  v_failing constant uuid := '50000000-0000-0000-0000-000000000005';
  v_preview jsonb;
  v_result jsonb;
  v_error text;
begin
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner_id, 'role', 'authenticated')::text,
    true
  );

  select id into v_wallet_id from public.wallets
   where owner_id = v_owner_id and is_default;
  insert into public.categories_group (owner_id, name)
  values (v_owner_id, 'Places test group') returning id into v_group_id;
  insert into public.categories (owner_id, group_id, name)
  values (v_owner_id, v_group_id, 'Places test category')
  returning id into v_category_id;

  insert into public.places (id, owner_id, name, city, note, logo) values
    (v_target, v_owner_id, 'Targ Piast', null, null, null),
    (v_source, v_owner_id, '  targ   piast ', 'Gliwice', 'Saturday market', 'simple-icons:lidl:0050aa'),
    (v_third, v_owner_id, 'Targ Piast', null, null, null),
    (v_fourth, v_owner_id, 'Targ Piast', 'Katowice', null, 'file:6b1d3c0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e.webp'),
    (v_failing, v_owner_id, 'Pepco', null, null, null);

  insert into public.recurring_transactions (
    owner_id, category_id, wallet_id, name, start_date, schedule, amount, currency
  ) values (
    v_owner_id, v_category_id, v_wallet_id, 'Weekly market', current_date,
    'weekly', 40, 'PLN'
  ) returning id into v_recurring_id;

  insert into public.transactions (
    owner_id, category_id, wallet_id, place_id, occurred_at, amount,
    amount_in_default, currency, direction, recurring_transaction_id
  )
  select v_owner_id, v_category_id, v_wallet_id, place_id, now(), 10, 10, 'PLN',
         'expense', case when place_id = v_source and n = 1 then v_recurring_id end
    from (values (v_target), (v_target), (v_source), (v_source), (v_source),
                 (v_third), (v_fourth)) as places(place_id)
   cross join lateral (select row_number() over () as n) numbering;

  -- Duplicate detection uses the normalized name key.
  if (select count(*) from public.places_matching_name('TARG PIAST')) <> 4
     or public.place_name_key(' Łódź  Wschodnia ') <> 'lodz wschodnia' then
    raise exception 'Place name matching did not normalize names';
  end if;

  -- Preview shows counts and the fields that would be filled.
  v_preview := public.place_merge_preview(v_target, array[v_source]);

  if (v_preview->>'movedTransactions')::int <> 3
     or v_preview #>> '{places,0,id}' <> v_target::text
     or (v_preview #>> '{places,0,transactionCount}')::int <> 2
     or (v_preview #>> '{places,1,transactionCount}')::int <> 3
     or v_preview->'filledFields' <> '["city", "note"]'::jsonb
     or (v_preview->>'fillsLogo')::boolean is not true
     or v_preview #>> '{places,1,logo}' <> 'simple-icons:lidl:0050aa' then
    raise exception 'Merge preview is wrong: %', v_preview;
  end if;

  -- Merging two places moves transactions, fills fields, deletes the source,
  -- and keeps the recurring payment link of a generated transaction.
  v_result := public.merge_places(v_target, array[v_source]);

  if (v_result->>'movedTransactions')::int <> 3
     or v_result #>> '{place,city}' <> 'Gliwice'
     or v_result #>> '{place,note}' <> 'Saturday market'
     or v_result #>> '{place,logo}' <> 'simple-icons:lidl:0050aa'
     or exists (select 1 from public.places where id = v_source)
     or (select count(*) from public.transactions where place_id = v_target) <> 5
     or not exists (
       select 1 from public.transactions
        where place_id = v_target and recurring_transaction_id = v_recurring_id
     )
     or not exists (select 1 from public.recurring_transactions where id = v_recurring_id) then
    raise exception 'Two-place merge failed: %', v_result;
  end if;

  -- Merging three places at once; filled target fields are not overwritten.
  if (public.place_merge_preview(v_target, array[v_third, v_fourth])->>'fillsLogo')::boolean then
    raise exception 'Preview offered to replace an existing logo';
  end if;

  v_result := public.merge_places(v_target, array[v_third, v_fourth, v_third]);

  if (v_result->>'movedTransactions')::int <> 2
     or v_result #>> '{place,city}' <> 'Gliwice'
     or v_result #>> '{place,logo}' <> 'simple-icons:lidl:0050aa'
     or (select count(*) from public.places where id in (v_third, v_fourth)) <> 0
     or (select count(*) from public.transactions where place_id = v_target) <> 7 then
    raise exception 'Three-place merge failed: %', v_result;
  end if;

  v_error := null;
  begin
    perform public.merge_places(v_target, array[v_target]);
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error is distinct from 'The place to keep cannot also be merged into itself.' then
    raise exception 'Target listed as source was not rejected: %', v_error;
  end if;

  -- Another user's place is reported as missing and nothing changes.
  v_error := null;
  begin
    perform public.merge_places(
      v_target, array['50000000-0000-0000-0000-000000000099'::uuid]
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error not like 'Place % was not found.' then
    raise exception 'Merging another user''s place was not rejected: %', v_error;
  end if;

  v_error := null;
  begin
    perform public.merge_places(
      '50000000-0000-0000-0000-000000000099'::uuid, array[v_failing]
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error not like 'Place % was not found.'
     or not exists (select 1 from public.places where id = v_failing) then
    raise exception 'Merging into another user''s place was not rejected: %', v_error;
  end if;

  -- The dashboard summary returns the logo with each place.
  if not exists (
    select 1
      from public.place_expense_summary(
        extract(year from now() at time zone 'utc')::integer, null
      ) summary
     where summary.place_id = v_target
       and summary.logo = 'simple-icons:lidl:0050aa'
  ) then
    raise exception 'Place summary did not return the logo';
  end if;

  -- Only the two logo shapes are accepted, on places and recurring payments.
  v_error := null;
  begin
    update public.places set logo = 'https://example.test/logo.png' where id = v_target;
  exception when check_violation then
    v_error := sqlerrm;
  end;
  if v_error is null then
    raise exception 'A place accepted a logo URL';
  end if;

  v_error := null;
  begin
    update public.places set logo = 'simple-icons:Lidl:0050AA' where id = v_target;
  exception when check_violation then
    v_error := sqlerrm;
  end;
  if v_error is null then
    raise exception 'A place accepted a logo with upper-case characters';
  end if;

  v_error := null;
  begin
    update public.recurring_transactions
       set logo = 'file:../other-user/logo.png'
     where id = v_recurring_id;
  exception when check_violation then
    v_error := sqlerrm;
  end;
  if v_error is null then
    raise exception 'A recurring payment accepted a logo path';
  end if;

  update public.recurring_transactions
     set logo = 'file:6b1d3c0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e.png'
   where id = v_recurring_id;

  -- A failure half-way rolls back every change of the merge.
  insert into public.transactions (
    owner_id, category_id, wallet_id, place_id, occurred_at, amount,
    amount_in_default, currency, direction, description
  ) values
    (v_owner_id, v_category_id, v_wallet_id, v_failing, now(), 1, 1, 'PLN', 'expense', 'ok'),
    (v_owner_id, v_category_id, v_wallet_id, v_failing, now(), 1, 1, 'PLN', 'expense', 'fail on merge');

  v_error := null;
  begin
    perform public.merge_places(v_target, array[v_failing]);
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error is distinct from 'Injected merge failure'
     or not exists (select 1 from public.places where id = v_failing)
     or (select count(*) from public.transactions where place_id = v_failing) <> 2
     or (select count(*) from public.transactions where place_id = v_target) <> 7 then
    raise exception 'Failed merge did not roll back: %', v_error;
  end if;
end;
$$;

-- MCP two-step merge.
do $$
declare
  v_owner_id constant uuid := '40000000-0000-0000-0000-000000000001';
  v_target constant uuid := '50000000-0000-0000-0000-000000000001';
  v_source uuid;
  v_prepared jsonb;
  v_result jsonb;
  v_error text;
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', v_owner_id, 'role', 'authenticated',
      'client_id', 'test-client', 'spendist_mcp_write', true
    )::text,
    true
  );

  insert into public.places (owner_id, name) values (v_owner_id, 'TARG PIAST')
  returning id into v_source;

  v_prepared := public.mcp_prepare_place_merge(v_target, array[v_source]);

  -- Editing a place after the preview invalidates the token.
  update public.places set note = 'changed' where id = v_source;

  v_error := null;
  begin
    perform public.mcp_confirm_place_merge((v_prepared->>'confirmationToken')::uuid);
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error is distinct from 'Places changed after the merge was prepared' then
    raise exception 'Stale merge confirmation was accepted: %', v_error;
  end if;

  v_prepared := public.mcp_prepare_place_merge(v_target, array[v_source]);
  v_result := public.mcp_confirm_place_merge((v_prepared->>'confirmationToken')::uuid);

  if exists (select 1 from public.places where id = v_source)
     or not exists (
       select 1 from public.mcp_audit_events
        where owner_id = v_owner_id
          and tool_name = 'merge_places'
          and target_id = v_target
          and target_ids = array[v_source]
          and affected_count = 0
     ) then
    raise exception 'MCP merge was not applied and audited: %', v_result;
  end if;

  v_error := null;
  begin
    perform public.mcp_confirm_place_merge((v_prepared->>'confirmationToken')::uuid);
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error is distinct from 'Merge confirmation has already been used' then
    raise exception 'MCP merge confirmation was reusable: %', v_error;
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', v_owner_id, 'role', 'authenticated',
      'client_id', 'read-only-client', 'spendist_mcp_write', false
    )::text,
    true
  );

  v_error := null;
  begin
    perform public.merge_places(
      v_target, array['50000000-0000-0000-0000-000000000005'::uuid]
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error is distinct from 'This client has no write access to Spendist' then
    raise exception 'OAuth client without write grant merged places: %', v_error;
  end if;
end;
$$;

reset role;

rollback;
