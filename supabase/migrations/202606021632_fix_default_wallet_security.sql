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

  preferred_currency_id := coalesce(
    (user_meta ->> 'wallet_currency_id')::smallint,
    (user_meta ->> 'default_currency_id')::smallint,
    1
  );

  if not exists (select 1 from public.currencies c where c.id = preferred_currency_id) then
    preferred_currency_id := 1;
  end if;

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
