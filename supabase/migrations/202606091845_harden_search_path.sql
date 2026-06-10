-- SEC-09: Harden SECURITY DEFINER functions by adding pg_temp to search_path
-- to prevent temporary-object-based privilege escalation attacks.

-- Functions that previously had 'set search_path = public' or 'set search_path = public, auth'
-- without pg_temp are updated to include pg_temp.

create or replace function public.resolve_preferred_currency_id(user_meta jsonb)
returns smallint
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  raw_currency_id text;
  preferred_currency_id smallint;
begin
  raw_currency_id := coalesce(
    user_meta ->> 'wallet_currency_id',
    user_meta ->> 'default_currency_id'
  );

  if raw_currency_id ~ '^\d+$' then
    preferred_currency_id := raw_currency_id::smallint;
  end if;

  if exists (select 1 from public.currencies where id = preferred_currency_id) then
    return preferred_currency_id;
  end if;

  return 1;
end;
$$;

create or replace function public.ensure_default_wallet()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  preferred_currency_id smallint;
  user_meta jsonb;
begin
  if exists (select 1 from public.wallets where owner_id = new.id) then
    return new;
  end if;

  select raw_user_meta_data into user_meta
  from auth.users
  where id = new.id;

  preferred_currency_id := public.resolve_preferred_currency_id(coalesce(user_meta, '{}'::jsonb));

  insert into public.wallets (owner_id, name, is_default, currency_id)
  values (
    new.id,
    case
      when lower(coalesce(new.language, 'en')) = 'pl' then 'Domyślny portfel'
      else 'Default Wallet'
    end,
    true,
    preferred_currency_id
  );

  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  base_username text;
  resolved_username text;
  short_id text;
begin
  short_id := replace(left(new.id::text, 8), '-', '');
  base_username := lower(
    regexp_replace(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'username', ''),
        nullif(split_part(new.email, '@', 1), ''),
        'user'
      ),
      '[^a-z0-9]+',
      '_',
      'g'
    )
  );
  base_username := trim(both '_' from base_username);

  if length(base_username) < 3 then
    base_username := 'user_' || short_id;
  end if;

  resolved_username := base_username;
  if exists (
    select 1
    from public.profiles
    where username = resolved_username
      and id <> new.id
  ) then
    resolved_username := base_username || '_' || short_id;
  end if;

  insert into public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    language,
    timezone
  )
  values (
    new.id,
    resolved_username,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      resolved_username
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'en'),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  )
  on conflict (id) do update
  set
    username = excluded.username,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    language = excluded.language,
    timezone = excluded.timezone,
    updated_at = timezone('utc', now());

  return new;
end;
$$;
