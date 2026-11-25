-- Batch-safe MCP transaction creation.
--
-- The MCP Worker used to write each transaction with several Data API calls
-- (wallet lookup, audit insert, transaction insert, tag insert, audit update).
-- Cloudflare limits subrequests per Worker invocation, so a batch of more than
-- about a dozen rows failed half-way and left a partial write behind.
-- `mcp_create_transactions` does the whole write, its tags and its audit event
-- in one call and one database transaction: either every row is stored or none
-- is.
--
-- They run as SECURITY INVOKER, so RLS and the owner-scoped composite foreign
-- keys still decide what the caller may touch. Tokens issued to OAuth clients
-- must also carry the write grant the user gave that client.

alter table public.mcp_audit_events
  add column if not exists idempotency_key text,
  add column if not exists request_hash text,
  add column if not exists target_ids uuid[];

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'mcp_audit_events_idempotency_key_length'
       and conrelid = 'public.mcp_audit_events'::regclass
  ) then
    alter table public.mcp_audit_events
      add constraint mcp_audit_events_idempotency_key_length
      check (idempotency_key is null or char_length(idempotency_key) between 1 and 200);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'mcp_audit_events_request_hash_length'
       and conrelid = 'public.mcp_audit_events'::regclass
  ) then
    alter table public.mcp_audit_events
      add constraint mcp_audit_events_request_hash_length
      check (request_hash is null or char_length(request_hash) <= 64);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'mcp_audit_events_target_ids_size'
       and conrelid = 'public.mcp_audit_events'::regclass
  ) then
    alter table public.mcp_audit_events
      add constraint mcp_audit_events_target_ids_size
      check (target_ids is null or cardinality(target_ids) <= 100);
  end if;
end;
$$;

create unique index if not exists mcp_audit_events_idempotency_idx
  on public.mcp_audit_events (owner_id, client_id, tool_name, idempotency_key)
  where idempotency_key is not null;

-- Returns the caller's OAuth client id, or the fallback for first-party
-- sessions (the stdio server). Rejects OAuth tokens without the write grant.
create or replace function public.mcp_write_client(p_fallback text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_client_id text := nullif(auth.jwt()->>'client_id', '');
begin
  if auth.uid() is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if v_client_id is not null
     and coalesce((auth.jwt()->>'spendist_mcp_write')::boolean, false) is not true then
    raise exception 'This client has no write access to Spendist'
      using errcode = '42501';
  end if;

  return left(coalesce(v_client_id, nullif(btrim(p_fallback), ''), 'stdio'), 255);
end;
$$;

-- Transactions with their tag IDs, in the order of p_ids, shaped like the
-- Data API `select('*, transaction_tags(tag_id)')` result.
create or replace function public.mcp_transactions_with_tags(p_ids uuid[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      to_jsonb(t) || jsonb_build_object(
        'transaction_tags',
        coalesce(
          (
            select jsonb_agg(jsonb_build_object('tag_id', tt.tag_id) order by tt.tag_id)
              from public.transaction_tags tt
             where tt.owner_id = t.owner_id
               and tt.transaction_id = t.id
          ),
          '[]'::jsonb
        )
      )
      order by ids.position
    ),
    '[]'::jsonb
  )
  from unnest(p_ids) with ordinality as ids(id, position)
  join public.transactions t
    on t.id = ids.id
   and t.owner_id = auth.uid();
$$;

-- Validates a JSON array of tag IDs owned by the caller and returns them
-- without duplicates. p_label prefixes error messages.
create or replace function public.mcp_owned_tag_ids(p_tag_ids jsonb, p_label text)
returns uuid[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_missing uuid;
begin
  if p_tag_ids is null or jsonb_typeof(p_tag_ids) = 'null' then
    return '{}'::uuid[];
  end if;

  if jsonb_typeof(p_tag_ids) <> 'array' then
    raise exception '%tagIds must be an array of tag IDs.', p_label;
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_tag_ids)
     where jsonb_typeof(value) <> 'string'
  ) then
    raise exception '%tagIds must contain only tag IDs.', p_label;
  end if;

  if jsonb_array_length(p_tag_ids) > 50 then
    raise exception '%tagIds can contain at most 50 tags.', p_label;
  end if;

  begin
    select coalesce(array_agg(distinct value::uuid), '{}'::uuid[])
      into v_ids
      from jsonb_array_elements_text(p_tag_ids);
  exception when invalid_text_representation then
    raise exception '%tagIds must contain only tag IDs.', p_label;
  end;

  select requested.id
    into v_missing
    from unnest(v_ids) as requested(id)
   where not exists (
     select 1 from public.tags tag
      where tag.owner_id = auth.uid()
        and tag.id = requested.id
   )
   limit 1;

  if v_missing is not null then
    raise exception '%Tag % was not found.', p_label, v_missing;
  end if;

  return v_ids;
