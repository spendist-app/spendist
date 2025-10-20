create or replace function public.seed_default_categories(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  group_record jsonb;
  category_record jsonb;
  inserted_group_id uuid;
  groups jsonb := '[
    {
      "name": "Essentials",
      "color": "#0EA5A5",
      "icon": "home",
      "categories": [
        { "name": "Groceries", "color": "#0EA5A5", "icon": "shopping-cart" },
        { "name": "Transport", "color": "#0EA5A5", "icon": "bus" },
        { "name": "Utilities", "color": "#0EA5A5", "icon": "lightning-bolt" }
      ]
    },
    {
      "name": "Lifestyle",
      "color": "#F59E0B",
      "icon": "sparkles",
      "categories": [
        { "name": "Dining Out", "color": "#F59E0B", "icon": "utensils" },
        { "name": "Entertainment", "color": "#F59E0B", "icon": "film" }
      ]
    },
    {
      "name": "Income",
      "color": "#2DD4BF",
      "icon": "banknotes",
      "categories": [
        { "name": "Salary", "color": "#2DD4BF", "icon": "briefcase" },
        { "name": "Side Hustle", "color": "#2DD4BF", "icon": "rocket" }
      ]
    }
  ]'::jsonb;
begin
  for group_record in
    select value
    from jsonb_array_elements(groups)
  loop
    insert into public.categories_group (owner_id, name, color, icon)
    values (
      p_owner,
      group_record ->> 'name',
      group_record ->> 'color',
      group_record ->> 'icon'
    )
    on conflict (owner_id, lower(name))
    do update
      set color = excluded.color,
          icon = excluded.icon
    returning id into inserted_group_id;

    for category_record in
      select value
      from jsonb_array_elements(coalesce(group_record -> 'categories', '[]'::jsonb))
    loop
      insert into public.categories (owner_id, name, color, icon, group_id)
      values (
        p_owner,
        category_record ->> 'name',
        coalesce(category_record ->> 'color', group_record ->> 'color'),
        category_record ->> 'icon',
        inserted_group_id
      )
      on conflict (owner_id, lower(name))
      do update
        set color = excluded.color,
            icon = excluded.icon,
            group_id = excluded.group_id;
    end loop;
  end loop;
end;
$$;

create or replace function public.handle_profiles_insert_seed_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

drop trigger if exists seed_default_categories_on_profiles_insert on public.profiles;

create trigger seed_default_categories_on_profiles_insert
after insert on public.profiles
for each row
execute function public.handle_profiles_insert_seed_defaults();

select public.seed_default_categories(p.id)
from public.profiles as p
where not exists (
  select 1
  from public.categories as c
  where c.owner_id = p.id
);
