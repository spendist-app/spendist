-- Brand logos for places and recurring payments.
--
-- A logo value has one of two shapes:
--   simple-icons:<slug>:<hex>  an icon bundled with the web app, drawn on a
--                              tile in the brand colour;
--   file:<uuid>.<webp|png>     an image in the owner's folder of the `logos`
--                              Storage bucket. The value never names the
--                              folder, so it cannot point at another user's
--                              object.

alter table public.places
  add column if not exists logo text;

alter table public.recurring_transactions
  add column if not exists logo text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'places_logo_format'
       and conrelid = 'public.places'::regclass
  ) then
    alter table public.places
      add constraint places_logo_format
      check (
        logo is null
        or (
          char_length(logo) <= 96
          and (
            logo ~ '^simple-icons:[a-z0-9_]{1,64}:[0-9a-f]{6}$'
            or logo ~ '^file:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png)$'
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'recurring_transactions_logo_format'
       and conrelid = 'public.recurring_transactions'::regclass
  ) then
    alter table public.recurring_transactions
      add constraint recurring_transactions_logo_format
      check (
        logo is null
        or (
          char_length(logo) <= 96
          and (
            logo ~ '^simple-icons:[a-z0-9_]{1,64}:[0-9a-f]{6}$'
            or logo ~ '^file:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png)$'
          )
        )
      );
  end if;
end;
$$;

-- Uploaded logos: small, already normalised by the browser to WebP or PNG.
-- The bucket is public like `avatars`; object names are random UUIDs and
-- listing is limited to the owner's folder.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'logos',
  'logos',
  true,
  262144,
  array['image/webp', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own logo objects" on storage.objects;
create policy "Users can read own logo objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Objects are immutable, so there is no update policy.
drop policy if exists "Users can upload own logo images" on storage.objects;
create policy "Users can upload own logo images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name !~ '(^|/)\.\.?(/|$)'
    and char_length(name) <= 255
    and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png)$'
  );

drop policy if exists "Users can delete own logo images" on storage.objects;
create policy "Users can delete own logo images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Merge preview: each place also carries its logo, and `fillsLogo` tells
-- whether the kept place would take a logo from a merged one. The
-- `filledFields` list keeps its five address fields so older clients that
-- validate it strictly keep working.
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
  v_fills_logo boolean;
begin
  select jsonb_agg(
           jsonb_build_object(
             'id', place.id,
             'name', place.name,
             'city', place.city,
             'logo', place.logo,
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

  select target.logo is null
         and exists (
           select 1 from public.places s
            where s.owner_id = auth.uid()
              and s.id = any (v_sources)
              and s.logo is not null
         )
    into v_fills_logo
    from public.places target
   where target.owner_id = auth.uid()
     and target.id = p_target_id;

  return jsonb_build_object(
    'targetPlaceId', p_target_id,
    'sourcePlaceIds', to_jsonb(v_sources),
    'places', v_places,
    'movedTransactions', v_moved,
    'filledFields', v_filled,
    'fillsLogo', coalesce(v_fills_logo, false)
  );
end;
$$;

-- Merges the source places into the target place in one database
-- transaction. An empty target logo is filled from the first merged place
-- that has one, like the address fields.
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
         note = coalesce(nullif(btrim(target.note), ''), source.note),
         logo = coalesce(target.logo, source.logo)
    from (
      select
        (array_agg(s.street order by ids.position) filter (where nullif(btrim(s.street), '') is not null))[1] as street,
        (array_agg(s.city order by ids.position) filter (where nullif(btrim(s.city), '') is not null))[1] as city,
        (array_agg(s.postal_code order by ids.position) filter (where nullif(btrim(s.postal_code), '') is not null))[1] as postal_code,
        (array_agg(s.country order by ids.position) filter (where nullif(btrim(s.country), '') is not null))[1] as country,
        (array_agg(s.note order by ids.position) filter (where nullif(btrim(s.note), '') is not null))[1] as note,
        (array_agg(s.logo order by ids.position) filter (where s.logo is not null))[1] as logo
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
       or (target.logo is null and source.logo is not null)
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

-- The dashboard place summary also returns the logo. The return type
-- changes, so the function is dropped and created again.
drop function if exists public.place_expense_summary(integer, uuid);

create function public.place_expense_summary(
  p_year integer,
  p_wallet_id uuid
)
returns table (
  place_id uuid,
  place_name text,
  street text,
  city text,
  postal_code text,
  country text,
  total_amount numeric,
  transaction_count bigint,
  latest_transaction_at timestamptz,
  logo text
)
language sql
stable
set search_path = ''
as $$
  select
    p.id as place_id,
    p.name as place_name,
    p.street,
    p.city,
    p.postal_code,
    p.country,
    coalesce(sum(t.amount_in_default), 0)::numeric as total_amount,
    count(t.id)::bigint as transaction_count,
    max(t.occurred_at) as latest_transaction_at,
    p.logo
  from public.places p
  join public.transactions t
    on t.owner_id = p.owner_id
   and t.place_id = p.id
  where p.owner_id = auth.uid()
    and t.direction = 'expense'
    and extract(year from t.occurred_at at time zone 'utc')::integer = p_year
    and (p_wallet_id is null or t.wallet_id = p_wallet_id)
  group by p.id, p.name, p.street, p.city, p.postal_code, p.country, p.logo
  order by total_amount desc, p.name asc;
$$;

revoke all on function public.place_expense_summary(integer, uuid) from public, anon;
grant execute on function public.place_expense_summary(integer, uuid) to authenticated;
