alter table public.recurring_transactions add column if not exists wallet_id uuid;

with default_wallet as (
  select owner_id, id as wallet_id
  from public.wallets
  where is_default
),
fallback_wallet as (
  select distinct on (owner_id)
    owner_id,
    id as wallet_id
  from public.wallets
  order by owner_id, is_default desc, name, id
)
update public.recurring_transactions rt
set wallet_id = coalesce(
    (select dw.wallet_id from default_wallet dw where dw.owner_id = rt.owner_id),
    (select fw.wallet_id from fallback_wallet fw where fw.owner_id = rt.owner_id)
  )
where rt.wallet_id is null;

with fallback_wallet as (
  select distinct on (owner_id)
    owner_id,
    id as wallet_id
  from public.wallets
  order by owner_id, is_default desc, name, id
)
update public.recurring_transactions rt
set wallet_id = fallback_wallet.wallet_id
from fallback_wallet
where rt.owner_id = fallback_wallet.owner_id
  and rt.wallet_id is null;

alter table public.recurring_transactions alter column wallet_id set not null;

alter table public.recurring_transactions drop constraint if exists recurring_transactions_wallet_id_fkey;
alter table public.recurring_transactions drop constraint if exists recurring_transactions_wallet_owner_fk;

alter table public.recurring_transactions
  add constraint recurring_transactions_wallet_owner_fk
  foreign key (owner_id, wallet_id)
  references public.wallets (owner_id, id)
  on delete restrict;

create index if not exists recurring_transactions_wallet_idx on public.recurring_transactions (wallet_id);

with wallet_currency as (
  select rt.id, c.symbol
  from public.recurring_transactions rt
  join public.wallets w on w.id = rt.wallet_id
  join public.currencies c on c.id = w.currency_id
)
update public.recurring_transactions rt
set currency = wallet_currency.symbol
from wallet_currency
where rt.id = wallet_currency.id;
