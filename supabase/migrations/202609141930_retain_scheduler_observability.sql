create extension if not exists pg_cron with schema cron;
create extension if not exists pg_net with schema net;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname = 'spendist-purge-scheduler-observability-daily'
       or jobname like 'recurring-%'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

drop trigger if exists recurring_transactions_cron_sync
  on public.recurring_transactions;
drop trigger if exists recurring_transactions_cron_cleanup
  on public.recurring_transactions;

update public.recurring_transactions
set cron_job_id = null
where cron_job_id is not null;

delete from cron.job_run_details
where end_time < now() - interval '7 days';

delete from net._http_response
where created < now() - interval '24 hours';

select cron.schedule(
  'spendist-purge-scheduler-observability-daily',
  '17 3 * * *',
  $cron$
  delete from cron.job_run_details
  where end_time < now() - interval '7 days';

  delete from net._http_response
  where created < now() - interval '24 hours';
  $cron$
);
