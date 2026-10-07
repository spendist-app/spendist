-- Run only after deployment approval. Reuse Vault, never paste secrets into cron SQL.
-- Required Vault secrets: email_functions_url, email_runner_secret.
select cron.schedule('spendist-email-worker','* * * * *',$job$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='email_functions_url')||'/process-email',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
      (select decrypted_secret from vault.decrypted_secrets where name='email_runner_secret')),
    body:='{}'::jsonb,timeout_milliseconds:=50000);
$job$);
select cron.schedule('spendist-email-monitor','*/5 * * * *',$job$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='email_functions_url')||'/monitor-email',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
      (select decrypted_secret from vault.decrypted_secrets where name='email_runner_secret')),
    body:='{}'::jsonb,timeout_milliseconds:=50000);
$job$);
select cron.schedule('spendist-email-retention','29 3 * * *',$job$
  delete from spendist_email.jobs where created_at<now()-interval '7 days' and status<>'sending';
  delete from spendist_email.attempts where reserved_at<now()-interval '25 hours';
  delete from spendist_email.alerts where not active and created_at<now()-interval '30 days';
$job$);
