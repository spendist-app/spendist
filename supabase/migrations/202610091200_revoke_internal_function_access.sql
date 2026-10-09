-- Internal scheduler and alert functions were granted to service_role only, but
-- PostgreSQL's default EXECUTE grant to PUBLIC still let anon and authenticated
-- callers reach them through PostgREST.
revoke all on function public.invoke_scheduled_edge_function(text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.invoke_scheduled_edge_function(text, text, jsonb)
  to service_role;

revoke all on function public.notify_admins_exchange_rates_sync_failed(jsonb)
  from public, anon, authenticated;

grant execute on function public.notify_admins_exchange_rates_sync_failed(jsonb)
  to service_role;

-- Public avatar URLs do not need a storage.objects SELECT policy. Keeping SELECT
-- to the owner's folder stops anonymous bucket listing (user id enumeration)
-- while still allowing the owner's upsert and remove calls.
drop policy if exists "Avatar images are publicly readable" on storage.objects;
drop policy if exists "Users can read own avatar objects" on storage.objects;

create policy "Users can read own avatar objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
