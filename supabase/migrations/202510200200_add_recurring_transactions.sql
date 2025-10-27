create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null,
  name text not null,
  start_date date not null,
  end_date date,
  schedule text not null,
  amount numeric(12, 2) not null,
  currency char(3) not null,
  exchange_rate numeric(18, 6),
  direction public.transaction_direction not null default 'expense',
  unique (owner_id, id),
  constraint recurring_transactions_category_owner_fk
    foreign key (owner_id, category_id)
    references public.categories (owner_id, id)
    on delete restrict,
  constraint recurring_transactions_schedule_not_empty
    check (length(trim(schedule)) > 0),
  constraint recurring_transactions_date_range_valid
    check (end_date is null or end_date >= start_date),
  constraint recurring_transactions_amount_non_negative
    check (amount >= 0),
  constraint recurring_transactions_currency_format
    check (char_length(currency) = 3 and currency = upper(currency))
);

create unique index if not exists recurring_transactions_owner_name_idx
  on public.recurring_transactions (owner_id, lower(name));

create index if not exists recurring_transactions_owner_start_idx
  on public.recurring_transactions (owner_id, start_date);

create table if not exists public.recurring_transaction_tags (
  recurring_transaction_id uuid not null,
  tag_id uuid not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  primary key (recurring_transaction_id, tag_id),
  constraint recurring_transaction_tags_recurring_fk
    foreign key (owner_id, recurring_transaction_id)
    references public.recurring_transactions (owner_id, id)
    on delete cascade,
  constraint recurring_transaction_tags_tag_fk
    foreign key (owner_id, tag_id)
    references public.tags (owner_id, id)
    on delete cascade
);

alter table public.recurring_transactions enable row level security;
alter table public.recurring_transaction_tags enable row level security;

drop policy if exists "Recurring transactions are accessible by owner" on public.recurring_transactions;
create policy "Recurring transactions are accessible by owner"
  on public.recurring_transactions
  for select
  using (owner_id = auth.uid());

drop policy if exists "Recurring transactions can be managed by owner" on public.recurring_transactions;
create policy "Recurring transactions can be managed by owner"
  on public.recurring_transactions
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Recurring transaction tags are accessible by owner" on public.recurring_transaction_tags;
create policy "Recurring transaction tags are accessible by owner"
  on public.recurring_transaction_tags
  for select
  using (owner_id = auth.uid());

drop policy if exists "Recurring transaction tags can be managed by owner" on public.recurring_transaction_tags;
create policy "Recurring transaction tags can be managed by owner"
  on public.recurring_transaction_tags
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
