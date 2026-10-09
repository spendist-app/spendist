# Email and private administration

Status: backend, monitor and private panel deployed with application sending disabled. AWS production access and an actual quota of 100 recipients/24h remain pending. The signed Auth hook is implemented but not activated; existing Supabase Auth mail remains outside this queue until that cutover.

## User behavior

Authentication emails use `noreply@spendist.app`; Allowance invitations and optional notification emails use `hello@spendist.app`. Settings offers an opt-in email-notification toggle, disabled by default. While it is on, the user can turn email off for individual notification types; types not muted, including types added later, are emailed. The exchange-rate failure type is listed only for administrators, who are its only recipients. Allowance invitations are excluded because they already send a dedicated invitation email. Notification emails name the notification type in the subject and body (for example "Spendist: Allowance received") in the profile language, followed by a dashboard link. They never contain amounts, account or participant names, transaction descriptions or other notification payload values. The global switch and the muted types are checked both when the email is queued and again when the sender claims it. Existing in-app notifications remain available when an email is skipped.

The shared Postgres queue supports Supabase Auth through a signed Send Email Hook, server-created notifications through a database trigger, and Allowance invitations through an atomic invitation-and-queue RPC. The Auth path is awaiting the conditional production cutover. Supported Auth actions are signup, recovery, magic link, invite, secure email change and reauthentication. Secure email changes count both recipients and queue both messages atomically. Once activated, the hook overrides SMTP; configuring only SES SMTP would bypass this queue and is not the supported deployment.

There is a rolling 24-hour application limit of 100 reserved recipient attempts, including definitive throttled retries. Queue admission additionally allows at most 100 recipients per rolling day, of which notification and invitation email may use at most 60, so 40 remain reserved for Auth email. Auth and non-auth email each allow five per account per hour and ten per account per day, counted separately. All kinds share a limit of three per recipient per hour with a 60-second recipient cooldown. One batch must contain a single email kind. Admission can therefore stop before 100 messages are sent. Optional notification admission failures are skipped without rolling back financial operations; invitations roll back if they cannot be queued. Auth rejects admission with a temporary error. At capacity, registration confirmation, resend and password recovery are also delayed or unavailable. Password login with an already confirmed account continues to work.

A worker runs every minute and processes at most 20 messages, at one message per second. Authentication has priority. Auth queue entries expire after 15 minutes; optional notifications after 24 hours; invitations after seven days. Delivery links use the fixed Spendist origin rather than user-supplied redirects. AWS acceptance is recorded as sent; it is not proof of inbox delivery.

## Safety and storage

The private `spendist_email` schema is excluded from PostgREST. Browser roles cannot enqueue arbitrary emails, claim jobs, read recipient addresses or modify control settings. Admission and send reservation use the same transaction-scoped advisory lock. Each job has a unique deduplication key and lease token. AWS SDK send retries are disabled; only explicit SES throttling is retried, up to three attempts, each reserving budget. Network/server ambiguity is marked unknown, with no automatic resend. Interrupted sending jobs become unknown after two minutes.

Sending is disabled by default. It is also blocked when SES reading fails, its last successful observation is older than ten minutes, sending is disabled by AWS, or the observed quota plus reservations made after that observation is exhausted. Direct SMTP/API traffic outside the queue remains subject only to actual AWS quotas; concurrent external traffic can race the five-minute observation. A stolen sender key can bypass application limits, but cannot bypass the actual SES account/region quota or its IAM identity/sender restriction.

Message subjects and bodies are removed after a terminal outcome. Jobs (including recipient addresses and hashed deduplication keys) expire after seven days; resolved alerts after 30 days; attempt reservations after at least 25 hours. Account deletion removes owned queue entries while keeping anonymous budget reservations until retention expiry.

## Administration

The private `/admin` route is excluded from indexing. Only an authenticated user whose `public.profiles.is_admin` is true receives statistics. This existing column defaults to false; the migration adds insert-time protection as well as update protection. User metadata is never a source of authority. Assignment requires a trusted server/database operator, and is not exposed as a browser RPC.

The database checks administrator status on every `email_admin_status` call. The route guard is supplemental. The panel displays application reservations, SES accepted messages, actual regional SES usage/quota/rate, expected quota/rate, warning thresholds, observation times, stale/read-failure state, queue counts, and the last 50 alert events. No secrets, recipients or mail content are returned.

Administration uses client rendering so direct links and refreshes check the current browser session instead of following a prerendered login redirect. The production Worker serves the client shell for `/admin`, with no-store and noindex headers; every statistics request still requires database administrator authorization. The service worker excludes administrator navigation and /env.js, which is always served by the Worker from production runtime bindings. Production security headers reject local loopback connections.

## Monitoring and alerts

A separate monitor runs every five minutes and reads SES v2 GetAccount, including regional API and SMTP usage. It keeps the last successful snapshot on read failure and creates deduplicated incident records for 80%/95% application usage, application/AWS exhaustion, sending disabled, unhealthy SES status, quota/rate/region mismatch, failed observation, failed/unknown sends, and delayed queue entries.

A separate IAM credential publishes to one standard SNS topic, independently of SES quota. One monitor lease prevents concurrent scans. Active events are published once, with at most three publication attempts and ten-minute retry spacing. An uncertain SNS outcome can produce a duplicate alert; the attempt bound limits it. Resolved and later recurring incidents create new records. The panel shows publication attempts and SNS acceptance separately from incident state.

Monitoring is delayed, can fail with its runtime/database/network, and cannot alert when the monitor itself cannot run. SNS cannot deliver until its email subscription is confirmed. Cost alerts and these warning thresholds are not spending blocks.

## Deployment ownership

Migration: `supabase/migrations/202610071330_secure_email.sql`. Functions: `auth-email`, `process-email`, `monitor-email`, and the revised `send-allowance-invitation`. Approval checklist, IAM templates, costs and quota request: [email deployment](../../docs/email/DEPLOYMENT.md).
