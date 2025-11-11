alter table public.transactions
  add column if not exists amount_in_default numeric(18, 2);

with wallet_data as (
  select
    t.id,
    case
      when upper(t.currency) = upper(coalesce(cur.symbol, t.currency)) then t.amount
      when t.exchange_rate is not null and t.exchange_rate > 0 then t.amount / t.exchange_rate
      else t.amount
    end as computed_amount
  from public.transactions t
  left join public.wallets w on w.id = t.wallet_id
  left join public.currencies cur on cur.id = w.currency_id
)
update public.transactions as t
set amount_in_default = wallet_data.computed_amount
from wallet_data
where wallet_data.id = t.id;

alter table public.transactions
  alter column amount_in_default set not null;

alter table public.transactions
  alter column amount_in_default set default 0;
