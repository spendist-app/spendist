create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_scheduled_edge_function(
  p_function_name text,
  p_secret_name text,
  p_body jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, net, pg_temp
as $$
declare
  v_functions_base_url text;
  v_secret text;
  v_request_id bigint;
begin
  select rtrim(decrypted_secret, '/')
    into v_functions_base_url
  from vault.decrypted_secrets
  where name = 'spendist_functions_base_url'
  limit 1;

  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = p_secret_name
  limit 1;

  if nullif(v_functions_base_url, '') is null then
    raise exception 'Missing Supabase Vault secret: spendist_functions_base_url'
      using errcode = '22023';
  end if;

  if nullif(v_secret, '') is null then
    raise exception 'Missing Supabase Vault secret: %', p_secret_name
      using errcode = '22023';
  end if;

  select net.http_post(
    url := v_functions_base_url || '/' || trim(both '/' from p_function_name),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := coalesce(p_body, '{}'::jsonb)
  )
    into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function public.invoke_scheduled_edge_function(text, text, jsonb)
  to service_role;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname in (
      'spendist-process-recurring-payments-every-5-minutes',
      'spendist-sync-exchange-rates-daily',
      'process-recurring-payments-every-5-minutes',
      'sync-exchange-rates-daily'
    )
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'spendist-process-recurring-payments-every-5-minutes',
  '*/5 * * * *',
  $cron$
  select public.invoke_scheduled_edge_function(
    'process-recurring-payments',
    'spendist_recurring_payments_secret',
    '{}'::jsonb
  );
  $cron$
);

select cron.schedule(
  'spendist-sync-exchange-rates-daily',
  '30 5 * * *',
  $cron$
  select public.invoke_scheduled_edge_function(
    'sync-exchange-rates',
    'spendist_exchange_rates_sync_secret',
    '{}'::jsonb
  );
  $cron$
);

comment on function public.invoke_scheduled_edge_function(text, text, jsonb)
  is 'Invokes a Supabase Edge Function from pg_cron/pg_net using base URL and bearer secret stored in Supabase Vault.';
