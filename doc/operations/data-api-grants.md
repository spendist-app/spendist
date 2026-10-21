# Explicit Data API table grants

Supabase stops automatically exposing new public tables in existing projects on 2026-10-30. Existing tables retain their grants. RLS filters rows only after a role has the required table or column privilege; it does not replace GRANT.

Spendist's existing migrations explicitly grant browser access to its financial tables and server access to the recurring-payment and exchange-rate tables. Other backend writes use protected database functions. The private spendist_email schema is not exposed to browser roles. An isolated audit on 2026-10-20 found no missing table privileges for the checked application paths. A separate Supabase project then successfully rebuilt the complete migration history with implicit grants removed; its resulting ACLs passed the contract without manual repairs. No production grant migration was needed.

## New tables

Include explicit per-role grants, RLS and policies in the table-creating migration. Grant only needed operations. Financial tables must not receive anonymous access. Sequence-backed defaults may also need sequence privileges. Preserve restricted column grants, including notification read_at updates, and RPC-only writes for delegated Allowance and MCP consent.

Older tables are also covered by the historical consolidated grant migration 202606171010. Fresh rebuilds must apply the complete migration history, not just the table definitions.

## CI contract

The data-api-grants job runs on pushes and pull requests without production credentials. In its disposable Supabase database, it temporarily prepends the test-only disable-implicit-data-api-grants bootstrap before all application migrations, then runs an explicit local reset without seeds. This bootstrap is not a production migration. It removes table and sequence defaults, including legacy global defaults, so accidental reliance on them is visible.

The job copies the rebuilt schema with its resulting privileges, without data, into spendist_grants_test. It excludes pg_cron/pg_net and their runtime schemas from that copy because they are tied to the original local database. It then runs supabase/tests/data-api-grants.sql. The contract checks required grants for authenticated, anon, service_role and supabase_auth_admin, table inventory and RLS, anonymous denial for private data, column-only notification updates, private mail schema isolation and RPC-only writes. It also executes representative role-based queries and a rolled-back exchange-rate audit insert.

The SQL refuses any database name other than spendist_grants_test and rolls back its test writes. It does not use production data, send email or invoke scheduled functions. New public tables require an explicit classification in the contract. This tests database permissions; browser E2E and separate RLS ownership tests remain responsible for end-user workflows and row isolation.

Source: [Supabase announcement](https://github.com/orgs/supabase/discussions/45329).
