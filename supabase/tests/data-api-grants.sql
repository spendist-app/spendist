-- Run only against the disposable schema-only fixture; never against production.
begin;

do $$
declare
  v_rule record;
  v_operation text;
  v_table text;
  v_role text;
begin
  if current_database() <> 'spendist_grants_test' then
    raise exception 'Requires isolated spendist_grants_test database';
  end if;

  for v_rule in
    select * from (values
      ('profiles', 'authenticated', 'SELECT,UPDATE'),
      ('wallets', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('categories_group', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('categories', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('tags', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('transactions', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('transaction_tags', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('recurring_transactions', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('recurring_transaction_tags', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('recurring_transaction_occurrences', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('notifications', 'authenticated', 'SELECT'),
      ('places', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('currencies', 'authenticated', 'SELECT'),
      ('currencies', 'anon', 'SELECT'),
      ('exchange_rates', 'authenticated', 'SELECT'),
      ('exchange_rates', 'anon', 'SELECT'),
      ('exchange_rates', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('exchange_rate_sync_runs', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('recurring_transactions', 'service_role', 'SELECT'),
      ('recurring_transactions_overview', 'authenticated', 'SELECT'),
      ('recurring_transactions_overview', 'service_role', 'SELECT'),
      ('allowance_invitations', 'authenticated', 'SELECT'),
      ('allowance_connections', 'authenticated', 'SELECT'),
      ('allowance_invitations', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('allowance_connections', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('allowance_delegated_expenses', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mcp_audit_events', 'authenticated', 'SELECT,INSERT,UPDATE'),
      ('mcp_delete_confirmations', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mcp_client_write_grants', 'authenticated', 'SELECT'),
      ('mcp_client_write_grants', 'supabase_auth_admin', 'SELECT'),
      ('wibor_rates', 'authenticated', 'SELECT'),
      ('mortgage_loans', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_rate_periods', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_overpayments', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_holidays', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_schedule_entries', 'authenticated', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_loans', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_rate_periods', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_overpayments', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_holidays', 'service_role', 'SELECT,INSERT,UPDATE,DELETE'),
      ('mortgage_schedule_entries', 'service_role', 'SELECT,INSERT,UPDATE,DELETE')
    ) as rules(table_name, role_name, operations)
  loop
    foreach v_operation in array string_to_array(v_rule.operations, ',') loop
      if not has_table_privilege(v_rule.role_name, 'public.' || v_rule.table_name, v_operation) then
        raise exception 'Missing explicit grant: % % on public.%',
          v_rule.role_name, v_operation, v_rule.table_name;
      end if;
    end loop;
  end loop;

  -- Every future public table must be deliberately classified in this contract.
  for v_table in
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and c.relname <> all(array[
      'profiles','wallets','categories_group','categories','tags','transactions',
      'transaction_tags','recurring_transactions','recurring_transaction_tags',
      'recurring_transaction_occurrences','notifications','places','currencies',
      'exchange_rates','exchange_rate_sync_runs','allowance_invitations',
      'allowance_connections','allowance_delegated_expenses','mcp_audit_events',
      'mcp_delete_confirmations','mcp_client_write_grants','wibor_rates',
      'mortgage_loans','mortgage_rate_periods','mortgage_overpayments',
      'mortgage_holidays','mortgage_schedule_entries'
    ])
  loop
    raise exception 'Classify Data API grants for new public table %', v_table;
  end loop;

  for v_table in
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
  loop
    if not (select relrowsecurity from pg_class where oid=('public.' || v_table)::regclass) then
      raise exception 'RLS is disabled on public.%', v_table;
    end if;
    foreach v_operation in array array['SELECT','INSERT','UPDATE','DELETE'] loop
      if has_table_privilege('anon', 'public.' || v_table, v_operation)
         and not (v_table in ('currencies','exchange_rates') and v_operation='SELECT') then
        raise exception 'Unexpected anonymous access: % public.%', v_operation, v_table;
      end if;
    end loop;
  end loop;

  if not has_column_privilege('authenticated','public.notifications','read_at','UPDATE')
     or has_column_privilege('authenticated','public.notifications','payload','UPDATE')
     or has_column_privilege('authenticated','public.notifications','owner_id','UPDATE') then
    raise exception 'Notification updates must remain restricted to read_at';
  end if;

  foreach v_role in array array['anon','authenticated'] loop
    if has_schema_privilege(v_role,'spendist_email','USAGE') then
      raise exception '% can access private email schema', v_role;
    end if;
    foreach v_operation in array array['INSERT','UPDATE','DELETE'] loop
      if has_table_privilege(v_role,'public.mcp_client_write_grants',v_operation)
         or has_table_privilege(v_role,'public.allowance_delegated_expenses',v_operation) then
        raise exception '% has direct access to protected RPC writes', v_role;
      end if;
    end loop;
  end loop;
end;
$$;

-- Exercise actual RLS-backed queries in addition to inspecting ACLs.
set local role authenticated;
select count(*) from public.transactions;
select count(*) from public.recurring_transactions_overview;
update public.notifications set read_at=now() where false;
reset role;
set local role service_role;
select count(*) from public.recurring_transactions;
select count(*) from public.exchange_rates;
insert into public.exchange_rate_sync_runs(status,range_start,range_end)
values ('started',current_date,current_date);
reset role;

rollback;
