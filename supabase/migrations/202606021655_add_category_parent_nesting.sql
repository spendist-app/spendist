alter table public.categories
  add column if not exists parent_id uuid;

alter table public.categories
  drop constraint if exists categories_parent_fk;

alter table public.categories
  add constraint categories_parent_fk
    foreign key (owner_id, parent_id)
    references public.categories (owner_id, id)
    on delete restrict;

create index if not exists categories_owner_parent_idx
  on public.categories (owner_id, parent_id);

create or replace function public.validate_category_nesting()
returns trigger
language plpgsql
as $$
declare
  parent_group_id uuid;
  ancestor_depth integer;
  subtree_depth integer;
begin
  if new.parent_id is null then
    ancestor_depth := 0;
  else
    if new.parent_id = new.id then
      raise exception 'A category cannot be its own parent.' using errcode = '23514';
    end if;

    select group_id
      into parent_group_id
    from public.categories
    where owner_id = new.owner_id
      and id = new.parent_id;

    if parent_group_id is null then
      raise exception 'Parent category does not exist.' using errcode = '23503';
    end if;

    if parent_group_id <> new.group_id then
      raise exception 'Parent category must belong to the same group.' using errcode = '23514';
    end if;

    with recursive ancestors as (
      select id, parent_id, 1 as depth
      from public.categories
      where owner_id = new.owner_id
        and id = new.parent_id

      union all

      select c.id, c.parent_id, ancestors.depth + 1
      from public.categories c
      join ancestors on ancestors.parent_id = c.id
      where c.owner_id = new.owner_id
        and ancestors.depth < 10
    )
    select coalesce(max(depth), 0)
      into ancestor_depth
    from ancestors;

    if exists (
      with recursive ancestors as (
        select id, parent_id
        from public.categories
        where owner_id = new.owner_id
          and id = new.parent_id

        union all

        select c.id, c.parent_id
        from public.categories c
        join ancestors on ancestors.parent_id = c.id
        where c.owner_id = new.owner_id
      )
      select 1
      from ancestors
      where id = new.id
    ) then
      raise exception 'Category nesting cannot contain cycles.' using errcode = '23514';
    end if;
  end if;

  with recursive descendants as (
    select id, parent_id, 1 as depth
    from public.categories
    where owner_id = new.owner_id
      and id = new.id

    union all

    select c.id, c.parent_id, descendants.depth + 1
    from public.categories c
    join descendants on c.parent_id = descendants.id
    where c.owner_id = new.owner_id
  )
  select coalesce(max(depth), 1)
    into subtree_depth
  from descendants;

  if ancestor_depth + subtree_depth > 3 then
    raise exception 'Categories can be nested up to 3 levels.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_category_nesting_on_write on public.categories;

create trigger validate_category_nesting_on_write
  before insert or update of parent_id, group_id, owner_id
  on public.categories
  for each row
  execute function public.validate_category_nesting();
