alter table public.currencies enable row level security;

drop policy if exists "Currencies are publicly readable"
  on public.currencies;

create policy "Currencies are publicly readable"
  on public.currencies
  for select
  to anon, authenticated
  using (true);
