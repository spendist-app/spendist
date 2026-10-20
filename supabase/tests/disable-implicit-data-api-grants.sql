-- CI-only bootstrap, copied before application migrations on a disposable runner.
-- Global revokes also remove older Supabase defaults that schema-only revokes cannot undo.
alter default privileges for role postgres
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
