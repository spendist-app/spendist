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
  v_delegated_transaction_id uuid;
  v_disconnected_delegated_id uuid;
  v_child_expense_category_id uuid;
  v_child_wallet_id uuid;
  v_parent_delegated_count integer;
  v_recurring_id uuid;
  v_variable_recurring_id uuid;
  v_occurrence_id uuid;
  v_blocked boolean := false;
  v_late_pair jsonb;
  v_late_payer_id uuid;
  v_late_recipient_id uuid;
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

  begin
    perform public.create_allowance_invitation('allowance-child@example.test');
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Direct invitation creation bypassed the email wrapper';
  end if;
  v_blocked := false;

  v_invitation := public.email_allowance_invite(
    'allowance-child@example.test'
  );
  v_invitation_id := (v_invitation ->> 'invitationId')::uuid;

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
  v_delegated_transaction_id := public.create_allowance_recipient_expense(
    v_connection_id,
    '2026-05-20 10:00:00+00',
    'Ice cream',
    12.50,
    'PLN'
  );

  if exists (
    select 1 from public.transactions
    where id = v_delegated_transaction_id
  ) then
    raise exception 'Delegated expense leaked into the payer transaction scope';
  end if;

  select count(*) into v_parent_delegated_count
  from public.get_allowance_recipient_expenses()
  where transaction_id = v_delegated_transaction_id
    and connection_id = v_connection_id
    and recipient_name = 'Allowance Child'
    and description = 'Ice cream'
    and amount = 12.50
    and currency = 'PLN';
  if v_parent_delegated_count <> 1 then
    raise exception 'Payer delegated expense list is incomplete';
  end if;

  perform set_config('request.jwt.claim.sub', v_child::text, true);
  select recipient_expense_category_id into v_child_expense_category_id
  from public.allowance_connections
  where id = v_connection_id;
  select id into v_child_wallet_id
  from public.wallets
  where owner_id = v_child and is_default
  limit 1;

  if not exists (
    select 1 from public.transactions
    where id = v_delegated_transaction_id
      and owner_id = v_child
      and category_id = v_child_expense_category_id
      and wallet_id = v_child_wallet_id
      and direction = 'expense'
      and source_module = 'standard'
      and description = 'Ice cream'
      and amount = 12.50
  ) then
    raise exception 'Recipient-owned delegated expense was not created correctly';
  end if;
  if not exists (
    select 1 from public.categories
    where id = v_child_expense_category_id
      and owner_id = v_child
      and system_key = 'allowance_expense'
      and name = 'Allowance spending'
  ) then
    raise exception 'Recipient Allowance expense category was not created';
  end if;
  if not exists (
    select 1 from public.notifications
    where owner_id = v_child
      and type = 'allowance_expense_added'
      and payload ->> 'transaction_id' = v_delegated_transaction_id::text
      and payload ->> 'payer_name' = 'Allowance Parent'
  ) then
    raise exception 'Delegated expense notification was not created';
  end if;

  v_blocked := false;
  begin
    perform public.update_allowance_recipient_expense(
      v_delegated_transaction_id,
      '2026-05-21 10:00:00+00',
      'Changed by child',
      20,
      'PLN'
    );
  exception when no_data_found then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Recipient could manage the delegated expense as payer';
  end if;

  update public.transactions
  set description = 'Child note'
  where id = v_delegated_transaction_id;

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  if not exists (
    select 1 from public.get_allowance_recipient_expenses()
    where transaction_id = v_delegated_transaction_id
      and description = 'Child note'
  ) then
    raise exception 'Payer list did not reflect the recipient edit';
  end if;

  perform public.update_allowance_recipient_expense(
    v_delegated_transaction_id,
    '2026-05-21 10:00:00+00',
    'Ice cream corrected',
    15,
    'PLN'
  );

  perform set_config('request.jwt.claim.sub', v_child::text, true);
  if not exists (
    select 1 from public.transactions
    where id = v_delegated_transaction_id
      and description = 'Ice cream corrected'
      and amount = 15
      and category_id = v_child_expense_category_id
      and wallet_id = v_child_wallet_id
  ) then
    raise exception 'Payer delegated expense update was not applied safely';
  end if;

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  perform public.delete_allowance_recipient_expense(v_delegated_transaction_id);
  perform set_config('request.jwt.claim.sub', v_child::text, true);
  if exists (
    select 1 from public.transactions where id = v_delegated_transaction_id
  ) then
    raise exception 'Payer delegated expense delete did not remove the child row';
  end if;

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  v_disconnected_delegated_id := public.create_allowance_recipient_expense(
    v_connection_id,
    '2026-05-22 10:00:00+00',
    'Book',
    25,
    'PLN'
  );

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

  perform set_config('request.jwt.claim.sub', v_parent::text, true);
  v_late_pair := public.create_allowance_transaction(
    v_connection_id,
    v_category_id,
    v_wallet_id,
    '2026-05-25 08:00:00+00',
    'Late allowance',
    40,
    'PLN',
    null,
    '{}'::uuid[]
  );
  v_late_payer_id := (v_late_pair ->> 'payer_transaction_id')::uuid;
  v_late_recipient_id := (v_late_pair ->> 'recipient_transaction_id')::uuid;

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
    select 1 from public.get_allowance_recipient_expenses()
    where transaction_id = v_disconnected_delegated_id
  ) then
    raise exception 'Disconnected delegated expenses remained visible to payer';
  end if;
  v_blocked := false;
  begin
    perform public.update_allowance_recipient_expense(
      v_disconnected_delegated_id,
      '2026-05-22 10:00:00+00',
      'Book changed',
      30,
      'PLN'
    );
  exception when no_data_found then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Disconnected payer retained delegated expense access';
  end if;
  if exists (
    select 1 from public.recurring_transactions
    where allowance_connection_id = v_connection_id and is_paused = false
  ) then
    raise exception 'Allowance schedules were not paused after disconnect';
  end if;

  if exists (
    select 1 from public.get_allowance_connections()
    where id = v_connection_id and counterpart_email is not null
  ) then
    raise exception 'Disconnected counterpart email remained visible';
  end if;

  v_blocked := false;
  begin
    perform public.update_allowance_transaction(
      v_late_payer_id, v_category_id, v_wallet_id,
      '2026-05-25 08:00:00+00', 'Late allowance', 400, 'PLN', null
    );
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Disconnected payer changed the recipient amount';
  end if;

  perform public.update_allowance_transaction(
    v_late_payer_id, v_category_id, v_wallet_id,
    '2026-05-25 08:00:00+00', 'Late allowance renamed', 40, 'PLN', null
  );
  perform public.delete_allowance_transaction(v_late_payer_id);
  if exists (select 1 from public.transactions where id = v_late_payer_id) then
    raise exception 'Disconnected payer could not delete own allowance expense';
  end if;

  perform set_config('request.jwt.claim.sub', v_child::text, true);
  if not exists (
    select 1 from public.transactions
    where id = v_late_recipient_id and amount = 40
  ) then
    raise exception 'Disconnected payer removed the recipient income';
  end if;

  begin
    update public.notifications set payload = '{}'::jsonb where owner_id = v_child;
    raise exception 'Notification payload update was not blocked';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Allowance spending joins the starter lifestyle group instead of a separate group.
