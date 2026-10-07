# Spendist email deployment approval package

Prepared 2026-10-07. **Application code is not deployed or activated. Approved AWS resources and five SES DNS records are configured; sending is not activated. SNS sent its subscription confirmation email; no application mail or test alert has been sent.**

## Confirmed inputs and remaining checks

- Domain and senders: spendist.app, hello@spendist.app, noreply@spendist.app (provided).
- Independent alert email address: admin@spendist.app (provided 2026-10-07).
- Spendist administrator: the owner supplied an existing application account, verified by a read-only Auth/profile lookup with confirmed email and current is_admin=false. Its private address/UUID are not stored in this public documentation. admin@spendist.app is the alert address and has no application account. Administrator assignment remains unapplied.
- AWS account: 170638969015; region eu-north-1 (Stockholm), approved 2026-10-07.
- Initial limit: 100 recipients per rolling 24 hours, including Auth, approved 2026-10-07. Peak planning assumption: up to 100 recipients/day; actual expected average remains unknown.
- Windows Chrome AWS audit and the SES/SNS/two limited IAM user setup were authorized and performed 2026-10-07 using the amazon tab group. Cloudflare read and five additive SES DNS records were separately approved and performed. Credentials, DMARC changes, Support submission, production deployment and activation still require approval.

## Concrete resources and permissions

1. One SES domain identity for spendist.app in the approved region; Easy DKIM; account-level suppression for BOUNCE and COMPLAINT. Keep shared sending IPs and a la carte pricing. No dedicated IP, Mail Manager, VDM or deliverability subscription is needed.
2. One standard SNS topic named spendist-email-alerts, with one email subscription to the supplied alert address. The subscription confirmation is required.
3. Two dedicated IAM principals: sender with only the SES SendEmail policy; monitor with only SES GetAccount and SNS Publish to that topic. Templates live in `supabase/email/`; replace placeholders only after confirming account and region. No IAM write, SendRawEmail/SMTP, bulk sending, root key or broad SES/SNS managed policy. Review all existing attached policies, inline policies, trust and permission boundaries.
4. Three new Supabase Edge Functions, one updated invitation function, private Postgres tables/RPCs and three pg_cron jobs (worker every minute, monitor every five minutes, daily retention). Use existing Supabase compute; do not add Lambda, SQS, EventBridge or a CloudWatch dashboard for this small volume.
5. Supabase Auth Send Email Hook, its signing secret, low server-side Auth request limits, exact redirect allowlist. Keep SMTP unused for Auth once the hook is enabled. Audit invitation/Admin Auth APIs too; other projects/regions are outside this application limit.
6. Additive production migration, reviewed administrator assignment, private /admin UI and opt-in notification preference.

Hosted Supabase Edge Functions do not provide an AWS instance role in this implementation. Prefer a verified short-lived credential integration if the chosen hosting supports one. Otherwise use two separate limited IAM access-key pairs in Supabase server-side secrets; optional session tokens are supported. Rotating temporary credentials requires an external trusted refresh mechanism; merely supplying a session token does not create federation. Do not grant sts:AssumeRole or create static root credentials as a workaround.

Sender secret names: EMAIL_SENDER_AWS_ACCESS_KEY_ID, EMAIL_SENDER_AWS_SECRET_ACCESS_KEY, optional EMAIL_SENDER_AWS_SESSION_TOKEN.
Monitor names: EMAIL_MONITOR_AWS_ACCESS_KEY_ID, EMAIL_MONITOR_AWS_SECRET_ACCESS_KEY, optional EMAIL_MONITOR_AWS_SESSION_TOKEN.
Shared server names: EMAIL_AWS_REGION, EMAIL_ALERT_TOPIC_ARN, EMAIL_RUNNER_SECRET, APP_URL=https://spendist.app, SEND_EMAIL_HOOK_SECRET.
Supabase automatically supplies SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
Vault scheduler names: email_functions_url (the exact project HTTPS /functions/v1 URL), email_runner_secret (matching EMAIL_RUNNER_SECRET). Do not print or commit values.

## Read-only AWS and DNS audit before approval

Check account identity, free/paid billing plan, credit expiration, current SES pricing plan, root and administrator MFA, root access-key absence, existing access keys and their last use, IAM policies/trust, regions already in use, SES identity/sandbox/suppression/quotas/status and SNS topics/subscriptions. Record findings without secret values. Do not convert the billing plan, rotate existing keys, alter policies or submit a support case before approval.

