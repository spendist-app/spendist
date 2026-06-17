create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  street text,
  city text,
  postal_code text,
  country text,
  note text,
  creation_date timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, id),
  constraint places_name_not_blank check (btrim(name) <> '')
);

create index if not exists places_owner_name_idx
  on public.places (owner_id, lower(name));

alter table public.places enable row level security;

drop policy if exists "Places are accessible by owner" on public.places;
create policy "Places are accessible by owner"
  on public.places
  for select
  using (owner_id = auth.uid());

drop policy if exists "Places can be managed by owner" on public.places;
create policy "Places can be managed by owner"
  on public.places
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop trigger if exists set_places_updated_at on public.places;
create trigger set_places_updated_at
  before update on public.places
  for each row
  execute function public.set_updated_at_timestamp();

alter table public.transactions
  add column if not exists place_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_place_owner_fk'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_place_owner_fk
      foreign key (owner_id, place_id)
      references public.places (owner_id, id)
      on delete set null (place_id);
  end if;
end;
$$;

create index if not exists transactions_owner_place_idx
  on public.transactions (owner_id, place_id)
  where place_id is not null;

create index if not exists transactions_owner_wallet_place_occurred_at_idx
  on public.transactions (owner_id, wallet_id, place_id, occurred_at desc)
  where place_id is not null;

create or replace function public.place_expense_summary(
  p_year integer,
  p_wallet_id uuid
)
returns table (
  place_id uuid,
  place_name text,
  street text,
  city text,
  postal_code text,
  country text,
  total_amount numeric,
  transaction_count bigint,
  latest_transaction_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    p.id as place_id,
    p.name as place_name,
    p.street,
    p.city,
    p.postal_code,
    p.country,
    coalesce(sum(t.amount_in_default), 0)::numeric as total_amount,
    count(t.id)::bigint as transaction_count,
    max(t.occurred_at) as latest_transaction_at
  from public.places p
  join public.transactions t
    on t.owner_id = p.owner_id
   and t.place_id = p.id
  where p.owner_id = auth.uid()
    and t.direction = 'expense'
    and extract(year from t.occurred_at at time zone 'utc')::integer = p_year
    and (p_wallet_id is null or t.wallet_id = p_wallet_id)
  group by p.id, p.name, p.street, p.city, p.postal_code, p.country
  order by total_amount desc, p.name asc;
$$;
