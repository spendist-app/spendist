begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
  'mortgage-owner@example.test', '', timezone('utc', now()),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Mortgage Owner","language":"en","wallet_currency_id":1}',
  timezone('utc', now()), timezone('utc', now())
);

set local role authenticated;

do $$
declare
  v_owner constant uuid := '30000000-0000-0000-0000-000000000001';
  v_wallet uuid; v_group uuid; v_category uuid; v_loan uuid; v_entry uuid;
  v_blocked boolean := false;
begin
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  select id into v_wallet from public.wallets where owner_id = v_owner and is_default;
  insert into public.categories_group(owner_id, name) values (v_owner, 'Housing') returning id into v_group;
  insert into public.categories(owner_id, group_id, name) values (v_owner, v_group, 'Mortgage') returning id into v_category;
  insert into public.mortgage_loans(owner_id, name, principal, disbursed_on, first_installment_on,
    term_months, installment_type, margin, wibor_tenor, wallet_id, category_id, revision)
  values (v_owner, 'Home', 300000, '2026-01-01', '2026-02-01', 300, 'equal', 2, '3M', v_wallet, v_category, 1)
  returning id into v_loan;
  insert into public.mortgage_rate_periods(owner_id, mortgage_id, position, starts_on, rate_type, fixed_rate)
  values(v_owner, v_loan, 0, '2026-01-01', 'fixed', 6);
  insert into public.mortgage_schedule_entries(owner_id, mortgage_id, revision, sequence, scheduled_for,
    entry_type, opening_balance, annual_rate, rate_status, payment, principal_part, interest_part, remaining_principal)
  values(v_owner, v_loan, 1, 1, current_date + 30, 'installment', 300000, 6, 'fixed', 2000, 500, 1500, 299500)
  returning id into v_entry;

  if public.sync_mortgage_transactions(v_loan) <> 1 then
    raise exception 'Expected one synchronized installment';
  end if;
  if not exists(select 1 from public.transactions where mortgage_schedule_entry_id = v_entry
      and transaction_state = 'planned' and source_module = 'mortgage') then
    raise exception 'Future mortgage installment was not planned';
  end if;
  if exists(
    select 1
    from public.category_expense_summary(null, null)
    where category_id = v_category
      and (category_transaction_count <> 0 or category_total_amount <> 0)
  ) then
    raise exception 'Planned mortgage installment leaked into category filters';
  end if;

  begin
    update public.transactions set amount = 1 where mortgage_schedule_entry_id = v_entry;
  exception when insufficient_privilege then v_blocked := true;
  end;
  if not v_blocked then raise exception 'Direct mortgage transaction mutation was allowed'; end if;

  if public.detach_mortgage_transactions(v_loan) <> 1 then
    raise exception 'Expected one detached installment';
  end if;
end $$;

rollback;