Read authoritative existing DNS records first. Add only the SES-generated DKIM CNAME records. Prefer a custom MAIL FROM subdomain, e.g. mail.spendist.app, with SES-provided regional MX and one SPF TXT record. Preserve existing root MX and SPF for incoming email/other providers; never add a second SPF record at the same name. Inspect existing DMARC policy and alignment; stage a compatible policy rather than blindly replacing it. SES domain verification does not create an incoming hello mailbox. Confirm that hello is monitored if replies are expected.

In sandbox, SES normally permits 200 recipients/24h at 1/s and requires verified recipients. Production access and a **decrease** to 100 recipients/rolling 24h must be requested explicitly. AWS can automatically raise quotas; the mismatch alert detects changes, not prevents them. Confirm the actual quota in GetAccount after Support acts.

## Cost estimate to approve

Assumptions: 30 days, up to 100 recipients/day, small plain-text messages, one SNS email subscriber, 30 alerts/month, no optional paid SES features. USD, before taxes and any account-specific credits.

| Service                        | Estimate                                                                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SES a la carte                 | 3,000 recipients × $0.10/1,000 = $0.30/month, plus small message-data/transfer charges where applicable                                                                                       |
| SNS standard                   | About $0.000615/month for 30 request/delivery pairs before free allowances; normally $0 within the first 1M requests and 1,000 email deliveries, assuming the account has allowance remaining |
| Supabase monitor               | 8,640 invocations/month                                                                                                                                                                       |
| Supabase worker                | 43,200 invocations/month, plus admitted Auth/invitation requests                                                                                                                              |
| Supabase extra invocation cost | $0 while existing included allowance remains; the two scheduled jobs consume 51,840 invocations, roughly $0.104 if entirely billed at $2/million on a plan permitting overage                 |
| Additional AWS monitor hosting | $0: proposed monitor stays in existing Supabase runtime                                                                                                                                       |

Free Supabase includes 500,000 invocations; Pro/Team include 2M. Existing usage and plan are unverified. Unauthorized requests still consume hosting invocations even when no email is sent. Keep the provider spend cap enabled where supported, and use edge/WAF controls where practical. Database runtime/storage and shared account usage can add cost. These estimates and budgets are not hard expenditure caps. A stolen SNS-publish key bypasses database alert retry/deduplication controls; its topic restriction prevents choosing arbitrary subscribers, but does not impose a billing cap.

Sources checked 2026-10-07:

