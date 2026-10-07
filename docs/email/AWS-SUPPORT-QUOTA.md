# AWS SES quota decrease request — submitted, not applied

Submitted on 2026-10-07 under Basic Support, case 179139569000996. Correspondence verified in the AWS console. Case type Account and billing, Service Quotas / General; the service-limit-increase form offered only Dedicated IP, which was not requested. The separate SES Transactional production-access request was submitted and is Under review. Neither submission proves production access approval or a changed enforced quota; actual observed quota is still 200/24h at 1/s.

## Exact submitted description

Please decrease the actual Amazon SES account sending quota in Europe (Stockholm), eu-north-1, to 100 recipients per rolling 24 hours, with a maximum sending rate of 1 recipient per second. This is a quota decrease, not an increase.

The account is currently in the SES sandbox with a quota of 200 recipients per 24 hours and rate of 1/second. Domain spendist.app is verified; Easy DKIM and custom MAIL FROM mail.spendist.app are successful. The transactional production-access request was submitted separately today and is currently Under review. Please advise how to set and preserve the requested lower quota when production access is approved, and whether automatic quota increases can be prevented.

Spendist will send transactional account confirmations, password recovery, user-requested invitations and opt-in system notifications from noreply@spendist.app and hello@spendist.app. No marketing or purchased lists. Account-level bounce and complaint suppression is already enabled. A shared queue including Auth, atomic application recipient limits, bounded retries and an independent SNS quota/status monitor have been implemented and tested locally, but are not yet deployed or activated. No application sending credentials have been created in this account.

Please confirm whether the enforced quota counts recipients across both SES API and SMTP in this account and region. The application-side limit and spending alerts alone are not a hard protection after credential theft. Website: https://spendist.app.
