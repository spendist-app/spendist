# AWS SES quota decrease request — submitted, not applied

## Current action — 2026-10-20

Production access has been granted in separate case 179139517600834, with an actual console/monitor quota of **50,000 recipients/rolling 24h and 14/s**. The owner approved temporary sending under that AWS exposure while retaining the application cap of 100/24h.

At 22:22:52 Europe/Warsaw, a reply was submitted and verified in this quota-decrease case, explicitly accepting the supported **200 recipients/rolling 24h and 1/s** floor and asking AWS to apply those lower enforced values without removing production access. It references the production case and requests confirmation after the change. No paid Support, Dedicated IPs or add-ons were requested. The reply also asks AWS to clarify the conflicting automatic-increase statements. This is a submitted decrease request, not evidence of a changed quota.

## Live AWS response — 2026-10-16

Case [179139569000996](https://support.console.aws.amazon.com/support/home?region=eu-north-1#/case/?displayId=179139569000996&language=en) is `Pending customer action`. AWS replied on 2026-10-15 that it cannot reduce the enforced SES quota below the sandbox default of **200 recipients per rolling 24 hours at 1 recipient/second**. In a follow-up on 2026-10-16, AWS confirmed that production access can retain those values; no lower floor is available. The same follow-up says proactive quota increases may occur for sustained near-quota production sending, while also saying future increases require a separate deliberate request. Treat that point as ambiguous and do not rely on the AWS quota being immutable. The actual SES account remains in sandbox at 200/24h and 1/s.

The separate production-access case [179139517600834](https://support.console.aws.amazon.com/support/home?region=eu-north-1#/case/?displayId=179139517600834&language=en) required the website, mail type, volume, recipient source, bounce/complaint handling and sample email. The owner accepted the 200/24h floor and authorized the [complete response](AWS-SES-PRODUCTION-REPLY-2026-10-16.md), submitted on 2026-10-16 at 23:01:49 Europe/Warsaw. The case now shows `Customer action completed`, awaiting AWS review. Production access is not yet granted; the original enforced-100 activation condition must be revised and verified for 200 before cutover.

Submitted on 2026-10-07 under Basic Support, case 179139569000996. Correspondence verified in the AWS console. Case type Account and billing, Service Quotas / General; the service-limit-increase form offered only Dedicated IP, which was not requested. The separate SES Transactional production-access request was initially Under review and then `Pending customer action`; after the owner's 2026-10-16 reply it is `Customer action completed`. Neither submission proves production access approval or a changed enforced quota; actual observed quota is still 200/24h at 1/s.

## Exact submitted description

Please decrease the actual Amazon SES account sending quota in Europe (Stockholm), eu-north-1, to 100 recipients per rolling 24 hours, with a maximum sending rate of 1 recipient per second. This is a quota decrease, not an increase.

The account is currently in the SES sandbox with a quota of 200 recipients per 24 hours and rate of 1/second. Domain spendist.app is verified; Easy DKIM and custom MAIL FROM mail.spendist.app are successful. The transactional production-access request was submitted separately today and is currently Under review. Please advise how to set and preserve the requested lower quota when production access is approved, and whether automatic quota increases can be prevented.

Spendist will send transactional account confirmations, password recovery, user-requested invitations and opt-in system notifications from noreply@spendist.app and hello@spendist.app. No marketing or purchased lists. Account-level bounce and complaint suppression is already enabled. A shared queue including Auth, atomic application recipient limits, bounded retries and an independent SNS quota/status monitor have been implemented and tested locally, but are not yet deployed or activated. No application sending credentials have been created in this account.

Please confirm whether the enforced quota counts recipients across both SES API and SMTP in this account and region. The application-side limit and spending alerts alone are not a hard protection after credential theft. Website: https://spendist.app.