- [SES pricing](https://aws.amazon.com/ses/pricing/)
- [SNS pricing FAQ](https://aws.amazon.com/sns/faqs/)
- [Supabase function pricing](https://supabase.com/docs/guides/functions/pricing)
- [SES quotas](https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html)
- [SES quota decrease](https://repost.aws/knowledge-center/ses-increase-decrease-quota)
- [SES IAM](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html)
- [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)

## AWS Support draft (do not submit until approved)

Background combined draft below. The actual prepared console workflow uses a separate SES Transactional production-access form and the exact quota-decrease description in AWS-SUPPORT-QUOTA.md. Neither has been submitted.

Subject: Spendist SES production access and decrease to 100 recipients per rolling 24 hours

Please enable transactional production sending for spendist.app in eu-north-1, and set the actual account/region sending quota to 100 recipients per rolling 24-hour window and maximum sending rate to 1 recipient per second. This request is for a lower quota, not an increase. Please confirm whether the decrease can be maintained without automatic increases.

Spendist is an open-source personal-finance application. We will send account confirmations, password recovery and reauthentication, user-initiated Allowance invitations, and opt-in system notifications. We do not send marketing campaigns or purchased-list mail. Allowed From addresses are noreply@spendist.app and hello@spendist.app.

We have implemented and tested, but have not yet deployed or activated, a shared database queue covering authentication as well as notifications, per-account and per-recipient admission limits, transaction-safe daily reservations, single-recipient sends, capped retries, suppression of duplicate requests, and no automatic retry when delivery outcome is uncertain. These controls will be activated before production sending. SES account-level BOUNCE/COMPLAINT suppression is already enabled. The prepared application lets users disable optional notifications in Settings.

Our prepared independent SNS monitor will check regional SES usage, quota and account state every five minutes, with deduplicated alerts at 80% and 95%. Its topic is configured and recipient subscription is confirmed; the monitor is not yet deployed. Please confirm that the requested actual quota covers both SES API and SMTP usage and advise if any additional account-level restriction is needed.

Expected volume: up to 100 recipients per rolling 24-hour window. Website: https://spendist.app. Privacy information: https://spendist.app/polityka-prywatnosci.

## Activation sequence after explicit approval

1. Resolve inputs and finish account/DNS/secret audit. Approve concrete IAM principals/resources, any billing-plan change, DNS records and this cost estimate.
2. Create/verify identity, DKIM and compatible MAIL FROM/SPF/DMARC. Confirm sender reply handling. Configure suppression. Obtain production access/quota reduction, then re-read actual quota.
3. Create standard SNS topic/subscription. Have the recipient confirm it. Configure separate IAM principals and server secrets securely.
4. Compare remote migration history before push. Apply additive migration; it leaves control.enabled=false. Assign is_admin=true to exactly the verified existing profile through a trusted database session; do not derive it from browser metadata.
5. Deploy functions. Set control.region to the approved region and expected limits to the approved values. Run a read-only monitor once. Verify SNS receives a deliberate test alert, separately authorized as external email.
6. Run `supabase/email/schedule.sql` through a trusted session, confirm cron jobs and Vault secret names, then verify successful observations.
7. Enable the signed Send Email Auth Hook, publish the compatible Angular build and revised invitation function, then enable the queue. Coordinate this short cutover: enabling the hook while the queue is disabled accepts queued Auth requests without immediate delivery.
8. Verify regular-user denial, admin statistics, a real registration/recovery message, invitation delivery, notification opt-in and suppression. Confirm SES acceptance, inbox reception, SNS confirmation, monitor schedule and no duplicate incidents.
9. Record prepared/deployed/observed status separately. Rollback by disabling the queue and schedules; changing/removing the Auth Hook requires a reviewed mail fallback and would bypass the queue if SMTP is re-enabled.

## Local verification

`supabase/tests/email.sql` and `email-concurrency.py` refuse any database name other than spendist_email_test in the local Supabase Docker container. They cover authorization, metadata/field escalation, admission, reservations, duplicates, bounded retries, unknown outcomes and alert transitions. They do not send live mail.

Use Node 24 for repository checks. Run web:lint, lint:oxlint, web:test, web:build and git diff --check; type-check functions with Deno. Browser E2E and live AWS verification require the user's explicit browser-control consent. No production reset is part of this procedure.

## Production CI approval boundary

Automatic approval review initially rejected a production-workflow edit before deployment approval. The owner subsequently explicitly approved the final functions, credentials, schedules, publication and CI update. The applied CI update deploys the three new functions and preserves the separately provisioned email credentials in Supabase, syncing only the existing routine token and APP_URL. Existing legacy Supabase/GitHub AWS secrets and their IAM keys still require separate review before removal/rotation. Auth-hook activation remains conditional on AWS production access and actual quota 100/24h.

## Latest deployment evidence

The owner approved final deployment and credentials. The additive migration, exact owner administrator assignment, two limited AWS key pairs in Supabase only, Edge secrets, Vault names, four functions and three schedules are deployed. No financial records were created or reset. Dashboard bundling and live 401 checks are documented in FINAL-CONFIGURATION.md.

The monitor successfully read AWS at 2026-10-07 18:35 UTC: 0 recipients, actual quota 200/24h, rate 1/s, Healthy, production access false. Its quota_mismatch alert was published once. SNS also accepted the single deliberate test message b6487896-3a7d-5b25-b6ce-1bd6a9bd3e15; inbox receipt still needs confirmation. The application queue is disabled and the signed Send Email hook is not activated. Existing Auth mail remains outside this queue pending the conditional cutover. Frontend publication is in progress.

## Verified local evidence (2026-10-07)

Passed: 210 Angular tests including admin guard cases; five email policy tests; database security/limits/retries/thresholds/account-deletion tests; concurrent last-slot reservation and account admission; ESLint; full Oxlint; Deno type-check; E2E TypeScript compilation; production build; three secret-scanner tests; 406-file public output scan. Unsigned local worker/monitor/Auth hook calls returned 401.

207 locally available Git commits and tracked code were scanned for recognized private local values and AWS access-key markers. No recognized real private value was found; the only AWS-key pattern location was a synthetic CI fixture. Remote CI logs and arbitrary unknown historical secrets remain outside that evidence. The separate AWS audit below records the live IAM/SES/SNS/billing and public DNS observations. Browser E2E and live SES/SNS delivery remain unverified.

## AWS audit and next approval (2026-10-07)

Initial read-only audit through the authenticated Windows Chrome AWS console in account 170638969015, before the separately approved changes below. The browser connector successfully recognized the amazon tab group after the earlier Windows capture connector failed to determine the URL.

- Session is root. Root MFA devices: 0. Root access keys: 0. IAM users: 0. Only AWSServiceRoleForSupport and AWSServiceRoleForTrustedAdvisor roles exist.
- SES eu-north-1: sandbox, Healthy, quota 200 recipients/24h, rate 1/s, usage 0. Identities: 0. The actual AWS quota is not yet the requested 100.
- Initial SES plan: Essentials. Official price is $0.16/1,000 recipients, with no fixed Essentials monthly fee. At 3,000 recipients/month this is $0.48 plus applicable data charges. The approved switch to a la carte described below makes the $0.30 estimate applicable, plus any data charges.
- SNS eu-north-1: 0 topics and 0 subscriptions. Prepared but NOT submitted: standard spendist-email-alerts topic, maximum message size 4 KiB, owner-only default access, optional paid tracing/logging/encryption features not enabled.
- Billing console: no budget and no anomaly monitor; no active credits ($0 remaining). Cost data unavailable/preparing (AWS says up to 24h). A free-versus-paid account plan and support tier have not been established from these pages; no plan was upgraded.
- Public DNS: NS diva.ns.cloudflare.com/plato.ns.cloudflare.com; MX route1/2/3.mx.cloudflare.net; one root SPF v=spf1 include:\_spf.mx.cloudflare.net ~all. No DMARC TXT answer found. Preserve root MX/SPF and Cloudflare Email Routing. DKIM CNAME values will only exist after SES identity creation; do not invent them. Verify authoritative Cloudflare records before any DNS mutation.

Concrete IAM policy drafts are sender-policy.spendist.json and monitor-policy.spendist.json in supabase/email. Both restrict requested region to eu-north-1 and require TLS. The sender permits only SES SendEmail using the spendist.app identity and From noreply@spendist.app or hello@spendist.app. The monitor permits only SES GetAccount and SNS Publish to arn:aws:sns:eu-north-1:170638969015:spendist-email-alerts. Neither principal can create subscribers, change limits, manage IAM or access arbitrary topics. Proposed IAM users: spendist-email-sender and spendist-email-monitor, no console login. Key creation and secure server-secret installation are a separate action-time approval step.

Approved AWS setup scope completed: SES spendist.app identity with 2048-bit Easy DKIM; custom MAIL FROM mail.spendist.app; BOUNCE/COMPLAINT suppression verified already enabled; standard SNS topic and admin@spendist.app email subscription; two limited IAM users/policies without access keys; SES a la carte with separately billed VDM disabled. Five additive SES DNS records were separately approved and published. This leaves Spendist production code, Auth Hook and queue inactive. Production access/Support submission, DMARC writes, credential creation and deployment require their own reviewed final actions. A stolen SES key bypasses the application queue: only the actual regional AWS quota then limits ordinary-recipient sends. SNS topic scoping and database deduplication are not a hard spending cap after credential theft.

Root MFA enrollment requires the account owner to register their own authenticator/passkey. The agent must not take possession of an MFA seed or enter a new authentication credential. Complete MFA before production credentials or enabling live sending.

## Configured and observed after approval (2026-10-07)

- SES identity ARN: arn:aws:ses:eu-north-1:170638969015:identity/spendist.app. Easy DKIM RSA_2048_BIT signatures enabled; custom MAIL FROM mail.spendist.app with Reject message on MX failure. Latest AWS console read confirmed identity Verified, DKIM Successful and MAIL FROM Successful. The production-access form is now available, prepared as Transactional with website https://spendist.app; terms remain unchecked and the request is not submitted.
- SES pricing plan changed successfully to a la carte, effective immediately. SES deliverability, engagement tracking, optimized shared delivery and global deliverability are disabled. Account suppression is enabled for bounces and complaints.
- SNS Standard topic ARN: arn:aws:sns:eu-north-1:170638969015:spendist-email-alerts, 4 KiB maximum message, owner-only default policy. No optional tracing, logging or KMS configuration was enabled.
- SNS email subscription ARN: arn:aws:sns:eu-north-1:170638969015:spendist-email-alerts:40281a74-fb95-4c86-a796-e4e51947e98a. Endpoint admin@spendist.app; latest observed status Confirmed. No test alert was published; actual receipt of a deliberate alert remains unverified.
- IAM users spendist-email-sender and spendist-email-monitor created with only SpendistEmailSenderLimited and SpendistEmailMonitorLimited respectively. Creation review showed exactly one policy per user and no console password; the final list showed both users, disabled console access and no access keys. No keys or credentials were generated.
- Cloudflare authoritative zone read: eight initial records (two proxied A records, three root Email Routing MX records, Cloudflare DKIM TXT, Google verification TXT and one root SPF). No existing DMARC. User clarified that ordinary Gmail Send mail as with a Google app password is only planned and has not been configured. Do not treat Gmail as an existing custom-domain sender or add Google DNS records on this basis. No Gmail settings or messages have been read. Any future manual sender must authenticate spendist.app and pass DMARC before use.
- Five approved records in DNS.md added successfully. Cloudflare now shows 13 records; all three SES DKIM CNAMEs are DNS only, mail MX has priority 10 and mail TXT contains the approved SPF. Authoritative queries to diva.ns.cloudflare.com returned all five exact values with TTL 300. Existing root MX/SPF and Cloudflare DKIM preserved.
- Cloudflare Email Routing is enabled, with an active catch-all and one verified destination; admin@spendist.app and hello@spendist.app are covered. Private destination address is intentionally omitted; actual inbox reception is not tested.
- AWS Support console confirms Basic Support and no existing cases. The quota-decrease description in AWS-SUPPORT-QUOTA.md is prepared in its Issue description form but Send message has not been clicked. Production access is a separate SES form; neither request has been submitted and no Support upgrade is proposed.
- Prepared Cloudflare DMARC TXT is monitoring-only p=none with aggregate reports to admin@spendist.app. It has not been saved. Future p=reject requires a reviewed production sender audit, real alignment verification and separate approval; monitoring alone does not block spoofing.
- Root Security credentials page still showed zero MFA devices and zero root access keys at the last read. MFA page handed to owner for enrollment; not completed or verified by the agent.
- Still not submitted/applied: SES production access and actual quota decrease to 100/24h, DMARC, server credentials, remote migration, administrator assignment, functions, schedules, Auth Hook, public build and queue activation. Actual SES quota remains the last observed 200/24h at 1/s in sandbox until re-read after AWS changes it.

## Latest completed AWS actions (2026-10-07)

This section supersedes earlier prepared/pending observations above.

- Root MFA device count 1 verified in the AWS console; root access keys remain 0.
- Monitoring DMARC saved and authoritatively verified; exact record in DNS.md. Zone now has 14 records.
- Transactional SES production-access request for https://spendist.app submitted after explicit approval of AWS Service Terms/AUP and the consent/bounce-handling acknowledgement. Success notification observed; status Under review. SES remains in sandbox with actual quota 200/24h and 1/s.
- Formal quota-decrease Support case submitted and correspondence verified: case 179139569000996, subject SES quota decrease to 100 recipients/24h in eu-north-1. Basic Support retained. The increase form offered only Dedicated IP, so no IP request was made; the explicit decrease was filed under Account and billing / Service Quotas / General.
- Case URL: https://support.console.aws.amazon.com/support/home#/case/?displayId=179139569000996&language=en. Submitted description updates the earlier draft to state production access is Under review. No assertion that the decrease has already been applied.
- Browser access confirms Spendist Supabase project lwbugkjngtybkxdqmeqd, Free plan, existing three functions and one enabled MCP custom-access-token hook. No Send Email hook configured. Local project ref, public URL and remote database connection all match this project. CLI function-list credential still returns 403, but the authenticated dashboard offers the function editor.
- Live Auth sign-up/sign-in rate is 30 requests/5 min/IP, verification rate 30/5 min/IP and token-refresh rate 150/5 min/IP. No Auth settings changed during this read.
- Verified owner account selected for private administration; no administrator flag changed. Requested separate final approval for limited sender/monitor keys, server secrets, migration, functions/schedules, private panel, CI update and a deliberate SNS test. Auth sending activation is gated on production access and an actual AWS quota of 100/24h. No new credentials, production migration or app deployment performed yet.
