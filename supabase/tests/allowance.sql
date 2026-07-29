begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'allowance-parent@example.test', '',
    timezone('utc', now()), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Allowance Parent","language":"en","wallet_currency_id":1}',
    timezone('utc', now()), timezone('utc', now())
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'allowance-child@example.test', '',
    timezone('utc', now()), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Allowance Child","language":"en","wallet_currency_id":1}',
    timezone('utc', now()), timezone('utc', now())
  );

set local role authenticated;

do $$
declare
  v_parent constant uuid := '10000000-0000-0000-0000-000000000001';
  v_child constant uuid := '10000000-0000-0000-0000-000000000002';
  v_group_id uuid;
  v_category_id uuid;
  v_wallet_id uuid;
  v_invitation jsonb;
  v_invitation_id uuid;
  v_connection_id uuid;
  v_pair jsonb;
  v_payer_transaction_id uuid;
  v_recipient_transaction_id uuid;
  v_recurring_id uuid;
  v_variable_recurring_id uuid;
  v_occurrence_id uuid;
  v_blocked boolean := false;
begin
  perform set_config('request.jwt.claim.sub', v_parent::text, true);

  insert into public.categories_group (owner_id, name, color, icon)
  values (v_parent, 'Allowance expenses', '#DC2626', 'heroGift')
  returning id into v_group_id;
  insert into public.categories (owner_id, group_id, name, color, icon)
  values (v_parent, v_group_id, 'Child allowance', '#DC2626', 'heroGift')
  returning id into v_category_id;
  select id into v_wallet_id
  from public.wallets where owner_id = v_parent and is_default;

  v_invitation := public.create_allowance_invitation(
    'allowance-child@example.test'
  );
  v_invitation_id := (v_invitation ->> 'invitation_id')::uuid;

  perform set_config('request.jwt.claim.sub', v_child::text, true);
  v_connection_id := public.respond_allowance_invitation(
    v_invitation_id, true
  );

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  v_pair := public.create_allowance_transaction(
    v_connection_id,
    v_category_id,
    v_wallet_id,
    '2026-05-20 08:00:00+00',
    'Monthly allowance',
    100,
    'PLN',
    null,
    '{}'::uuid[]
  );
  v_payer_transaction_id :=
    (v_pair ->> 'payer_transaction_id')::uuid;
  v_recipient_transaction_id :=
    (v_pair ->> 'recipient_transaction_id')::uuid;

  if not exists (
    select 1 from public.transactions
    where id = v_payer_transaction_id
      and owner_id = v_parent
      and direction = 'expense'
      and allowance_role = 'payer'
  ) then
    raise exception 'Payer allowance transaction was not created correctly';
  end if;
  perform set_config('request.jwt.claim.sub', v_child::text, true);
  if not exists (
    select 1 from public.transactions
    where id = v_recipient_transaction_id
      and owner_id = v_child
      and direction = 'income'
      and allowance_role = 'recipient'
  ) then
    raise exception 'Recipient allowance transaction was not created correctly';
  end if;

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  perform public.update_allowance_transaction(
    v_payer_transaction_id,
    v_category_id,
    v_wallet_id,
    '2026-05-20 08:00:00+00',
    'Monthly allowance',
    125,
    'PLN',
    null
  );
  if (
    select amount from public.transactions
    where id = v_recipient_transaction_id
  ) <> 125 then
    raise exception 'Recipient amount was not synchronized';
  end if;

  perform set_config('request.jwt.claim.sub', v_child::text, true);
  begin
    update public.transactions
    set amount = 999
    where id = v_recipient_transaction_id;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Recipient amount update was not blocked';
  end if;

  v_blocked := false;
  begin
    delete from public.transactions where id = v_recipient_transaction_id;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Recipient delete was not blocked';
  end if;

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  perform public.delete_allowance_transaction(v_payer_transaction_id);
  if exists (
    select 1 from public.transactions
    where id = v_payer_transaction_id
  ) then
    raise exception 'Payer allowance transaction was not deleted';
  end if;
  perform set_config('request.jwt.claim.sub', v_child::text, true);
  if exists (
    select 1 from public.transactions where id = v_recipient_transaction_id
  ) then
    raise exception 'Recipient allowance transaction was not deleted atomically';
  end if;

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  insert into public.recurring_transactions (
    owner_id, category_id, wallet_id, name, start_date, schedule,
    amount, amount_mode, currency, direction, source_module,
    allowance_connection_id
  )
  values (
    v_parent, v_category_id, v_wallet_id, 'Weekly allowance',
    '2026-05-01', '0 8 * * 4', 50, 'fixed', 'PLN', 'expense',
    'allowance', v_connection_id
  )
  returning id into v_recurring_id;

  v_blocked := false;
  perform set_config('request.jwt.claim.sub', v_child::text, true);
  begin
    perform public.enqueue_recurring_transaction(
      v_recurring_id, '2026-05-21 08:00:00+00'
    );
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Cross-owner recurring execution was not blocked';
  end if;

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  perform public.enqueue_recurring_transaction(
    v_recurring_id, '2026-05-21 08:00:00+00'
  );
  if (
    select count(*) from public.transactions
    where allowance_connection_id = v_connection_id
      and recurring_scheduled_for = '2026-05-21 08:00:00+00'
  ) <> 1 then
    raise exception 'Payer recurring allowance was not created';
  end if;
  perform set_config('request.jwt.claim.sub', v_child::text, true);
  if not exists (
    select 1 from public.transactions
    where allowance_connection_id = v_connection_id
      and allowance_role = 'recipient'
      and description = 'Weekly allowance'
  ) then
    raise exception 'Recipient recurring allowance was not created';
  end if;

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  insert into public.recurring_transactions (
    owner_id, category_id, wallet_id, name, start_date, schedule,
    amount, amount_mode, currency, direction, source_module,
    allowance_connection_id
  )
  values (
    v_parent, v_category_id, v_wallet_id, 'Variable allowance',
    '2026-05-01', '0 8 22 * *', 0, 'variable', 'PLN', 'expense',
    'allowance', v_connection_id
  )
  returning id into v_variable_recurring_id;
  perform public.enqueue_recurring_transaction(
    v_variable_recurring_id, '2026-05-22 08:00:00+00'
  );
  select id into v_occurrence_id
  from public.recurring_transaction_occurrences
  where recurring_transaction_id = v_variable_recurring_id
    and scheduled_for = '2026-05-22 08:00:00+00';
  if v_occurrence_id is null then
    raise exception 'Variable allowance occurrence was not queued';
  end if;
  perform public.complete_recurring_transaction_occurrence(
    v_occurrence_id, 75
  );
  if not exists (
    select 1 from public.transactions
    where recurring_transaction_id = v_variable_recurring_id
      and amount = 75
  ) then
    raise exception 'Variable allowance payer transaction was not completed';
  end if;

  perform set_config('request.jwt.claim.sub', v_child::text, true);
  perform public.disconnect_allowance_connection(v_connection_id);
  if exists (
    select 1 from public.allowance_connections
    where id = v_connection_id and status = 'active'
  ) then
    raise exception 'Allowance connection was not disconnected';
  end if;
  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  if exists (
    select 1 from public.recurring_transactions
    where allowance_connection_id = v_connection_id and is_paused = false
  ) then
    raise exception 'Allowance schedules were not paused after disconnect';
  end if;
end;
$$;

rollback;
