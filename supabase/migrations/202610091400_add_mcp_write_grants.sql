-- Spendist MCP write access is opt-in per user and OAuth client.
-- Supabase Auth only issues standard OAuth scopes (openid, email, profile,
-- phone, offline_access), so the user's consent-page decision is stored here
-- and the access-token hook turns it into the `spendist_mcp_write` claim.

create table if not exists public.mcp_client_write_grants (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 255),
  granted_at timestamptz not null default now(),
  primary key (owner_id, client_id)
);

alter table public.mcp_client_write_grants enable row level security;

drop policy if exists "MCP write grants are visible to owner"
  on public.mcp_client_write_grants;
create policy "MCP write grants are visible to owner"
  on public.mcp_client_write_grants
  for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "MCP write grants are readable by the auth hook"
  on public.mcp_client_write_grants;
create policy "MCP write grants are readable by the auth hook"
  on public.mcp_client_write_grants
  for select
  to supabase_auth_admin
  using (true);

revoke all on table public.mcp_client_write_grants from public, anon;
grant select on table public.mcp_client_write_grants to authenticated;
grant select on table public.mcp_client_write_grants to supabase_auth_admin;

-- Only a first-party Spendist session may change the decision. Tokens issued
-- to OAuth clients carry `client_id` and are rejected, so a connected client
-- cannot grant itself write access.
create or replace function public.set_mcp_client_write_access(
  p_client_id text,
  p_allow_write boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if coalesce(auth.jwt()->>'client_id', '') <> '' then
    raise exception 'OAuth client tokens cannot change MCP write access';
  end if;

  if p_client_id is null
     or char_length(p_client_id) not between 1 and 255 then
    raise exception 'A valid OAuth client ID is required';
  end if;

  if p_allow_write then
    insert into public.mcp_client_write_grants (owner_id, client_id)
    values (auth.uid(), p_client_id)
    on conflict (owner_id, client_id)
    do update set granted_at = now();
  else
    delete from public.mcp_client_write_grants
     where owner_id = auth.uid()
       and client_id = p_client_id;
  end if;
end;
$$;

revoke all on function public.set_mcp_client_write_access(text, boolean)
  from public, anon;
grant execute on function public.set_mcp_client_write_access(text, boolean)
  to authenticated;

create or replace function public.spendist_mcp_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  allow_write boolean;
begin
  claims := event->'claims';
  if claims->>'client_id' is not null then
    select exists (
      select 1
        from public.mcp_client_write_grants grants
       where grants.owner_id::text = claims->>'sub'
         and grants.client_id = claims->>'client_id'
    )
      into allow_write;

    claims := jsonb_set(
      claims,
      '{aud}',
      to_jsonb('https://mcp.spendist.app/mcp'::text)
    );
    claims := jsonb_set(claims, '{spendist_mcp}', 'true'::jsonb);
    claims := jsonb_set(
      claims,
      '{spendist_mcp_write}',
      to_jsonb(coalesce(allow_write, false))
    );
    event := jsonb_set(event, '{claims}', claims);
  end if;
  return event;
end;
$$;

grant execute on function public.spendist_mcp_access_token_hook(jsonb)
  to supabase_auth_admin;
revoke execute on function public.spendist_mcp_access_token_hook(jsonb)
  from public, anon, authenticated;
