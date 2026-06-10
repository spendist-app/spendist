create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter table public.profiles
  add column if not exists creation_date timestamptz not null default timezone('utc', now());

update public.profiles
set creation_date = created_at
where creation_date is distinct from created_at;

alter table public.wallets
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.categories_group
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.categories
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.tags
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.transactions
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.transaction_tags
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.recurring_transactions
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.recurring_transaction_tags
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.recurring_transaction_occurrences
  add column if not exists creation_date timestamptz not null default timezone('utc', now());

update public.recurring_transaction_occurrences
set creation_date = created_at
where creation_date is distinct from created_at;

alter table public.notifications
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.notifications
set creation_date = created_at
where creation_date is distinct from created_at;

alter table public.currencies
  add column if not exists creation_date timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

drop trigger if exists set_wallets_updated_at on public.wallets;
create trigger set_wallets_updated_at
  before update on public.wallets
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_categories_group_updated_at on public.categories_group;
create trigger set_categories_group_updated_at
  before update on public.categories_group
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_tags_updated_at on public.tags;
create trigger set_tags_updated_at
  before update on public.tags
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_transaction_tags_updated_at on public.transaction_tags;
create trigger set_transaction_tags_updated_at
  before update on public.transaction_tags
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_recurring_transactions_updated_at on public.recurring_transactions;
create trigger set_recurring_transactions_updated_at
  before update on public.recurring_transactions
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_recurring_transaction_tags_updated_at on public.recurring_transaction_tags;
create trigger set_recurring_transaction_tags_updated_at
  before update on public.recurring_transaction_tags
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_recurring_transaction_occurrences_updated_at on public.recurring_transaction_occurrences;
create trigger set_recurring_transaction_occurrences_updated_at
  before update on public.recurring_transaction_occurrences
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
  before update on public.notifications
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_currencies_updated_at on public.currencies;
create trigger set_currencies_updated_at
  before update on public.currencies
  for each row
  execute function public.set_updated_at_timestamp();
