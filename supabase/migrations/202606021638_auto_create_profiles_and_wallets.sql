create or replace function public.resolve_preferred_currency_id(user_meta jsonb)
returns smallint
language plpgsql
stable
set search_path = public
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
set search_path = public, auth
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
set search_path = public, auth
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

drop trigger if exists auth_users_create_profile on auth.users;

create trigger auth_users_create_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

with missing_profiles as (
  select
    u.id,
    u.email,
    u.raw_user_meta_data,
    replace(left(u.id::text, 8), '-', '') as short_id
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
),
resolved_profiles as (
  select
    id,
    case
      when username_rank > 1
        then username_base || '_' || short_id
      when exists (
        select 1
        from public.profiles p
        where p.username = username_base
      )
        then username_base || '_' || short_id
      else username_base
    end as username,
    raw_user_meta_data
  from (
    select
      id,
      raw_user_meta_data,
      short_id,
      username_base,
      row_number() over (partition by username_base order by id) as username_rank
    from (
      select
        id,
        raw_user_meta_data,
        short_id,
        case
        when length(username_base) >= 3 then username_base
        else 'user_' || short_id
      end as username_base
      from (
        select
          id,
          raw_user_meta_data,
          short_id,
          trim(both '_' from lower(regexp_replace(
            coalesce(
              nullif(raw_user_meta_data ->> 'username', ''),
              nullif(split_part(email, '@', 1), ''),
              'user'
            ),
            '[^a-z0-9]+',
            '_',
            'g'
          ))) as username_base
        from missing_profiles
      ) normalized
    ) candidates_with_base
  ) candidates
)
insert into public.profiles (
  id,
  username,
  full_name,
  avatar_url,
  language,
  timezone
)
select
  id,
  username,
  coalesce(
    nullif(raw_user_meta_data ->> 'full_name', ''),
    nullif(raw_user_meta_data ->> 'name', ''),
    username
  ),
  nullif(raw_user_meta_data ->> 'avatar_url', ''),
  coalesce(nullif(raw_user_meta_data ->> 'language', ''), 'en'),
  coalesce(nullif(raw_user_meta_data ->> 'timezone', ''), 'UTC')
from resolved_profiles
on conflict (id) do nothing;

insert into public.wallets (owner_id, name, is_default, currency_id)
select
  p.id,
  case
    when lower(coalesce(p.language, 'en')) = 'pl' then 'Domyślny portfel'
    else 'Default Wallet'
  end,
  true,
  public.resolve_preferred_currency_id(coalesce(u.raw_user_meta_data, '{}'::jsonb))
from public.profiles p
join auth.users u on u.id = p.id
where not exists (
  select 1
  from public.wallets w
  where w.owner_id = p.id
);
