create table if not exists public.categories_group (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text,
  icon text
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.categories_group'::regclass
      and conname = 'categories_group_owner_id_id_key'
  ) then
    alter table public.categories_group
      add constraint categories_group_owner_id_id_key unique (owner_id, id);
  end if;
end;
$$;

create unique index if not exists categories_group_owner_name_idx
  on public.categories_group (owner_id, lower(name));

insert into public.categories_group (owner_id, name, color, icon)
select owner_id, name, color, icon
from public.categories
on conflict (owner_id, lower(name)) do nothing;

alter table public.categories
  add column if not exists group_id uuid;

update public.categories as c
set group_id = cg.id
from public.categories_group as cg
where c.group_id is null
  and cg.owner_id = c.owner_id
  and lower(cg.name) = lower(c.name);

alter table public.categories
  alter column group_id set not null;

alter table public.categories
  add constraint categories_group_fk
    foreign key (owner_id, group_id)
    references public.categories_group (owner_id, id)
    on delete restrict;

create index if not exists categories_group_owner_idx
  on public.categories (owner_id, group_id);

alter table public.categories_group enable row level security;

drop policy if exists "Categories group are accessible by owner" on public.categories_group;
create policy "Categories group are accessible by owner"
  on public.categories_group
  for select
  using (owner_id = auth.uid());

drop policy if exists "Categories group can be managed by owner" on public.categories_group;
create policy "Categories group can be managed by owner"
  on public.categories_group
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
