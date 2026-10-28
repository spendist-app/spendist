-- Narrow default role privileges and avatar object names.
-- 1. Browser roles never need TRIGGER, TRUNCATE (which ignores row-level
--    security) or REFERENCES on application tables, nor the HTTP helpers in the
--    supabase_functions and net schemas. Only SECURITY DEFINER code calls net.
-- 2. Avatar object names reject dot segments and long names.

revoke trigger, truncate, references on all tables in schema public from anon, authenticated;

do $$
declare
  v_owner text;
begin
  foreach v_owner in array array['postgres', 'supabase_admin'] loop
    begin
      execute format(
        'alter default privileges for role %I in schema public revoke trigger, truncate, references on tables from anon, authenticated',
        v_owner
      );
    exception when insufficient_privilege then
      raise notice 'Default privileges of % are managed by the platform', v_owner;
    end;
  end loop;
end;
$$;

-- These schemas belong to the platform; a REVOKE without ownership only warns.
do $$
declare
  v_schema text;
begin
  foreach v_schema in array array['supabase_functions', 'net'] loop
    if exists (select 1 from pg_namespace where nspname = v_schema) then
      begin
        execute format(
          'revoke execute on all functions in schema %I from public, anon, authenticated',
          v_schema
        );
        execute format('revoke usage on schema %I from anon, authenticated', v_schema);
      exception when insufficient_privilege then
        raise notice 'Privileges in schema % are managed by the platform', v_schema;
      end;
    end if;
  end loop;
end;
$$;

drop policy if exists "Users can upload own avatar images" on storage.objects;
create policy "Users can upload own avatar images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name !~ '(^|/)\.\.?(/|$)'
    and char_length(name) <= 255
  );

drop policy if exists "Users can update own avatar images" on storage.objects;
create policy "Users can update own avatar images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name !~ '(^|/)\.\.?(/|$)'
    and char_length(name) <= 255
  );
