create table if not exists public.mcp_audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null default 'stdio',
  tool_name text not null,
  target_type text,
  target_id uuid,
  request_id text not null,
  outcome text not null default 'started'
    check (outcome in ('started', 'succeeded', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.mcp_audit_events enable row level security;

drop policy if exists "MCP audit events are visible to owner"
  on public.mcp_audit_events;
create policy "MCP audit events are visible to owner"
  on public.mcp_audit_events
  for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "MCP audit events can be created by owner"
  on public.mcp_audit_events;
create policy "MCP audit events can be created by owner"
  on public.mcp_audit_events
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "MCP audit events can be completed by owner"
  on public.mcp_audit_events;
create policy "MCP audit events can be completed by owner"
  on public.mcp_audit_events
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists mcp_audit_events_owner_created_idx
  on public.mcp_audit_events(owner_id, created_at desc);

grant select, insert, update on table public.mcp_audit_events
  to authenticated;

create table if not exists public.mcp_delete_confirmations (
  token uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (
    entity_type in (
      'transaction',
      'wallet',
      'category_group',
      'category',
      'tag',
      'place',
      'recurring_payment'
    )
  ),
  entity_id uuid not null,
  entity_updated_at timestamptz not null,
  effects jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mcp_delete_confirmations enable row level security;

drop policy if exists "MCP delete confirmations are accessible by owner"
  on public.mcp_delete_confirmations;
create policy "MCP delete confirmations are accessible by owner"
  on public.mcp_delete_confirmations
  for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists mcp_delete_confirmations_owner_expiry_idx
  on public.mcp_delete_confirmations(owner_id, expires_at desc);

grant select, insert, update, delete on table public.mcp_delete_confirmations
  to authenticated;

create or replace function public.confirm_mcp_delete(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmation public.mcp_delete_confirmations%rowtype;
  current_updated_at timestamptz;
  deleted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select *
    into confirmation
    from public.mcp_delete_confirmations
   where token = p_token
     and owner_id = auth.uid()
   for update;

  if not found then
    raise exception 'Delete confirmation was not found';
  end if;
  if confirmation.used_at is not null then
    raise exception 'Delete confirmation has already been used';
  end if;
  if confirmation.expires_at <= now() then
    raise exception 'Delete confirmation has expired';
  end if;

  case confirmation.entity_type
    when 'transaction' then
      select updated_at into current_updated_at
        from public.transactions
       where id = confirmation.entity_id and owner_id = auth.uid();
    when 'wallet' then
      select updated_at into current_updated_at
        from public.wallets
       where id = confirmation.entity_id and owner_id = auth.uid();
    when 'category_group' then
      select updated_at into current_updated_at
        from public.categories_group
       where id = confirmation.entity_id and owner_id = auth.uid();
    when 'category' then
      select updated_at into current_updated_at
        from public.categories
       where id = confirmation.entity_id and owner_id = auth.uid();
    when 'tag' then
      select updated_at into current_updated_at
        from public.tags
       where id = confirmation.entity_id and owner_id = auth.uid();
    when 'place' then
      select updated_at into current_updated_at
        from public.places
       where id = confirmation.entity_id and owner_id = auth.uid();
    when 'recurring_payment' then
      select updated_at into current_updated_at
        from public.recurring_transactions
       where id = confirmation.entity_id and owner_id = auth.uid();
  end case;

  if current_updated_at is null then
    raise exception 'Target record was not found';
  end if;
  if current_updated_at is distinct from confirmation.entity_updated_at then
    raise exception 'Target record changed after deletion was prepared';
  end if;

  case confirmation.entity_type
    when 'transaction' then
      delete from public.transaction_tags
       where owner_id = auth.uid() and transaction_id = confirmation.entity_id;
      delete from public.transactions
       where owner_id = auth.uid() and id = confirmation.entity_id
       returning id into deleted_id;
    when 'wallet' then
      delete from public.wallets
       where owner_id = auth.uid() and id = confirmation.entity_id
       returning id into deleted_id;
    when 'category_group' then
      delete from public.categories_group
       where owner_id = auth.uid() and id = confirmation.entity_id
       returning id into deleted_id;
    when 'category' then
      delete from public.categories
       where owner_id = auth.uid() and id = confirmation.entity_id
       returning id into deleted_id;
    when 'tag' then
      delete from public.transaction_tags
       where owner_id = auth.uid() and tag_id = confirmation.entity_id;
      delete from public.recurring_transaction_tags
       where owner_id = auth.uid() and tag_id = confirmation.entity_id;
      delete from public.tags
       where owner_id = auth.uid() and id = confirmation.entity_id
       returning id into deleted_id;
    when 'place' then
      delete from public.places
       where owner_id = auth.uid() and id = confirmation.entity_id
       returning id into deleted_id;
    when 'recurring_payment' then
      delete from public.recurring_transaction_tags
       where owner_id = auth.uid()
         and recurring_transaction_id = confirmation.entity_id;
      delete from public.recurring_transactions
       where owner_id = auth.uid() and id = confirmation.entity_id
       returning id into deleted_id;
  end case;

  if deleted_id is null then
    raise exception 'Target record could not be deleted';
  end if;

  update public.mcp_delete_confirmations
     set used_at = now()
   where token = p_token;

  return jsonb_build_object(
    'deleted', true,
    'entity_type', confirmation.entity_type,
    'entity_id', deleted_id
  );
end;
$$;

revoke all on function public.confirm_mcp_delete(uuid) from public, anon;
grant execute on function public.confirm_mcp_delete(uuid) to authenticated;

create or replace function public.spendist_mcp_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
begin
  claims := event->'claims';
  if claims->>'client_id' is not null then
    claims := jsonb_set(
      claims,
      '{aud}',
      to_jsonb('https://mcp.spendist.app/mcp'::text)
    );
    claims := jsonb_set(claims, '{spendist_mcp}', 'true'::jsonb);
    event := jsonb_set(event, '{claims}', claims);
  end if;
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.spendist_mcp_access_token_hook(jsonb)
  to supabase_auth_admin;
revoke execute on function public.spendist_mcp_access_token_hook(jsonb)
  from public, anon, authenticated;