reset role;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '10000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'allowance-pl@example.test', '',
    timezone('utc', now()), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Allowance PL","language":"pl","wallet_currency_id":1}',
    timezone('utc', now()), timezone('utc', now())
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated', 'allowance-bare@example.test', '',
    timezone('utc', now()), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Allowance Bare","language":"pl","wallet_currency_id":1}',
    timezone('utc', now()), timezone('utc', now())
  );

do $$
declare
  v_with_lifestyle constant uuid := '10000000-0000-0000-0000-000000000003';
  v_without_groups constant uuid := '10000000-0000-0000-0000-000000000004';
  v_lifestyle_id uuid;
  v_category_id uuid;
begin
  update public.profiles set language = 'pl'
  where id in (v_with_lifestyle, v_without_groups);

  insert into public.categories_group (owner_id, name, color, icon)
  values (v_with_lifestyle, 'Styl życia', '#F59E0B', 'heroSparkles')
  returning id into v_lifestyle_id;

  v_category_id := public.ensure_allowance_expense_category(v_with_lifestyle);

  if not exists (
    select 1 from public.categories
    where id = v_category_id and group_id = v_lifestyle_id
      and name = 'Wydatki z kieszonkowego'
  ) then
    raise exception 'Allowance spending did not join the lifestyle group';
  end if;

  if exists (
    select 1 from public.categories_group
    where owner_id = v_with_lifestyle and name = 'Wydatki'
  ) then
    raise exception 'Allowance spending created a separate expense group';
  end if;

  v_category_id := public.ensure_allowance_expense_category(v_without_groups);

  if not exists (
    select 1 from public.categories c
    join public.categories_group g on g.id = c.group_id
    where c.id = v_category_id and g.name = 'Wydatki'
  ) then
    raise exception 'Allowance spending fallback group was not created';
  end if;
