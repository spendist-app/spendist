-- Atomic MCP transaction updates and bulk tag changes.
--
-- `update_transaction` with only `tagIds` sent an empty column update to the
-- Data API, which failed with PGRST116 before the tags were written.
-- `mcp_update_transaction` changes only the fields present and replaces the
-- tags in the same database transaction. `mcp_change_transaction_tags` adds or
-- removes tags on many transactions in one call.
--
-- Both run as SECURITY INVOKER and reuse the validation helpers from
-- 202611251410_add_mcp_batch_transaction_rpcs.sql.

-- Updates one transaction. Column changes and the replacement of its tags
-- happen in one database transaction; a change of only `tagIds` leaves the
-- transaction row untouched.
create or replace function public.mcp_update_transaction(
  p_id uuid,
  p_changes jsonb,
  p_client_id text default null
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_client_id text := public.mcp_write_client(p_client_id);
  v_columns jsonb;
  v_tag_ids uuid[];
  v_found boolean;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'changes must contain at least one field.';
  end if;

  perform 1
    from public.transactions t
   where t.owner_id = v_owner_id
     and t.id = p_id
     for update;

  v_found := found;

  if not v_found then
    raise exception 'Transaction % was not found.', p_id
      using errcode = 'P0002';
  end if;

  v_columns := public.mcp_transaction_columns(p_changes, '', false);

  if v_columns <> '{}'::jsonb then
    update public.transactions t
       set amount = case when v_columns ? 'amount' then (v_columns->>'amount')::numeric else t.amount end,
           amount_in_default = case when v_columns ? 'amount_in_default' then (v_columns->>'amount_in_default')::numeric else t.amount_in_default end,
           category_id = case when v_columns ? 'category_id' then (v_columns->>'category_id')::uuid else t.category_id end,
           wallet_id = case when v_columns ? 'wallet_id' then (v_columns->>'wallet_id')::uuid else t.wallet_id end,
           currency = case when v_columns ? 'currency' then v_columns->>'currency' else t.currency end,
           place_id = case when v_columns ? 'place_id' then (v_columns->>'place_id')::uuid else t.place_id end,
           occurred_at = case when v_columns ? 'occurred_at' then (v_columns->>'occurred_at')::timestamptz else t.occurred_at end,
           direction = case when v_columns ? 'direction' then (v_columns->>'direction')::public.transaction_direction else t.direction end,
           description = case when v_columns ? 'description' then v_columns->>'description' else t.description end
     where t.owner_id = v_owner_id
       and t.id = p_id;
  end if;

  if p_changes ? 'tagIds' then
    v_tag_ids := public.mcp_owned_tag_ids(p_changes->'tagIds', '');

    delete from public.transaction_tags tt
     where tt.owner_id = v_owner_id
       and tt.transaction_id = p_id
       and tt.tag_id <> all (v_tag_ids);

    insert into public.transaction_tags (owner_id, transaction_id, tag_id)
    select v_owner_id, p_id, tag_id from unnest(v_tag_ids) as tag_id
    on conflict (transaction_id, tag_id) do nothing;
  end if;

  insert into public.mcp_audit_events (
    owner_id, client_id, tool_name, target_type, target_id, request_id,
    outcome, finished_at
  ) values (
    v_owner_id, v_client_id, 'update_transaction', 'transaction', p_id,
    gen_random_uuid()::text, 'succeeded', now()
  );

  return public.mcp_transactions_with_tags(array[p_id])->0;
end;
$$;

-- Adds or removes the same tags on up to 100 transactions in one call.
create or replace function public.mcp_change_transaction_tags(
  p_transaction_ids uuid[],
  p_tag_ids uuid[],
  p_add boolean,
  p_client_id text default null
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_client_id text := public.mcp_write_client(p_client_id);
  v_transaction_ids uuid[];
  v_tag_ids uuid[];
  v_missing uuid;
  v_changed integer;
begin
  select coalesce(array_agg(distinct id), '{}'::uuid[])
    into v_transaction_ids
    from unnest(p_transaction_ids) as id
   where id is not null;

  if cardinality(v_transaction_ids) not between 1 and 100 then
    raise exception 'transactionIds must contain between 1 and 100 transactions.';
  end if;

  if coalesce(cardinality(p_tag_ids), 0) not between 1 and 50 then
    raise exception 'tagIds must contain between 1 and 50 tags.';
  end if;

  v_tag_ids := public.mcp_owned_tag_ids(to_jsonb(p_tag_ids), '');

  select requested.id
    into v_missing
    from unnest(v_transaction_ids) as requested(id)
   where not exists (
     select 1 from public.transactions t
      where t.owner_id = v_owner_id
        and t.id = requested.id
   )
   limit 1;

  if v_missing is not null then
    raise exception 'Transaction % was not found.', v_missing
      using errcode = 'P0002';
  end if;

  if p_add then
    insert into public.transaction_tags (owner_id, transaction_id, tag_id)
    select v_owner_id, transaction_id, tag_id
      from unnest(v_transaction_ids) as transaction_id
     cross join unnest(v_tag_ids) as tag_id
    on conflict (transaction_id, tag_id) do nothing;
  else
    delete from public.transaction_tags tt
     where tt.owner_id = v_owner_id
       and tt.transaction_id = any (v_transaction_ids)
       and tt.tag_id = any (v_tag_ids);
  end if;

  get diagnostics v_changed = row_count;

  insert into public.mcp_audit_events (
    owner_id, client_id, tool_name, target_type, target_id, request_id,
    outcome, finished_at, target_ids
  ) values (
    v_owner_id, v_client_id,
    case when p_add then 'add_tags_to_transactions' else 'remove_tags_from_transactions' end,
    'transaction',
    case when cardinality(v_transaction_ids) = 1 then v_transaction_ids[1] end,
    gen_random_uuid()::text, 'succeeded', now(), v_transaction_ids
  );

  return jsonb_build_object(
    'changed', v_changed,
    'transactionIds', to_jsonb(v_transaction_ids),
    'tagIds', to_jsonb(v_tag_ids)
  );
end;
$$;

revoke all on function public.mcp_update_transaction(uuid, jsonb, text) from public, anon;
revoke all on function public.mcp_change_transaction_tags(uuid[], uuid[], boolean, text) from public, anon;

grant execute on function public.mcp_update_transaction(uuid, jsonb, text) to authenticated;
grant execute on function public.mcp_change_transaction_tags(uuid[], uuid[], boolean, text) to authenticated;
