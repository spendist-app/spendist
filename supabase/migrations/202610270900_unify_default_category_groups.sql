-- Polish starter categories named the income group "Dochody", while the app and the
-- Allowance module use "Przychody", so accepting an Allowance invitation created a
-- second income group. Allowance spending also created its own "Wydatki"/"Expenses"
-- group next to the starter groups.
--
-- From now on the Allowance spending category joins the starter lifestyle group.
-- Existing accounts: the starter "Dochody" group is renamed to "Przychody" (merging
-- an Allowance-created "Przychody" group into it), and the Allowance spending
-- category moves from an Allowance-created group into the lifestyle group. Only
-- group membership changes; categories, transactions and connections keep their
-- IDs. A group is removed only when it is left without categories.

create or replace function public.ensure_allowance_expense_category(
  p_recipient_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_language text;
  v_category_name text;
  v_group_id uuid;
  v_category_id uuid;
begin
  select lower(coalesce(language, 'en')) into v_language
  from public.profiles
  where id = p_recipient_id;

  if not found then
    raise exception 'Allowance recipient not found' using errcode = 'P0002';
  end if;

  v_category_name := case
    when v_language = 'pl' then 'Wydatki z kieszonkowego'
    else 'Allowance spending'
  end;

  -- Prefer the starter lifestyle group; fall back to the legacy Allowance group.
  select id into v_group_id
  from public.categories_group
  where owner_id = p_recipient_id
    and lower(name) = lower(case when v_language = 'pl' then 'Styl życia' else 'Lifestyle' end)
  limit 1;

  if v_group_id is null then
    select id into v_group_id
    from public.categories_group
    where owner_id = p_recipient_id
      and lower(name) = lower(case when v_language = 'pl' then 'Wydatki' else 'Expenses' end)
    limit 1;
  end if;

  if v_group_id is null then
    insert into public.categories_group (owner_id, name, color, icon)
    values (
      p_recipient_id,
      case when v_language = 'pl' then 'Wydatki' else 'Expenses' end,
      '#DC2626', 'heroBanknotes'
    )
    returning id into v_group_id;
  end if;

  select id into v_category_id
  from public.categories
  where owner_id = p_recipient_id and system_key = 'allowance_expense'
  limit 1;

  if v_category_id is null then
    select id into v_category_id
    from public.categories
    where owner_id = p_recipient_id
      and lower(name) = lower(v_category_name)
    limit 1;
  end if;

  if v_category_id is null then
    insert into public.categories (
      owner_id, group_id, name, color, icon, system_key
    )
    values (
      p_recipient_id, v_group_id, v_category_name,
      '#DC2626', 'heroShoppingBag', 'allowance_expense'
    )
    returning id into v_category_id;
  else
    update public.categories
    set system_key = coalesce(system_key, 'allowance_expense')
    where id = v_category_id and owner_id = p_recipient_id;
  end if;

  return v_category_id;
end;
$$;

-- Moves a category and its descendants, parents first, so the nesting trigger
-- always finds the parent in the target group.
create function pg_temp.move_category_tree(p_owner uuid, p_root uuid, p_group uuid)
returns void
language plpgsql
as $$
declare
  v_category record;
begin
  for v_category in
    with recursive tree as (
      select id, 1 as depth
      from public.categories
      where owner_id = p_owner and id = p_root
      union all
      select c.id, tree.depth + 1
      from public.categories c
      join tree on c.parent_id = tree.id
      where c.owner_id = p_owner
    )
    select id from tree order by depth
  loop
    update public.categories
    set group_id = p_group
    where owner_id = p_owner and id = v_category.id and group_id <> p_group;
  end loop;
end;
$$;

do $$
declare
  v_income record;
  v_spending record;
  v_root record;
begin
  -- 1. One Polish income group named "Przychody".
  for v_income in
    select starter.owner_id, starter.id as starter_id, duplicate.id as duplicate_id
    from public.categories_group starter
    left join public.categories_group duplicate
      on duplicate.owner_id = starter.owner_id
     and lower(duplicate.name) = 'przychody'
    where starter.name = 'Dochody'
  loop
    if v_income.duplicate_id is not null then
      for v_root in
        select id from public.categories
        where owner_id = v_income.owner_id
          and group_id = v_income.duplicate_id
          and parent_id is null
      loop
        perform pg_temp.move_category_tree(v_income.owner_id, v_root.id, v_income.starter_id);
      end loop;

      delete from public.categories_group g
      where g.id = v_income.duplicate_id
        and not exists (select 1 from public.categories c where c.group_id = g.id);

      -- A duplicate that could not be emptied keeps its name; leave this account as is.
      continue when found is false;
    end if;

    update public.categories_group
    set name = 'Przychody'
    where id = v_income.starter_id;
  end loop;

  -- 2. Allowance spending joins the starter lifestyle group.
  for v_spending in
    select c.owner_id, c.id as category_id, c.group_id as legacy_group_id, lifestyle.id as lifestyle_id
    from public.categories c
    join public.categories_group legacy
      on legacy.id = c.group_id
     and lower(legacy.name) in ('wydatki', 'expenses')
    join public.categories_group lifestyle
      on lifestyle.owner_id = c.owner_id
     and lower(lifestyle.name) in ('styl życia', 'lifestyle')
    where c.system_key = 'allowance_expense'
      and c.parent_id is null
  loop
    perform pg_temp.move_category_tree(v_spending.owner_id, v_spending.category_id, v_spending.lifestyle_id);

    delete from public.categories_group g
    where g.id = v_spending.legacy_group_id
      and not exists (select 1 from public.categories c where c.group_id = g.id);
  end loop;
end;
$$;
