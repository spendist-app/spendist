create table public.currencies (
  id smallint primary key,
  symbol char(3) not null unique check (symbol = upper(symbol))
);

insert into public.currencies (id, symbol) values
  (1, 'PLN'),
  (2, 'USD'),
  (3, 'EUR'),
  (4, 'GBP'),
  (5, 'CHF'),
  (6, 'JPY'),
  (7, 'CNY'),
  (8, 'AUD'),
  (9, 'CAD'),
  (10, 'SEK'),
  (11, 'NOK'),
  (12, 'DKK'),
  (13, 'CZK'),
  (14, 'INR'),
  (15, 'NZD');

alter table public.profiles add column default_currency_id smallint;

update public.profiles
set default_currency_id = c.id
from public.currencies c
where upper(public.profiles.default_currency) = c.symbol;

update public.profiles
set default_currency_id = 1
where default_currency_id is null;

alter table public.profiles alter column default_currency_id set not null;
alter table public.profiles alter column default_currency_id set default 1;

alter table public.profiles add constraint profiles_default_currency_id_fkey
  foreign key (default_currency_id) references public.currencies(id);

alter table public.profiles drop column default_currency;
