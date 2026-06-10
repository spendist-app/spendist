do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname in (
      'spendist-process-recurring-payments-every-5-minutes',
      'spendist-sync-exchange-rates-daily'
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
    'spendist_internal_function_secret',
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
    'spendist_internal_function_secret',
    '{}'::jsonb
  );
  $cron$
);