end;
$$;

-- Hardening: NaN amounts, profile name length, connected-app tokens, hidden
-- invitee ids and account deletion with Allowance records on both sides.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select id, 'authenticated', 'authenticated', email, '', timezone('utc', now()),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('full_name', name, 'language', 'en', 'wallet_currency_id', 1),
  timezone('utc', now()), timezone('utc', now())
from (values
  ('10000000-0000-0000-0000-000000000005'::uuid, 'harden-payer@example.test', 'Harden Payer'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'harden-child@example.test', 'Harden Child'),
  ('10000000-0000-0000-0000-000000000007'::uuid, 'harden-teen@example.test', 'Harden Teen')
) as u(id, email, name);

set local role authenticated;

do $$
declare
  v_payer constant uuid := '10000000-0000-0000-0000-000000000005';
  v_child constant uuid := '10000000-0000-0000-0000-000000000006';
  v_teen constant uuid := '10000000-0000-0000-0000-000000000007';
  v_group_id uuid;
  v_category_id uuid;
  v_wallet_id uuid;
  v_child_invite uuid;
  v_teen_invite uuid;
  v_child_connection uuid;
  v_teen_connection uuid;
  v_blocked boolean := false;
begin
  -- Earlier blocks set request.jwt.claim.sub, which auth.uid() prefers.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_payer, 'client_id', 'connected-app')::text, true);
  begin
    perform public.email_allowance_invite('harden-child@example.test');
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Connected-app token sent an Allowance invitation';
  end if;
  v_blocked := false;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_payer)::text, true);

  begin
    update public.profiles set full_name = repeat('x', 121) where id = v_payer;
  exception when check_violation then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Profile name longer than 120 characters was accepted';
  end if;
  v_blocked := false;

  insert into public.categories_group (owner_id, name, color, icon)
  values (v_payer, 'Harden allowance', '#DC2626', 'heroGift')
  returning id into v_group_id;
  insert into public.categories (owner_id, group_id, name, color, icon)
  values (v_payer, v_group_id, 'Harden allowance', '#DC2626', 'heroGift')
  returning id into v_category_id;
  select id into v_wallet_id from public.wallets where owner_id = v_payer and is_default;

  v_child_invite := (public.email_allowance_invite('harden-child@example.test') ->> 'invitationId')::uuid;
  v_teen_invite := (public.email_allowance_invite('harden-teen@example.test') ->> 'invitationId')::uuid;

  begin
    perform invitee_id from public.allowance_invitations where id = v_child_invite;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Inviter can read whether the invited address has an account';
  end if;
  v_blocked := false;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_child, 'client_id', 'connected-app')::text, true);
  begin
    perform public.respond_allowance_invitation(v_child_invite, true);
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Connected-app token accepted an Allowance invitation';
  end if;
  v_blocked := false;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_child)::text, true);
  v_child_connection := public.respond_allowance_invitation(v_child_invite, true);

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_teen)::text, true);
  v_teen_connection := public.respond_allowance_invitation(v_teen_invite, true);

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_payer)::text, true);

  begin
    perform public.create_allowance_transaction(
      v_child_connection, v_category_id, v_wallet_id, '2026-06-01 08:00:00+00',
      'NaN allowance', 'NaN'::numeric, 'PLN', null, '{}'::uuid[]
    );
  exception when check_violation then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'NaN allowance amount was accepted';
  end if;
  v_blocked := false;

  perform public.create_allowance_transaction(
    v_child_connection, v_category_id, v_wallet_id, '2026-06-01 08:00:00+00',
    'Harden child allowance', 20, 'PLN', null, '{}'::uuid[]
  );
  perform public.create_allowance_transaction(
    v_teen_connection, v_category_id, v_wallet_id, '2026-06-01 08:00:00+00',
    'Harden teen allowance', 30, 'PLN', null, '{}'::uuid[]
  );
  perform public.create_allowance_recipient_expense(
    v_child_connection, '2026-06-02 10:00:00+00', 'Harden snack', 4, 'PLN'
  );

  insert into public.recurring_transactions (
    owner_id, category_id, wallet_id, name, start_date, schedule,
    amount, amount_mode, currency, direction, source_module, allowance_connection_id
  )
  values (
    v_payer, v_category_id, v_wallet_id, 'Harden weekly allowance',
    '2026-06-01', '0 8 * * 4', 5, 'fixed', 'PLN', 'expense', 'allowance', v_child_connection
  );
