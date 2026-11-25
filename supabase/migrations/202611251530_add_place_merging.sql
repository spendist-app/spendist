-- Merging duplicate places.
--
-- Users sometimes create the same place twice ("Pepco" and "pepco", or a
-- name with an extra space). Merging moves every transaction from the source
-- places to the target place, fills empty target fields from the sources and
-- deletes the sources, all in one database transaction. Only transactions
-- reference places (`transactions_place_owner_fk`); recurring payments do not.
--
-- Functions run as SECURITY INVOKER: RLS and the owner-scoped foreign key
-- still decide which rows the caller can see and change.

-- Comparison key for place names: case-insensitive, trimmed, with runs of
-- whitespace collapsed and common Latin diacritics removed. The web
-- application mirrors it in `apps/web/src/app/shared/place-name.ts`.
create or replace function public.place_name_key(p_name text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(
    btrim(regexp_replace(lower(coalesce(p_name, '')), '\s+', ' ', 'g')),
    'ąćęłńóśźżáàâäãåčçďéèêëěíìîïľĺňñôöõőøŕřšťúùûüůűýÿž',
    'acelnoszzaaaaaaccdeeeeeiiiillnnooooorrstuuuuuuyyz'
  );
$$;

create index if not exists places_owner_name_key_idx
  on public.places (owner_id, public.place_name_key(name));

-- Places of the caller whose name has the same key as p_name.
create or replace function public.places_matching_name(p_name text)
returns setof public.places
language sql
stable
set search_path = ''
as $$
  select place.*
    from public.places place
   where place.owner_id = auth.uid()
     and public.place_name_key(place.name) = public.place_name_key(p_name)
   order by place.creation_date, place.id;
$$;

-- Validates a merge request and returns the source IDs without duplicates.
create or replace function public.place_merge_sources(
  p_target_id uuid,
  p_source_ids uuid[]
)
returns uuid[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_sources uuid[];
  v_missing uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if p_target_id is null then
    raise exception 'Choose the place to keep.';
  end if;

  select coalesce(array_agg(distinct id), '{}'::uuid[])
    into v_sources
    from unnest(p_source_ids) as id
   where id is not null;

  if cardinality(v_sources) not between 1 and 50 then
    raise exception 'Choose between 1 and 50 places to merge.';
  end if;

  if p_target_id = any (v_sources) then
    raise exception 'The place to keep cannot also be merged into itself.';
  end if;

  select requested.id
    into v_missing
    from unnest(array_prepend(p_target_id, v_sources)) as requested(id)
   where not exists (
     select 1 from public.places place
      where place.owner_id = auth.uid()
        and place.id = requested.id
   )
   limit 1;

  if v_missing is not null then
    raise exception 'Place % was not found.', v_missing
      using errcode = 'P0002';
  end if;

  return v_sources;
end;
$$;

-- Shows what a merge would do: each place with its transaction count, the
-- number of transactions that would move and the target fields that would be
-- filled from the sources.
create or replace function public.place_merge_preview(
  p_target_id uuid,
  p_source_ids uuid[]
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_sources uuid[] := public.place_merge_sources(p_target_id, p_source_ids);
  v_places jsonb;
  v_moved bigint;
  v_filled jsonb;
begin
  select jsonb_agg(
           jsonb_build_object(
             'id', place.id,
             'name', place.name,
             'city', place.city,
             'isTarget', place.id = p_target_id,
             'transactionCount', (
               select count(*) from public.transactions t
                where t.owner_id = place.owner_id
                  and t.place_id = place.id
             )
           )
           order by place.id <> p_target_id, ids.position
         )
    into v_places
    from unnest(array_prepend(p_target_id, v_sources)) with ordinality as ids(id, position)
    join public.places place
      on place.id = ids.id
     and place.owner_id = auth.uid();

  select count(*)
    into v_moved
    from public.transactions t
   where t.owner_id = auth.uid()
     and t.place_id = any (v_sources);

  select coalesce(jsonb_agg(field), '[]'::jsonb)
    into v_filled
    from public.places target
   cross join lateral (
     values
       ('street', target.street, (select s.street from public.places s where s.owner_id = auth.uid() and s.id = any (v_sources) and nullif(btrim(s.street), '') is not null limit 1)),
       ('city', target.city, (select s.city from public.places s where s.owner_id = auth.uid() and s.id = any (v_sources) and nullif(btrim(s.city), '') is not null limit 1)),
       ('postalCode', target.postal_code, (select s.postal_code from public.places s where s.owner_id = auth.uid() and s.id = any (v_sources) and nullif(btrim(s.postal_code), '') is not null limit 1)),
       ('country', target.country, (select s.country from public.places s where s.owner_id = auth.uid() and s.id = any (v_sources) and nullif(btrim(s.country), '') is not null limit 1)),
       ('note', target.note, (select s.note from public.places s where s.owner_id = auth.uid() and s.id = any (v_sources) and nullif(btrim(s.note), '') is not null limit 1))
   ) as fields(field, current_value, source_value)
   where target.owner_id = auth.uid()
     and target.id = p_target_id
     and nullif(btrim(current_value), '') is null
     and source_value is not null;

  return jsonb_build_object(
    'targetPlaceId', p_target_id,
    'sourcePlaceIds', to_jsonb(v_sources),
    'places', v_places,
    'movedTransactions', v_moved,
    'filledFields', v_filled
  );
end;
$$;

-- Merges the source places into the target place in one database
-- transaction and returns the kept place with the number of moved
-- transactions.
create or replace function public.merge_places(
  p_target_id uuid,
  p_source_ids uuid[]
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_sources uuid[];
  v_moved integer;
  v_deleted integer;
  v_place public.places%rowtype;
begin
  -- OAuth clients need the user's MCP write grant.
  perform public.mcp_write_client(null);

  v_sources := public.place_merge_sources(p_target_id, p_source_ids);

  -- Lock the places in a stable order so concurrent merges cannot deadlock.
  perform 1
    from public.places place
   where place.owner_id = v_owner_id
     and place.id = any (array_prepend(p_target_id, v_sources))
   order by place.id
     for update;

  update public.places target
     set street = coalesce(nullif(btrim(target.street), ''), source.street),
         city = coalesce(nullif(btrim(target.city), ''), source.city),
         postal_code = coalesce(nullif(btrim(target.postal_code), ''), source.postal_code),
         country = coalesce(nullif(btrim(target.country), ''), source.country),
         note = coalesce(nullif(btrim(target.note), ''), source.note)
    from (
      select
        (array_agg(s.street order by ids.position) filter (where nullif(btrim(s.street), '') is not null))[1] as street,
        (array_agg(s.city order by ids.position) filter (where nullif(btrim(s.city), '') is not null))[1] as city,
        (array_agg(s.postal_code order by ids.position) filter (where nullif(btrim(s.postal_code), '') is not null))[1] as postal_code,
        (array_agg(s.country order by ids.position) filter (where nullif(btrim(s.country), '') is not null))[1] as country,
        (array_agg(s.note order by ids.position) filter (where nullif(btrim(s.note), '') is not null))[1] as note
        from unnest(v_sources) with ordinality as ids(id, position)
        join public.places s
          on s.id = ids.id
         and s.owner_id = v_owner_id
    ) as source
   where target.owner_id = v_owner_id
     and target.id = p_target_id
     and (
       (nullif(btrim(target.street), '') is null and source.street is not null)
       or (nullif(btrim(target.city), '') is null and source.city is not null)
       or (nullif(btrim(target.postal_code), '') is null and source.postal_code is not null)
       or (nullif(btrim(target.country), '') is null and source.country is not null)
       or (nullif(btrim(target.note), '') is null and source.note is not null)
     );

  update public.transactions t
     set place_id = p_target_id
   where t.owner_id = v_owner_id
     and t.place_id = any (v_sources);

  get diagnostics v_moved = row_count;

  delete from public.places place
   where place.owner_id = v_owner_id
     and place.id = any (v_sources);

  get diagnostics v_deleted = row_count;

  if v_deleted <> cardinality(v_sources) then
    raise exception 'Places changed during the merge. Try again.';
  end if;

  select * into v_place
    from public.places place
   where place.owner_id = v_owner_id
     and place.id = p_target_id;

  return jsonb_build_object(
    'place', to_jsonb(v_place),
    'mergedPlaceIds', to_jsonb(v_sources),
    'movedTransactions', v_moved
  );
end;
$$;

-- MCP two-step merge, like prepare_delete/confirm_delete: the preview issues
-- a five-minute, one-use token bound to the unchanged places.
create table if not exists public.mcp_place_merge_confirmations (
  token uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  source_ids uuid[] not null
    check (cardinality(source_ids) between 1 and 50),
  state_hash text not null check (char_length(state_hash) <= 64),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mcp_place_merge_confirmations enable row level security;

drop policy if exists "MCP place merge confirmations are accessible by owner"
  on public.mcp_place_merge_confirmations;
create policy "MCP place merge confirmations are accessible by owner"
  on public.mcp_place_merge_confirmations
  for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists mcp_place_merge_confirmations_owner_expiry_idx
  on public.mcp_place_merge_confirmations (owner_id, expires_at desc);

revoke all on table public.mcp_place_merge_confirmations from public, anon;
grant select, insert, update, delete on table public.mcp_place_merge_confirmations
  to authenticated;

alter table public.mcp_audit_events
  add column if not exists affected_count integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'mcp_audit_events_affected_count_non_negative'
       and conrelid = 'public.mcp_audit_events'::regclass
  ) then
    alter table public.mcp_audit_events
      add constraint mcp_audit_events_affected_count_non_negative
      check (affected_count is null or affected_count >= 0);
  end if;
end;
$$;

-- Fingerprint of the places taking part in a merge; any edit changes it.
create or replace function public.place_merge_state(p_place_ids uuid[])
returns text
language sql
stable
set search_path = ''
as $$
  select md5(coalesce(string_agg(to_jsonb(place)::text, ',' order by place.id), ''))
    from public.places place
   where place.owner_id = auth.uid()
     and place.id = any (p_place_ids);
$$;

create or replace function public.mcp_prepare_place_merge(
  p_target_id uuid,
  p_source_ids uuid[],
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
  v_preview jsonb := public.place_merge_preview(p_target_id, p_source_ids);
  v_sources uuid[];
  v_token uuid;
  v_expires_at timestamptz;
begin
  select array_agg(value::uuid order by ordinality)
    into v_sources
    from jsonb_array_elements_text(v_preview->'sourcePlaceIds') with ordinality;

  insert into public.mcp_place_merge_confirmations (
    owner_id, target_id, source_ids, state_hash
  ) values (
    v_owner_id, p_target_id, v_sources,
    public.place_merge_state(array_prepend(p_target_id, v_sources))
  )
  returning token, expires_at into v_token, v_expires_at;

  insert into public.mcp_audit_events (
    owner_id, client_id, tool_name, target_type, target_id, request_id,
    outcome, finished_at, target_ids
  ) values (
    v_owner_id, v_client_id, 'prepare_merge_places', 'place', p_target_id,
    gen_random_uuid()::text, 'succeeded', now(), v_sources
  );

  return v_preview || jsonb_build_object(
    'confirmationToken', v_token,
    'expiresAt', v_expires_at
  );
end;
$$;

create or replace function public.mcp_confirm_place_merge(
  p_token uuid,
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
  v_confirmation public.mcp_place_merge_confirmations%rowtype;
  v_result jsonb;
begin
  select * into v_confirmation
    from public.mcp_place_merge_confirmations confirmation
   where confirmation.token = p_token
     and confirmation.owner_id = v_owner_id
     for update;

  if not found then
    raise exception 'Merge confirmation was not found';
  end if;

  if v_confirmation.used_at is not null then
    raise exception 'Merge confirmation has already been used';
  end if;

  if v_confirmation.expires_at <= now() then
    raise exception 'Merge confirmation has expired';
  end if;

  if public.place_merge_state(
       array_prepend(v_confirmation.target_id, v_confirmation.source_ids)
     ) is distinct from v_confirmation.state_hash then
    raise exception 'Places changed after the merge was prepared';
  end if;

  v_result := public.merge_places(v_confirmation.target_id, v_confirmation.source_ids);

  update public.mcp_place_merge_confirmations
     set used_at = now()
   where token = p_token;

  insert into public.mcp_audit_events (
    owner_id, client_id, tool_name, target_type, target_id, request_id,
    outcome, finished_at, target_ids, affected_count
  ) values (
    v_owner_id, v_client_id, 'merge_places', 'place', v_confirmation.target_id,
    gen_random_uuid()::text, 'succeeded', now(), v_confirmation.source_ids,
    (v_result->>'movedTransactions')::integer
  );

  return v_result;
end;
$$;

revoke all on function public.places_matching_name(text) from public, anon;
revoke all on function public.place_merge_sources(uuid, uuid[]) from public, anon;
revoke all on function public.place_merge_preview(uuid, uuid[]) from public, anon;
revoke all on function public.merge_places(uuid, uuid[]) from public, anon;
revoke all on function public.place_merge_state(uuid[]) from public, anon;
revoke all on function public.mcp_prepare_place_merge(uuid, uuid[], text) from public, anon;
revoke all on function public.mcp_confirm_place_merge(uuid, text) from public, anon;

grant execute on function public.places_matching_name(text) to authenticated;
grant execute on function public.place_merge_sources(uuid, uuid[]) to authenticated;
grant execute on function public.place_merge_preview(uuid, uuid[]) to authenticated;
grant execute on function public.merge_places(uuid, uuid[]) to authenticated;
grant execute on function public.place_merge_state(uuid[]) to authenticated;
grant execute on function public.mcp_prepare_place_merge(uuid, uuid[], text) to authenticated;
grant execute on function public.mcp_confirm_place_merge(uuid, text) to authenticated;
