alter table public.wallets drop constraint if exists wallets_owner_id_key;

alter table public.wallets add column if not exists is_default boolean not null default false;

insert into public.wallets (owner_id, name, is_default)
select
  p.id,
  case
    when lower(coalesce(p.language, 'en')) = 'pl' then 'Domyślny portfel'
    else 'Default Wallet'
  end,
  true
from public.profiles p
where not exists (
  select 1 from public.wallets w where w.owner_id = p.id
);

with ranked_wallets as (
  select
    id,
    owner_id,
    row_number() over (partition by owner_id order by is_default desc, name, id) as rn
  from public.wallets
)
update public.wallets w
set is_default = ranked_wallets.rn = 1
from ranked_wallets
where w.id = ranked_wallets.id;

create unique index if not exists wallets_owner_default_idx on public.wallets (owner_id) where is_default;

alter table public.wallets add constraint wallets_owner_id_id_key unique (owner_id, id);

alter table public.transactions add column if not exists wallet_id uuid;

with default_wallet as (
  select owner_id, id as wallet_id from public.wallets where is_default
)
update public.transactions t
set wallet_id = default_wallet.wallet_id
from default_wallet
where t.owner_id = default_wallet.owner_id;

with fallback_wallet as (
  select distinct on (owner_id)
    owner_id,
    id as wallet_id
  from public.wallets
  order by owner_id, is_default desc, name, id
)
update public.transactions t
set wallet_id = fallback_wallet.wallet_id
from fallback_wallet
where t.owner_id = fallback_wallet.owner_id and t.wallet_id is null;

alter table public.transactions alter column wallet_id set not null;

alter table public.transactions drop constraint if exists transactions_wallet_id_fkey;
alter table public.transactions drop constraint if exists transactions_wallet_owner_fk;

alter table public.transactions
  add constraint transactions_wallet_owner_fk
  foreign key (owner_id, wallet_id)
  references public.wallets (owner_id, id)
  on delete restrict;

create index if not exists transactions_wallet_id_idx on public.transactions (wallet_id);
create index if not exists transactions_owner_wallet_idx on public.transactions (owner_id, wallet_id);

create or replace function public.ensure_default_wallet()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.wallets where owner_id = new.id) then
    return new;
  end if;

  insert into public.wallets (owner_id, name, is_default)
  values (
    new.id,
    case
      when lower(coalesce(new.language, 'en')) = 'pl' then 'Domyślny portfel'
      else 'Default Wallet'
    end,
    true
  );

  return new;
end;
$$;

drop trigger if exists profiles_create_default_wallet on public.profiles;

create trigger profiles_create_default_wallet
  after insert on public.profiles
  for each row
  execute function public.ensure_default_wallet();