end;
$$;

reset role;

do $$
declare
  v_payer constant uuid := '10000000-0000-0000-0000-000000000005';
  v_child constant uuid := '10000000-0000-0000-0000-000000000006';
  v_teen constant uuid := '10000000-0000-0000-0000-000000000007';
  v_blocked boolean := false;
begin
  begin
    insert into public.transactions (
      owner_id, wallet_id, category_id, amount, currency, direction, occurred_at, description
    )
    select v_payer, w.id, c.id, 'NaN'::numeric, 'PLN', 'expense', now(), 'NaN direct'
    from public.wallets w
    join public.categories c on c.owner_id = v_payer and c.name = 'Harden allowance'
    where w.owner_id = v_payer and w.is_default;
  exception when check_violation then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'NaN transaction amount was accepted';
  end if;
  v_blocked := false;

  -- Without detaching, Allowance records block the Auth user delete.
  begin
    delete from auth.users where id = v_child;
  exception when others then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'Expected Allowance records to block a plain account delete';
  end if;

  perform public.detach_allowance_for_account_deletion(v_child);
  delete from auth.users where id = v_child;

  if exists (select 1 from public.profiles where id = v_child) then
    raise exception 'Recipient account was not deleted';
  end if;
  if not exists (
    select 1 from public.transactions
    where owner_id = v_payer and description = 'Harden child allowance'
      and source_module = 'standard' and allowance_connection_id is null
  ) then
    raise exception 'Payer lost the allowance history of a deleted recipient';
  end if;
  if not exists (
    select 1 from public.recurring_transactions
    where owner_id = v_payer and name = 'Harden weekly allowance'
      and source_module = 'standard' and is_paused
  ) then
    raise exception 'Allowance schedule of a deleted recipient was not detached and paused';
  end if;

  perform public.detach_allowance_for_account_deletion(v_payer);
  delete from auth.users where id = v_payer;

  if not exists (
    select 1 from public.transactions
    where owner_id = v_teen and description = 'Harden teen allowance'
      and source_module = 'standard' and allowance_connection_id is null
  ) then
    raise exception 'Recipient lost the allowance history of a deleted payer';
  end if;
end;
$$;

rollback;
