-- Reserve email budget for Supabase Auth messages. Previously every email kind
-- shared one 100/day budget and one per-owner budget, so throwaway sign-ups,
-- invitations or notifications could block password recovery for everyone.
-- Non-auth email is now capped at 60 of the 100 daily jobs, and per-owner
-- counters are kept separately for auth and non-auth email.
create or replace function public.email_enqueue(p_owner uuid, p_key text, p_messages jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := jsonb_array_length(p_messages);
  v_first uuid;
  v_message jsonb;
  v_index integer := 0;
  v_recipient text;
  v_kind text;
begin
  perform pg_advisory_xact_lock(713071001);
  select id into v_first from spendist_email.jobs where dedupe_key = p_key || ':0';
  if found then return v_first; end if;
  if p_owner is null or length(p_key) not between 1 and 200 or v_count not between 1 and 2 then
    raise exception 'Invalid email batch' using errcode = '22023';
  end if;
  v_kind := p_messages->0->>'kind';
  if exists (select 1 from jsonb_array_elements(p_messages) m where m.value->>'kind' is distinct from v_kind) then
    raise exception 'Invalid email batch' using errcode = '22023';
  end if;
  -- Auth email (confirmation, recovery, email change) keeps a reserved share of the
  -- global daily budget and its own per-owner counters, so notification or
  -- invitation volume cannot block sign-in flows.
  if v_kind = 'auth' then
    if (select count(*) from spendist_email.jobs where created_at > now() - interval '24 hours') + v_count > 100
       or (select count(*) from spendist_email.jobs where owner_id = p_owner and kind = 'auth' and created_at > now() - interval '1 hour') + v_count > 5
       or (select count(*) from spendist_email.jobs where owner_id = p_owner and kind = 'auth' and created_at > now() - interval '24 hours') + v_count > 10 then
      return null;
    end if;
  elsif (select count(*) from spendist_email.jobs where kind <> 'auth' and created_at > now() - interval '24 hours') + v_count > 60
     or (select count(*) from spendist_email.jobs where created_at > now() - interval '24 hours') + v_count > 100
     or (select count(*) from spendist_email.jobs where owner_id = p_owner and kind <> 'auth' and created_at > now() - interval '1 hour') + v_count > 5
     or (select count(*) from spendist_email.jobs where owner_id = p_owner and kind <> 'auth' and created_at > now() - interval '24 hours') + v_count > 10 then
    return null;
  end if;
  for v_message in select value from jsonb_array_elements(p_messages) loop
    v_recipient := lower(trim(v_message->>'recipient'));
    if v_recipient is null or length(v_recipient) > 320
       or v_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       or v_message->>'kind' not in ('auth','notification','invitation')
       or coalesce(length(v_message->>'subject'),0) not between 1 and 200
       or coalesce(length(v_message->>'body'),0) not between 1 and 10000
       or v_message->>'subject' ~ E'[\r\n]'
       or (v_message->>'expires_at')::timestamptz <= now()
       or (v_message->>'expires_at')::timestamptz > now() + interval '7 days' then
      raise exception 'Invalid email message' using errcode = '22023';
    end if;
    if (select count(*) from spendist_email.jobs where recipient = v_recipient and created_at > now() - interval '1 hour') >= 3
       or exists (select 1 from spendist_email.jobs where recipient = v_recipient and created_at > now() - interval '60 seconds') then
      return null;
    end if;
  end loop;
  for v_message in select value from jsonb_array_elements(p_messages) loop
    insert into spendist_email.jobs(dedupe_key,owner_id,recipient,kind,subject,body,expires_at,invitation_id,notification_type)
    values(p_key || ':' || v_index,p_owner,lower(trim(v_message->>'recipient')),
      v_message->>'kind',v_message->>'subject',v_message->>'body',
      (v_message->>'expires_at')::timestamptz,(v_message->>'invitation_id')::uuid,v_message->>'notification_type')
    returning id into v_first;
    v_index := v_index + 1;
  end loop;
  select id into v_first from spendist_email.jobs where dedupe_key = p_key || ':0';
  return v_first;
end;
$$;
