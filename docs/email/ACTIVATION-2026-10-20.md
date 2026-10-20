# Production email activation — 2026-10-20

Owner authorization: activate sending now under the temporary 50,000/24h AWS production quota; request AWS reduction to 200/24h. Shared application cap remains 100 recipients per rolling day. No new paid resources or permissions.

## Applied and verified

- Read-only dashboard query: no queued jobs, monitor fresh and healthy, AWS production true, quota 50,000, rate 14; worker every minute, monitor every five minutes, retention daily.
- Trusted guarded control update: enabled true, app_limit 100, expected_aws_limit 200, expected_rate 1. The update required the correct region, a healthy production snapshot, sending enabled, and a successful observation less than ten minutes old.
- Synchronized only SEND_EMAIL_HOOK_SECRET in Edge secrets and the matching HTTPS Auth hook, with no secret output or local persistence; digest equality verified. Hook endpoint: https://lwbugkjngtybkxdqmeqd.supabase.co/functions/v1/auth-email. Existing MCP hook preserved.
- Verified active Send Email hook after reload. The new Auth path replaces built-in sending and shares queue admission and attempt limits with invitations and optional notifications.
- Sent one owner recovery test from Supabase Users. It queued successfully, then the scheduled worker recorded sent, one attempt, no error and a non-null SES message ID. The aggregate attempt count became 1. No recovery link was opened and no password was changed.
- Submitted and verified the quota-decrease reply at 22:22:52 Europe/Warsaw in case 179139569000996. AWS has not yet applied the decrease.

## Evidence and limitations

Screenshots are stored locally under the task visualizations directory: spendist-quota-200-request-20261020.png, spendist-auth-hook-enabled-20261020.png, spendist-email-sent-20261020.png. They contain configuration or aggregate results, not secret values or message bodies.

A server-side SES success records acceptance, not inbox delivery. The owner confirmed receipt of the recovery email on 2026-10-20. Signup, secure email change, invitation and optional-notification inbox delivery were not each exercised on production in this cutover. Existing isolated security/concurrency/retry checks are documented in DEPLOYMENT.md; no production load test, reset or destructive operation was performed.

Until AWS lowers the quota, stolen sender credentials can bypass the application cap up to the actual AWS limits. The target 200/1 remains monitored as a mismatch. AWS credit, alerts and SNS deduplication are not hard expenditure caps.

## Operational rollback

A trusted operator can set spendist_email.control.enabled=false to stop worker claims. Leaving the Auth hook enabled during a prolonged queue pause prevents immediate delivery and jobs expire after 15 minutes, so coordinate the pause and investigate first. Removing the hook restores the old provider path outside the shared queue and requires a deliberate decision; do not silently bypass the cap.

## Notification verification later on 2026-10-20

The owner requested notification delivery through SES and authorized one explicitly labelled test. A production read verified that the notifications table has an enabled email_notification_enqueue trigger with confirmed-recipient, global opt-in and per-type mute checks matching the deployed definition. The exact confirmed owner's global preference was false and muted types were empty. Enabled email_notifications for that owner only; other users and per-type settings were preserved.

Admitted one explicitly labelled notification-kind test through the real email_enqueue admission path with a unique deduplication key. It used the scheduled SES worker and was accepted in one attempt: kind=notification, status=sent, attempts=1, error_code=null, message_id present. The sender policy selects hello@spendist.app for notification jobs. No financial operation or synthetic application notification was created. This verifies notification queue/worker/SES delivery separately from the earlier Auth test; trigger wiring was inspected rather than creating a fake financial event. The owner confirmed inbox receipt of this notification on 2026-10-20. Evidence: spendist-notification-ses-sent-20261020.png in the task visualizations directory.