end;
$$;

-- Validates one transaction field set (create: every required field present;
-- update: only the fields present in p_values) and returns the column values.
create or replace function public.mcp_transaction_columns(
  p_values jsonb,
  p_label text,
  p_require_all boolean
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_amount numeric;
  v_wallet_id uuid;
  v_currency text;
  v_category_id uuid;
  v_place_id uuid;
  v_occurred_at timestamptz;
  v_direction public.transaction_direction;
  v_description text;
  v_key text;
begin
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception '%expected an object.', p_label;
  end if;

  for v_key in select jsonb_object_keys(p_values) loop
    if v_key not in (
      'amount', 'categoryId', 'walletId', 'occurredAt', 'direction',
      'description', 'placeId', 'tagIds'
    ) then
      raise exception '%unknown field %.', p_label, v_key;
    end if;
  end loop;

  if p_require_all then
    foreach v_key in array array['amount', 'categoryId', 'walletId', 'occurredAt', 'direction'] loop
      if not p_values ? v_key then
        raise exception '%', format('%s%s is required.', p_label, v_key);
      end if;
    end loop;
  end if;

  foreach v_key in array array['amount', 'categoryId', 'walletId', 'occurredAt', 'direction'] loop
    if p_values ? v_key and jsonb_typeof(p_values->v_key) = 'null' then
      raise exception '%', format('%s%s cannot be null.', p_label, v_key);
    end if;
  end loop;

  if p_values ? 'amount' then
    if jsonb_typeof(p_values->'amount') <> 'string'
       or (p_values->>'amount') !~ '^\d{1,10}(\.\d{1,2})?$' then
      raise exception '%amount must be a non-negative decimal string with at most two decimal places.', p_label;
    end if;

    v_amount := (p_values->>'amount')::numeric;
    v_result := v_result || jsonb_build_object('amount', v_amount, 'amount_in_default', v_amount);
  end if;

  if p_values ? 'walletId' then
    begin
      v_wallet_id := (p_values->>'walletId')::uuid;
    exception when invalid_text_representation then
      raise exception '%walletId must be a UUID.', p_label;
    end;

    select currency.symbol
      into v_currency
      from public.wallets wallet
      join public.currencies currency on currency.id = wallet.currency_id
     where wallet.owner_id = auth.uid()
       and wallet.id = v_wallet_id;

    if v_currency is null then
      raise exception '%Wallet % was not found.', p_label, v_wallet_id;
    end if;

    v_result := v_result || jsonb_build_object('wallet_id', v_wallet_id, 'currency', v_currency);
  end if;

  if p_values ? 'categoryId' then
    begin
      v_category_id := (p_values->>'categoryId')::uuid;
    exception when invalid_text_representation then
      raise exception '%categoryId must be a UUID.', p_label;
    end;

    if not exists (
      select 1 from public.categories category
       where category.owner_id = auth.uid()
         and category.id = v_category_id
    ) then
      raise exception '%Category % was not found.', p_label, v_category_id;
    end if;

    v_result := v_result || jsonb_build_object('category_id', v_category_id);
  end if;

  if p_values ? 'placeId' then
    if jsonb_typeof(p_values->'placeId') = 'null' then
      v_result := v_result || jsonb_build_object('place_id', null);
    else
      begin
        v_place_id := (p_values->>'placeId')::uuid;
      exception when invalid_text_representation then
        raise exception '%placeId must be a UUID.', p_label;
      end;

      if not exists (
        select 1 from public.places place
         where place.owner_id = auth.uid()
           and place.id = v_place_id
      ) then
        raise exception '%Place % was not found.', p_label, v_place_id;
      end if;

      v_result := v_result || jsonb_build_object('place_id', v_place_id);
    end if;
  end if;

  if p_values ? 'occurredAt' then
    begin
      v_occurred_at := (p_values->>'occurredAt')::timestamptz;
    exception when others then
      raise exception '%occurredAt must be an ISO date-time with an offset.', p_label;
    end;

    v_result := v_result || jsonb_build_object('occurred_at', v_occurred_at);
  end if;

  if p_values ? 'direction' then
    begin
      v_direction := (p_values->>'direction')::public.transaction_direction;
    exception when invalid_text_representation then
      raise exception '%direction must be income or expense.', p_label;
    end;

    v_result := v_result || jsonb_build_object('direction', v_direction);
  end if;

  if p_values ? 'description' then
    v_description := p_values->>'description';

    if char_length(v_description) > 500 then
      raise exception '%description can contain at most 500 characters.', p_label;
    end if;

    v_result := v_result || jsonb_build_object('description', v_description);
  end if;

  return v_result;
end;
$$;

-- Creates 1-100 transactions atomically. A repeated call with the same
-- idempotency key and the same payload returns the first result instead of
-- creating duplicates; the same key with a different payload is rejected.
create or replace function public.mcp_create_transactions(
  p_transactions jsonb,
  p_idempotency_key text default null,
  p_client_id text default null,
  p_tool_name text default 'create_transactions'
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_client_id text := public.mcp_write_client(p_client_id);
  v_key text := nullif(btrim(p_idempotency_key), '');
  v_hash text;
  v_existing public.mcp_audit_events%rowtype;
  v_ids uuid[] := '{}'::uuid[];
  v_item jsonb;
  v_position bigint;
  v_label text;
  v_columns jsonb;
  v_tag_ids uuid[];
  v_id uuid;
begin
  if p_tool_name not in ('create_transaction', 'create_transactions') then
    raise exception 'Unsupported tool name.';
  end if;

  if p_transactions is null or jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'transactions must be an array.';
  end if;

  if jsonb_array_length(p_transactions) not between 1 and 100 then
    raise exception 'Batch size must be between 1 and 100.';
  end if;

  if v_key is not null and char_length(v_key) > 200 then
    raise exception 'idempotencyKey can contain at most 200 characters.';
  end if;

  v_hash := md5(p_transactions::text);

  if v_key is not null then
    -- Serialize retries of the same key so a concurrent duplicate waits for
    -- the first call and then replays its result.
    perform pg_advisory_xact_lock(
      hashtextextended(v_owner_id::text || ':' || v_client_id || ':' || p_tool_name || ':' || v_key, 0)
    );

    select * into v_existing
      from public.mcp_audit_events event
     where event.owner_id = v_owner_id
       and event.client_id = v_client_id
       and event.tool_name = p_tool_name
       and event.idempotency_key = v_key;

    if found then
      if v_existing.request_hash is distinct from v_hash then
        raise exception 'idempotencyKey was already used for a different request.';
      end if;

      return jsonb_build_object(
        'items', public.mcp_transactions_with_tags(v_existing.target_ids),
        'replayed', true
      );
    end if;
  end if;

  for v_item, v_position in
    select value, ordinality from jsonb_array_elements(p_transactions) with ordinality
  loop
    v_label := format('Transaction %s: ', v_position);
    v_columns := public.mcp_transaction_columns(v_item, v_label, true);
    v_tag_ids := public.mcp_owned_tag_ids(v_item->'tagIds', v_label);

    begin
      insert into public.transactions (
        owner_id, category_id, wallet_id, place_id, occurred_at, amount,
        amount_in_default, currency, direction, description
      ) values (
        v_owner_id,
        (v_columns->>'category_id')::uuid,
        (v_columns->>'wallet_id')::uuid,
        (v_columns->>'place_id')::uuid,
        (v_columns->>'occurred_at')::timestamptz,
        (v_columns->>'amount')::numeric,
        (v_columns->>'amount_in_default')::numeric,
        v_columns->>'currency',
        (v_columns->>'direction')::public.transaction_direction,
        v_columns->>'description'
      )
      returning id into v_id;

      insert into public.transaction_tags (owner_id, transaction_id, tag_id)
      select v_owner_id, v_id, tag_id from unnest(v_tag_ids) as tag_id;
    exception when others then
      raise exception '%', v_label || sqlerrm using errcode = sqlstate;
    end;

    v_ids := v_ids || v_id;
  end loop;

  insert into public.mcp_audit_events (
    owner_id, client_id, tool_name, target_type, target_id, request_id,
    outcome, finished_at, idempotency_key, request_hash, target_ids
  ) values (
    v_owner_id, v_client_id, p_tool_name, 'transaction',
    case when cardinality(v_ids) = 1 then v_ids[1] end,
    gen_random_uuid()::text, 'succeeded', now(), v_key, v_hash, v_ids
  );

  return jsonb_build_object(
    'items', public.mcp_transactions_with_tags(v_ids),
    'replayed', false
  );
end;
$$;

revoke all on function public.mcp_write_client(text) from public, anon;
revoke all on function public.mcp_transactions_with_tags(uuid[]) from public, anon;
revoke all on function public.mcp_owned_tag_ids(jsonb, text) from public, anon;
revoke all on function public.mcp_transaction_columns(jsonb, text, boolean) from public, anon;
revoke all on function public.mcp_create_transactions(jsonb, text, text, text) from public, anon;

-- Helpers run inside the invoker's RPC, so `authenticated` needs EXECUTE on
-- them too. They only read rows that RLS already exposes to the caller.
grant execute on function public.mcp_write_client(text) to authenticated;
grant execute on function public.mcp_transactions_with_tags(uuid[]) to authenticated;
grant execute on function public.mcp_owned_tag_ids(jsonb, text) to authenticated;
grant execute on function public.mcp_transaction_columns(jsonb, text, boolean) to authenticated;
grant execute on function public.mcp_create_transactions(jsonb, text, text, text) to authenticated;
