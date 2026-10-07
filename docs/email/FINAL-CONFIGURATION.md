# Remaining production configuration

Updated 2026-10-07. The owner approved the concrete deployment and credentials described below. See the execution evidence for what is deployed and what remains conditional.

## Read-only preflight findings

- Remote migration history matches every existing local migration. Only `202610071330_secure_email.sql` is pending; there are no remote-only migrations to reconcile.
- The production database has no Auth user or profile for `admin@spendist.app`. The owner subsequently identified an existing account; its confirmed Auth user, profile and is_admin=false were verified through a trusted read-only lookup. The private identity is not committed here. Alert delivery to admin@spendist.app is independent of an application login.
- Email schema, administrator email statistics RPC, three email schedules and email-specific Vault names are absent, as expected before deployment.
- Required database extensions already exist: pg_cron 1.6.4, pg_net 0.20.3 and supabase_vault 0.3.1.
- The read-only Supabase function-list request through the existing CLI credential returned 403 insufficient privileges. Check access in the approved browser session; do not reuse unrelated credentials, disclose tokens or silently create broader access.
- Root MFA count 1 and root access keys 0 are verified in the AWS console.
- The Cloudflare screenshot was a form preview, not a duplicate error. Saved the exact monitoring DMARC record after approval; zone has 14 records and authoritative DNS returns it with TTL 300. Future enforcement is still unapplied.
- Transactional SES production request submitted, Under review. Actual AWS quota still 200/24h at 1/s. Explicit quota-decrease Support case 179139569000996 submitted under Basic Support; no paid upgrade or Dedicated IP request.
- Auth dashboard has one existing MCP custom-access-token hook and no Send Email hook. Browser offers the multi-file function editor; only the CLI credential lacks function-list access. Supabase Free plan and project ref matching local deployment configuration were verified.

`supabase/email/preflight.sql` contains only SELECT operations returning aggregate account existence and configuration metadata, with no financial records, message bodies or secret values. It ran successfully against production.

## Concrete deployment scope for final approval

1. Apply the single additive email migration. Keep the queue disabled during setup; never reset production data.
2. After verifying current MFA and the exact existing IAM policies, create one access-key pair for each previously approved principal, spendist-email-sender and spendist-email-monitor. Install only in Supabase server secrets; no root keys or browser/public-build secrets. These keys retain the already reviewed sender/region/topic restrictions.
3. Create independent runner and signed Auth-hook secrets; store runner credentials in Supabase Edge secrets and Vault, and signing credentials in the matching Auth-hook/Edge configuration. Secret values must not appear in logs, source, public assets or this document.
4. Deploy auth-email, process-email, monitor-email and the revised send-allowance-invitation. Set region eu-north-1, expected AWS quota 100/24h, rate 1/s and application quota 100/24h. Preserve the existing recurring payment and currency functions.
5. Assign is_admin=true only to the exact confirmed existing account selected by the owner. Defaults and ordinary users remain false; application metadata cannot grant administrator status.
6. Configure worker every minute, SES monitor every five minutes and daily retention. Run a read-only SES monitor first and verify actual AWS quota, production access and SNS subscription.
7. Publish the reviewed web build with the private /admin route and notification opt-in settings. Coordinate Auth-hook enablement and queue activation so registration/recovery is not left waiting behind a disabled worker. Review live Auth request limits and redirect allowlist before cutover.
8. Send one deliberate SNS test alert and the approved functional delivery tests. Verify inbox receipt and authentication alignment, administrator access and ordinary-user denial. Production-data resets and live financial test records are excluded.

The approved production CI update adds the three new functions and stops overwriting email credentials from legacy GitHub AWS secrets. New sender/monitor credentials remain provisioned directly in Supabase; subsequent secret synchronization merges only the existing routine token and APP_URL. Pre-existing unrelated local edits must be preserved.

## Approved deployment execution

- The single additive migration was applied after its dry-run showed no other pending migration. The exact confirmed owner profile received is_admin=true through a trusted database session. The queue is disabled, region eu-north-1, application/expected AWS limits 100, rate 1/s.
- Created one key for each limited IAM user and stored both pairs only in Supabase Edge secrets. Independent runner and Auth signing secrets were generated without printing values. Runner and function URL were installed in Vault; no root keys or GitHub AWS credentials were added.
- Deployed all four approved functions through the authenticated dashboard because the existing CLI token lacks management privileges. Dashboard deployment uses single-file esbuild bundles of the checked source/shared modules, leaving pinned npm imports external. Invitation's existing Supabase alias resolves to the same pinned version. Future CI deploys the source modules normally.
- Worker and monitor verify their own runner token; Auth verifies its webhook signature; invitations authenticate through the caller's database RPC. Unsigned live worker/monitor requests returned 401 unauthorized; Auth returned 401 invalid_email_hook. Existing MCP Auth hook is preserved; the Send Email hook remains unconfigured.
- Installed worker each minute, monitor every five minutes and daily retention. Corrected pg_net named arguments to := before verification. The first successful AWS observation at 18:35 UTC reports usage 0, quota 200, rate 1, Healthy, sending enabled, production access false. A quota_mismatch incident was published once through the limited monitor key.
- SNS accepted one deliberate test message, ID b6487896-3a7d-5b25-b6ce-1bd6a9bd3e15. Subscription is confirmed; recipient inbox receipt is awaiting the owner's response.
- Secret-writer regression tests (3), ESLint and full Oxlint passed after the CI update. Frontend publication and its live panel checks are still in progress.

Activation remains conditional on AWS granting production access and enforcing the actual 100-recipient regional quota. Existing Supabase Auth mail is outside this queue until the signed hook cutover; do not describe the disabled application queue as an active Auth-wide limit.

## Remaining external dependencies

AWS production-access submission includes acceptance of AWS Service Terms/AUP and sending-consent/bounce-handling assertions. Its approval is separate from local preparation. The actual account quota decrease to 100 must be confirmed by AWS; an application limit or budget alert does not enforce this after key theft. Do not activate general-user sending while SES remains in sandbox.

No additional AWS hosting or paid Support plan is proposed. Existing approved estimates remain: SES about $0.30/month for 3,000 recipients plus applicable data costs; SNS normally within remaining free allowance at the proposed low alert volume; scheduled functions use existing Supabase capacity. Confirm actual Supabase plan/usage before activation. These estimates are not hard expenditure caps.
