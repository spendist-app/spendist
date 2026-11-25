begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '41000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'logos-owner@example.test', '',
    timezone('utc', now()), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Logos Owner","language":"pl","wallet_currency_id":1}',
    timezone('utc', now()), timezone('utc', now())
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'logos-other@example.test', '',
    timezone('utc', now()), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Logos Other","language":"pl","wallet_currency_id":1}',
    timezone('utc', now()), timezone('utc', now())
  );

do $$
begin
  if not exists (
    select 1 from storage.buckets
     where id = 'logos'
       and public
       and file_size_limit = 262144
       and allowed_mime_types = array['image/webp', 'image/png']
  ) then
    raise exception 'The logos bucket is missing or misconfigured';
  end if;
end;
$$;

set local role authenticated;

do $$
declare
  v_owner_id constant uuid := '41000000-0000-0000-0000-000000000001';
  v_other_id constant text := '41000000-0000-0000-0000-000000000002';
  v_object constant text := '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  v_name text;
  v_rejected boolean;
begin
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner_id, 'role', 'authenticated')::text,
    true
  );

  -- A logo in the owner's own folder is accepted and readable.
  insert into storage.objects (bucket_id, name)
  values ('logos', v_owner_id || '/' || v_object || '.webp');

  if not exists (
    select 1 from storage.objects
     where bucket_id = 'logos'
       and name = v_owner_id || '/' || v_object || '.webp'
  ) then
    raise exception 'The owner cannot read their own logo';
  end if;

  -- Another folder, other extensions, extra segments and odd names fail.
  foreach v_name in array array[
    v_other_id || '/' || v_object || '.webp',
    v_owner_id || '/' || v_object || '.svg',
    v_owner_id || '/' || v_object || '.jpg',
    v_owner_id || '/nested/' || v_object || '.png',
    v_owner_id || '/../' || v_other_id || '/' || v_object || '.png',
    v_owner_id || '/logo.png'
  ] loop
    v_rejected := false;

    begin
      insert into storage.objects (bucket_id, name) values ('logos', v_name);
    exception when insufficient_privilege then
      v_rejected := true;
    end;

    if not v_rejected then
      raise exception 'Logo object name was accepted: %', v_name;
    end if;
  end loop;

  -- Objects are immutable: an update matches no row.
  update storage.objects
     set name = v_owner_id || '/' || v_object || '.png'
   where bucket_id = 'logos'
     and name = v_owner_id || '/' || v_object || '.webp';

  if not exists (
    select 1 from storage.objects
     where bucket_id = 'logos'
       and name = v_owner_id || '/' || v_object || '.webp'
  ) then
    raise exception 'A logo object was renamed';
  end if;
end;
$$;

do $$
declare
  v_other_id constant uuid := '41000000-0000-0000-0000-000000000002';
begin
  perform set_config('request.jwt.claim.sub', v_other_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other_id, 'role', 'authenticated')::text,
    true
  );

  -- Another user cannot list the owner's folder.
  if exists (
    select 1 from storage.objects
     where bucket_id = 'logos'
       and name like '41000000-0000-0000-0000-000000000001/%'
  ) then
    raise exception 'Another user can list the owner''s logos';
  end if;
end;
$$;

reset role;

rollback;
