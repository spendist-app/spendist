-- Read-only deployment checks. No financial records, mail bodies or secrets.
select jsonb_build_object(
  'target_account', (
    select jsonb_build_object(
      'auth_users', count(*),
      'profiles', count(p.id),
      'confirmed_users', count(*) filter (where u.email_confirmed_at is not null),
      'already_admin', coalesce(bool_or(p.is_admin), false)
    )
    from auth.users u left join public.profiles p on p.id = u.id
    where lower(u.email) = 'admin@spendist.app'
  ),
  'email_schema_present', to_regnamespace('spendist_email') is not null,
  'admin_rpc_present', to_regprocedure('public.email_admin_status()') is not null,
  'extensions', (
    select coalesce(jsonb_agg(jsonb_build_object('name', extname, 'version', extversion) order by extname), '[]'::jsonb)
    from pg_extension where extname in ('pg_cron', 'pg_net', 'supabase_vault')
  ),
  'email_schedules', (
    select coalesce(jsonb_agg(jsonb_build_object('name', jobname, 'active', active) order by jobname), '[]'::jsonb)
    from cron.job where jobname in ('spendist-email-worker', 'spendist-email-monitor', 'spendist-email-retention')
  ),
  'email_vault_names', (
    select coalesce(jsonb_agg(name order by name), '[]'::jsonb)
    from vault.secrets where name in ('email_functions_url', 'email_runner_secret')
  )
) as email_preflight;
