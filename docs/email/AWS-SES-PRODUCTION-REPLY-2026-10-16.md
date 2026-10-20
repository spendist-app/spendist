# Reply sent to AWS SES production-access case

Case: [179139517600834](https://support.console.aws.amazon.com/support/home?region=eu-north-1#/case/?displayId=179139517600834&language=en). The owner accepted the minimum AWS quota of 200 recipients/rolling 24 hours and explicitly authorized sending this reply. It was submitted in AWS Support on **2026-10-16 at 23:01:49 Europe/Warsaw**. The posted text is visible in the case correspondence and the case status changed from `Pending customer action` to `Customer action completed`.

## Submitted reply

Hello AWS SES team,

Thank you for reviewing our production-access request for Europe (Stockholm), eu-north-1. Here are the requested details in one response:

- Website/application: https://spendist.app. Spendist is a personal-finance application.
- Email type: transactional account confirmation, password recovery and reauthentication, invitations explicitly initiated by a user, and optional system notifications enabled by the account holder. We do not send marketing campaigns, newsletters, or purchased-list mail.
- Expected volume: initially well below 100 recipients per rolling 24 hours; our application admission limit is 100 recipients per rolling 24 hours. Our expected AWS account quota is **200 recipients per rolling 24 hours at 1 recipient/second**, the lowest enforced quota your support team says is available. We are not requesting a higher quota. Please tell us before approving production access if that quota and rate cannot be retained.
- Recipient source: account messages go only to addresses supplied by users registering or recovering their own accounts. Invitations go to addresses entered by an authenticated user for that explicit invitation. Optional notifications go only to account holders who enable them in the application settings. We do not import third-party mailing lists.
- Bounce and complaint handling: SES account-level suppression is enabled for both bounces and complaints, so SES blocks sending to suppressed addresses. The application has a shared queue with bounded retries and duplicate suppression, and an independent monitor checks SES account status and quota. It is deployed but application sending remains disabled until production access and a coordinated Auth-hook cutover. We will review bounce/complaint feedback and investigate affected addresses before any further attempt.
- Sample email: Subject: "Confirm your Spendist email address". Body: "Hello, please confirm the email address for your Spendist account using this link: [one-time confirmation link]. If you did not create this account, you can ignore this message." The link is generated for the specific account and expires according to the authentication provider's configuration. No marketing content is included.

The domain `spendist.app` is verified in eu-north-1, with Easy DKIM and custom MAIL FROM `mail.spendist.app` configured. Our planned sender addresses are `noreply@spendist.app` and `hello@spendist.app`.

Please review this production-access request with the 200-recipient rolling 24-hour regional quota and 1-recipient/second rate. Please do not treat this message as a request for a quota increase, paid support, dedicated IPs, or other paid add-ons. Let us know if any further information is needed.

Best regards,
Spendist

## Follow-up before SES cutover

Wait for AWS's production-access decision, then re-read the actual SES account quota, rate and sandbox status in eu-north-1. The owner has accepted the 200-recipient floor, but AWS's 2026-10-15 and 2026-10-16 replies differ on whether proactive increases can happen: the newer message says they might occur for accounts sending near quota, but also says future increases require a separate deliberate request. Do not represent the quota as an immutable cost cap. The application monitor currently expects 100, so its configured expected AWS quota and cutover checks must be reviewed for 200 before enabling the queue and signed Auth email hook. Leave existing Supabase Auth mail working until that coordinated cutover is verified.
