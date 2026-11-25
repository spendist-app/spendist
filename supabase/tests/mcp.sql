begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '20000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'mcp-owner@example.test', '',
  timezone('utc', now()), '{"provider":"email","providers":["email"]}',
  '{"full_name":"MCP Owner","language":"en","wallet_currency_id":1}',
  timezone('utc', now()), timezone('utc', now())
);

do $$
declare
  hook_result jsonb;
begin
  hook_result := public.spendist_mcp_access_token_hook(
    '{"claims":{"client_id":"test-client","sub":"20000000-0000-0000-0000-000000000001"}}'::jsonb
  );
  if hook_result #>> '{claims,aud}' <> 'https://mcp.spendist.app/mcp'
     or (hook_result #>> '{claims,spendist_mcp}')::boolean is not true then
    raise exception 'MCP access-token hook did not set the required claims';
  end if;
end;
$$;

set local role authenticated;

do $$
declare
  v_owner_id constant uuid := '20000000-0000-0000-0000-000000000001';
  wallet_id uuid;
  group_id uuid;
  category_id uuid;
  transaction_id uuid;
  confirmation_token uuid;
  replay_blocked boolean := false;
begin
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);

  select id into wallet_id from public.wallets
   where owner_id = v_owner_id and is_default;
  insert into public.categories_group (owner_id, name)
  values (v_owner_id, 'MCP test group') returning id into group_id;
  insert into public.categories (owner_id, group_id, name)
  values (v_owner_id, group_id, 'MCP test category') returning id into category_id;
  insert into public.transactions (
    owner_id, category_id, wallet_id, occurred_at, amount,
    amount_in_default, currency, direction
  ) values (
    v_owner_id, category_id, wallet_id, now(), 12.34, 12.34, 'PLN', 'expense'
  ) returning id into transaction_id;

  insert into public.mcp_audit_events (
    owner_id, client_id, tool_name, target_type, target_id, request_id
  ) values (
    v_owner_id, 'test-client', 'create_transaction', 'transaction',
    transaction_id, 'test-request'
  );

  insert into public.mcp_delete_confirmations (
    owner_id, entity_type, entity_id, entity_updated_at, effects
  )
  select v_owner_id, 'transaction', id, updated_at, '{"transactions":1}'::jsonb
    from public.transactions where id = transaction_id
  returning token into confirmation_token;

  perform public.confirm_mcp_delete(confirmation_token);
  if exists (select 1 from public.transactions where id = transaction_id) then
    raise exception 'Confirmed MCP deletion did not remove its target';
  end if;

  begin
    perform public.confirm_mcp_delete(confirmation_token);
  exception when others then
    replay_blocked := true;
  end;
  if not replay_blocked then
    raise exception 'MCP deletion confirmation token was reusable';
  end if;
end;
$$;

do $$
declare
  v_owner_id constant uuid := '20000000-0000-0000-0000-000000000001';
  client_change_blocked boolean := false;
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner_id, 'role', 'authenticated')::text,
    true
  );
  perform public.set_mcp_client_write_access('test-client', true);

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', v_owner_id, 'role', 'authenticated', 'client_id', 'other-client'
    )::text,
    true
  );

  begin
    perform public.set_mcp_client_write_access('other-client', true);
  exception when others then
    client_change_blocked := true;
  end;
  if not client_change_blocked then
    raise exception 'An OAuth client token granted itself MCP write access';
  end if;
end;
$$;

reset role;

do $$
declare
  granted jsonb;
  ungranted jsonb;
begin
  granted := public.spendist_mcp_access_token_hook(
    '{"claims":{"client_id":"test-client","sub":"20000000-0000-0000-0000-000000000001"}}'::jsonb
  );
  ungranted := public.spendist_mcp_access_token_hook(
    '{"claims":{"client_id":"other-client","sub":"20000000-0000-0000-0000-000000000001"}}'::jsonb
  );
  if (granted #>> '{claims,spendist_mcp_write}')::boolean is not true
     or (ungranted #>> '{claims,spendist_mcp_write}')::boolean is not false then
    raise exception 'MCP access-token hook did not apply the write grant';
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '20000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'mcp-other@example.test', '',
  timezone('utc', now()), '{"provider":"email","providers":["email"]}',
  '{"full_name":"MCP Other","language":"en","wallet_currency_id":1}',
  timezone('utc', now()), timezone('utc', now())
);

set local role authenticated;

do $$
declare
  v_other_id constant uuid := '20000000-0000-0000-0000-000000000002';
begin
  perform set_config('request.jwt.claim.sub', v_other_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other_id, 'role', 'authenticated')::text,
    true
  );

  insert into public.tags (id, owner_id, name)
  values ('30000000-0000-0000-0000-000000000099', v_other_id, 'Foreign tag');
