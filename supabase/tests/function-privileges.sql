begin;

do $$
declare
  v_signature text;
  v_role text;
begin
  foreach v_signature in array array[
    'public.invoke_scheduled_edge_function(text,text,jsonb)',
    'public.notify_admins_exchange_rates_sync_failed(jsonb)',
    'public.activate_all_due_mortgage_transactions(date)',
    'public.set_allowance_invitation_delivery(uuid,text)',
    'public.create_allowance_invitation(text)'
  ] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      if to_regprocedure(v_signature) is null then
        raise exception 'Missing function %', v_signature;
      end if;

      if has_function_privilege(v_role, v_signature, 'execute') then
        raise exception '% can execute %', v_role, v_signature;
      end if;
    end loop;
  end loop;
end;
$$;

rollback;
