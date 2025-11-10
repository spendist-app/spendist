alter table public.wallets add column if not exists currency_id smallint;

update public.wallets w
set currency_id = p.default_currency_id
from public.profiles p
where w.owner_id = p.id
  and p.default_currency_id is not null;

update public.wallets
set currency_id = 1
where currency_id is null;

alter table public.wallets alter column currency_id set default 1;
alter table public.wallets alter column currency_id set not null;

alter table public.wallets drop constraint if exists wallets_currency_id_fkey;
alter table public.wallets
  add constraint wallets_currency_id_fkey
  foreign key (currency_id) references public.currencies(id);

create index if not exists wallets_currency_idx on public.wallets (currency_id);

alter table public.profiles drop constraint if exists profiles_default_currency_id_fkey;
alter table public.profiles drop column if exists default_currency_id;

create or replace function public.ensure_default_wallet()
returns trigger
language plpgsql
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