end;
$$;

do $$
declare
  v_owner_id constant uuid := '20000000-0000-0000-0000-000000000001';
  v_wallet_id uuid;
  v_group_id uuid;
  v_category_id uuid;
  v_tag_a uuid;
  v_tag_b uuid;
  v_batch jsonb;
  v_result jsonb;
  v_replay jsonb;
  v_before bigint;
  v_transaction_id uuid;
  v_error text;
begin
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', v_owner_id, 'role', 'authenticated',
      'client_id', 'test-client', 'spendist_mcp_write', true
    )::text,
    true
  );

  select id into v_wallet_id from public.wallets
   where owner_id = v_owner_id and is_default;
  insert into public.categories_group (owner_id, name)
  values (v_owner_id, 'MCP batch group') returning id into v_group_id;
  insert into public.categories (owner_id, group_id, name)
  values (v_owner_id, v_group_id, 'MCP batch category')
  returning id into v_category_id;
  insert into public.tags (owner_id, name) values (v_owner_id, 'MCP tag A')
  returning id into v_tag_a;
  insert into public.tags (owner_id, name) values (v_owner_id, 'MCP tag B')
  returning id into v_tag_b;

  select jsonb_agg(jsonb_build_object(
    'amount', (n + 0.5)::text,
    'categoryId', v_category_id,
    'walletId', v_wallet_id,
    'occurredAt', '2026-11-20T12:00:00+01:00',
    'direction', 'expense',
    'description', 'Batch row ' || n,
    'tagIds', jsonb_build_array(v_tag_a, v_tag_a)
  ) order by n)
    into v_batch
    from generate_series(1, 100) as n;

  select count(*) into v_before from public.transactions where owner_id = v_owner_id;

  -- A batch of 100 rows is stored in one call, in input order, with tags.
  v_result := public.mcp_create_transactions(v_batch, 'batch-100', 'ignored');

  if jsonb_array_length(v_result->'items') <> 100
     or (v_result->>'replayed')::boolean
     or v_result #>> '{items,0,description}' <> 'Batch row 1'
     or v_result #>> '{items,99,description}' <> 'Batch row 100'
     or jsonb_array_length(v_result #> '{items,0,transaction_tags}') <> 1
     or (select count(*) from public.transactions where owner_id = v_owner_id) <> v_before + 100 then
    raise exception 'MCP batch create did not store 100 tagged transactions: %', v_result;
  end if;

  if not exists (
    select 1 from public.mcp_audit_events
     where owner_id = v_owner_id
       and client_id = 'test-client'
       and tool_name = 'create_transactions'
       and outcome = 'succeeded'
       and cardinality(target_ids) = 100
  ) then
    raise exception 'MCP batch create did not record one audit event';
  end if;

  -- Retrying with the same key replays the result instead of duplicating.
  v_replay := public.mcp_create_transactions(v_batch, 'batch-100', 'ignored');

  if not (v_replay->>'replayed')::boolean
     or v_replay->'items' <> v_result->'items'
     or (select count(*) from public.transactions where owner_id = v_owner_id) <> v_before + 100 then
    raise exception 'MCP batch idempotency key did not replay the first result';
  end if;

  v_error := null;
  begin
    perform public.mcp_create_transactions(v_batch - 0, 'batch-100', 'ignored');
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error is distinct from 'idempotencyKey was already used for a different request.' then
    raise exception 'Reused idempotency key with another payload was not rejected: %', v_error;
  end if;

  -- One invalid row rejects the whole batch and names that row.
  v_error := null;
  begin
    perform public.mcp_create_transactions(
      jsonb_set(v_batch, '{2,walletId}', to_jsonb(gen_random_uuid()))
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error not like 'Transaction 3: Wallet % was not found.'
     or (select count(*) from public.transactions where owner_id = v_owner_id) <> v_before + 100 then
    raise exception 'Invalid batch row was not rejected atomically: %', v_error;
  end if;

  v_error := null;
  begin
    perform public.mcp_create_transactions(
      jsonb_set(v_batch, '{4,tagIds}', jsonb_build_array('30000000-0000-0000-0000-000000000099'))
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error not like 'Transaction 5: Tag % was not found.' then
    raise exception 'Another user''s tag was accepted in a batch: %', v_error;
  end if;

  v_error := null;
  begin
    perform public.mcp_create_transactions(v_batch || v_batch);
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error is distinct from 'Batch size must be between 1 and 100.' then
    raise exception 'Oversized batch was not rejected: %', v_error;
  end if;

  v_transaction_id := (v_result #>> '{items,0,id}')::uuid;

  -- Updating only tagIds replaces tags without touching the row.
  v_result := public.mcp_update_transaction(
    v_transaction_id, jsonb_build_object('tagIds', jsonb_build_array(v_tag_b))
  );
  if v_result #>> '{transaction_tags,0,tag_id}' <> v_tag_b::text
     or jsonb_array_length(v_result->'transaction_tags') <> 1
     or v_result->>'description' <> 'Batch row 1' then
    raise exception 'Tag-only MCP update failed: %', v_result;
  end if;

  v_result := public.mcp_update_transaction(
    v_transaction_id,
    jsonb_build_object('tagIds', jsonb_build_array(v_tag_a, v_tag_b), 'description', 'Renamed')
  );
  if jsonb_array_length(v_result->'transaction_tags') <> 2
     or v_result->>'description' <> 'Renamed' then
    raise exception 'MCP update with tags and description failed: %', v_result;
  end if;

  v_result := public.mcp_update_transaction(
    v_transaction_id, jsonb_build_object('tagIds', '[]'::jsonb)
  );
  if jsonb_array_length(v_result->'transaction_tags') <> 0 then
    raise exception 'Empty tagIds did not clear transaction tags: %', v_result;
  end if;

  v_error := null;
  begin
    perform public.mcp_update_transaction(
      v_transaction_id, jsonb_build_object('tagIds', jsonb_build_array(gen_random_uuid()))
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error not like 'Tag % was not found.' then
    raise exception 'Missing tag was accepted by MCP update: %', v_error;
  end if;

  v_error := null;
  begin
    perform public.mcp_update_transaction(
      v_transaction_id,
      jsonb_build_object(
        'description', 'Must roll back',
        'tagIds', jsonb_build_array('30000000-0000-0000-0000-000000000099')
      )
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error not like 'Tag % was not found.'
     or (select description from public.transactions where id = v_transaction_id) <> 'Renamed' then
    raise exception 'Another user''s tag was accepted by MCP update: %', v_error;
  end if;

  v_error := null;
  begin
    perform public.mcp_update_transaction(
      gen_random_uuid(), jsonb_build_object('tagIds', '[]'::jsonb)
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error not like 'Transaction % was not found.' then
    raise exception 'Missing transaction did not return a clear error: %', v_error;
  end if;

end;
$$;

do $$
declare
  v_owner_id constant uuid := '20000000-0000-0000-0000-000000000001';
  v_ids uuid[];
  v_tag uuid;
  v_result jsonb;
  v_error text;
begin
  -- Bulk tag changes cover many transactions in one call.
  select array_agg(id) into v_ids from public.transactions
   where owner_id = v_owner_id and description like 'Batch row %';
  select id into v_tag from public.tags
   where owner_id = v_owner_id and name = 'MCP tag B';

  v_result := public.mcp_change_transaction_tags(v_ids, array[v_tag], true);
  if (select count(*) from public.transaction_tags
       where owner_id = v_owner_id and tag_id = v_tag and transaction_id = any (v_ids))
     <> cardinality(v_ids) then
    raise exception 'Bulk tag add did not tag every transaction: %', v_result;
  end if;

  v_result := public.mcp_change_transaction_tags(v_ids, array[v_tag], false);
  if exists (select 1 from public.transaction_tags
              where tag_id = v_tag and transaction_id = any (v_ids)) then
    raise exception 'Bulk tag removal left tags behind: %', v_result;
  end if;

  v_error := null;
  begin
    perform public.mcp_change_transaction_tags(
      v_ids, array['30000000-0000-0000-0000-000000000099'::uuid], true
    );
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error not like 'Tag % was not found.' then
    raise exception 'Bulk tag add accepted another user''s tag: %', v_error;
  end if;

  -- An OAuth client without the user's write grant cannot write.
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
    perform public.mcp_change_transaction_tags(v_ids, array[v_tag], true);
  exception when others then
    v_error := sqlerrm;
  end;
  if v_error is distinct from 'This client has no write access to Spendist' then
    raise exception 'OAuth client without write grant could write: %', v_error;
  end if;
end;
$$;

reset role;

rollback;
