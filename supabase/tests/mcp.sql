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

rollback;
