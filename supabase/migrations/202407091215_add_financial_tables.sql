do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'transaction_direction'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.transaction_direction as enum ('income', 'expense');
  end if;
end;
$$;

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text,
  icon text,
  unique (owner_id, id)
);

create unique index if not exists categories_owner_name_idx
  on public.categories (owner_id, lower(name));

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text,
  icon text,
  unique (owner_id, id)
);

create unique index if not exists tags_owner_name_idx
  on public.tags (owner_id, lower(name));

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null,
  occurred_at timestamptz not null,
  description text,
  amount numeric(12, 2) not null,
  currency char(3) not null,
  exchange_rate numeric(18, 6),
  is_automatic boolean not null default false,
  direction public.transaction_direction not null,
  unique (owner_id, id),
  constraint transactions_category_owner_fk
    foreign key (owner_id, category_id)
    references public.categories (owner_id, id)
    on delete restrict,
  constraint amount_non_negative check (amount >= 0),
  constraint currency_three_letters check (char_length(currency) = 3 and currency = upper(currency))
);

create index if not exists transactions_owner_occurred_at_idx
  on public.transactions (owner_id, occurred_at desc);

create table if not exists public.transaction_tags (
  transaction_id uuid not null,
  tag_id uuid not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  primary key (transaction_id, tag_id),
  constraint transaction_tags_transaction_fk
    foreign key (owner_id, transaction_id)
    references public.transactions (owner_id, id)
    on delete cascade,
  constraint transaction_tags_tag_fk
    foreign key (owner_id, tag_id)
    references public.tags (owner_id, id)
    on delete cascade
);

alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_tags enable row level security;

drop policy if exists "Wallets are accessible by owner" on public.wallets;
create policy "Wallets are accessible by owner"
  on public.wallets
  for select
  using (owner_id = auth.uid());

drop policy if exists "Wallets can be managed by owner" on public.wallets;
create policy "Wallets can be managed by owner"
  on public.wallets
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Categories are accessible by owner" on public.categories;
create policy "Categories are accessible by owner"
  on public.categories
  for select
  using (owner_id = auth.uid());

drop policy if exists "Categories can be managed by owner" on public.categories;
create policy "Categories can be managed by owner"
  on public.categories
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Tags are accessible by owner" on public.tags;
create policy "Tags are accessible by owner"
  on public.tags
  for select
  using (owner_id = auth.uid());

drop policy if exists "Tags can be managed by owner" on public.tags;
create policy "Tags can be managed by owner"
  on public.tags
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Transactions are accessible by owner" on public.transactions;
create policy "Transactions are accessible by owner"
  on public.transactions
  for select
  using (owner_id = auth.uid());

drop policy if exists "Transactions can be managed by owner" on public.transactions;
create policy "Transactions can be managed by owner"
  on public.transactions
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Transaction tags are accessible by owner" on public.transaction_tags;
create policy "Transaction tags are accessible by owner"
  on public.transaction_tags
  for select
  using (owner_id = auth.uid());

drop policy if exists "Transaction tags can be managed by owner" on public.transaction_tags;
create policy "Transaction tags can be managed by owner"
  on public.transaction_tags
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
