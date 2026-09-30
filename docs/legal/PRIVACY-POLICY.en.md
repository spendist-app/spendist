# Spendist privacy policy

**Version 1.1 — 2026-09-30**

This policy covers the hosted service at `https://spendist.app` and its MCP integration. It takes effect when this version is published on the service. [Polska wersja](/polityka-prywatnosci?lang=pl).

## 1. Controller and contact

The data controller is **Bartłomiej Borzucki**, an individual running Spendist as a free hobby project, postal address: **ul. Zakładowa 11u/5, 50-231 Wrocław, Poland**, email: **hello@spendist.app**. Contact this address about privacy, data rights or security incidents.

This policy does not cover independently hosted installations run by other people. Hosted accounts are for people aged 18 or over. The service is available internationally without a country restriction.

## 2. Data, purposes and legal bases

| Purpose | Data | GDPR legal basis |
| --- | --- | --- |
| Creating an account and providing the service | email, display name, username, account ID, language, timezone, currency, optional avatar; transactions, amounts, dates, descriptions, wallets, categories, groups, tags, places, recurring payments, module data and notifications | performance of a contract — Article 6(1)(b) |
| Recording registration | declaration of adulthood, document versions and time of acceptance/acknowledgement | performance of a contract and legitimate interest in recording its formation — Article 6(1)(b) and (f) |
| Authentication and security | session and authentication information, IP address, request time, browser and device details, technical logs, MCP authorization and audit metadata | performance of a contract and legitimate interest in securing and maintaining the service — Article 6(1)(b) and (f) |
| Support and complaints | sender address, correspondence and information necessary to handle the request | performance of a contract and legitimate interest in handling requests — Article 6(1)(b) and (f) |
| Public-content statistics after consent | page views, public page path, cookie identifiers and browser technical information | consent — Article 6(1)(a) |
| Legal obligations and claims | data necessary for the particular obligation or claim | Article 6(1)(c), or legitimate interest in establishing, pursuing or defending claims — Article 6(1)(f) |

Providing required registration data is voluntary, but necessary to create an account. Your display name need not be your real name. We do not collect a date of birth or identity document at signup. Supabase Auth handles passwords; we do not store them in plain text.

File imports run in the browser: we save the records you select, not the source file. Export lets you keep your own copy. We do not sell data, use financial entries for advertising or publish account contents. Automatic calculations and scheduled entries do not constitute profiling or decisions with legal effects within Article 22 GDPR.

## 3. Allowance and connected apps

**Allowance** connects two accounts after an invitation is accepted. We process the invited email address, participant IDs, connection status, linked entries and schedules. A connection allows matching expense and income entries. The payer can also review, edit and delete expenses they created on the recipient's account through this module. This does not provide access to other transactions, balances or wallets. Disconnecting preserves history, pauses future schedules and removes the payer's access to those expenses. Invitation tokens are stored as hashes, expire after seven days and can be used once. The module does not transfer money and also requires participants to be 18 or over.

**Connected apps and MCP** receive access only after you authorize them. Depending on the available tools, a client can read financial records, export data and make supported changes and deletions. The authorization screen describes access. You can revoke grants in **Settings → Connected apps**, preventing refresh of access; an already issued token may remain valid until expiry. Revocation does not remove copies already retrieved by the external app. Review its own privacy rules, including the AI provider's rules when using an AI client.

MCP mutation auditing records client ID, tool, object IDs, timestamps and outcome. It does not record tool arguments, amounts, transaction descriptions, tokens or export contents. The local prompt helper does not send data to AI itself; copying a prompt or data into an external service is your choice.

## 4. Providers and recipients

- **Supabase** provides authentication, the database, avatar storage and backend services. The primary project database is in **eu-west-2, London, United Kingdom**. This does not mean all provider operations happen exclusively in that region. [Supabase data processing terms](https://supabase.com/legal/customer-resources/data-processing-addendum).
- **Cloudflare** provides hosting, traffic delivery and security, and forwards incoming `@spendist.app` email to the controller's mailbox. [Cloudflare data processing terms](https://www.cloudflare.com/cloudflare-customer-dpa/).
- **Google / Gmail** handles incoming correspondence and outgoing messages through the controller's personal mailbox. This is currently not Google Workspace. Messages and metadata are also handled under [Google's privacy policy](https://policies.google.com/privacy?hl=en). Do not email passwords or complete financial exports unless necessary for your request.
- **Google Analytics** — public-content statistics after consent, described in section 7. [Google privacy policy](https://policies.google.com/privacy?hl=en) and [Analytics data information](https://support.google.com/analytics/answer/6004245?hl=en).
- **External clients you authorize and the other Allowance participant** receive data within the scope described in section 3.

Amazon SES is being prepared for transactional messages but is not yet configured. We will update provider information before activating it. Planned configuration is not described as an active service.

New accounts do not fetch automatic DiceBear avatars; older default DiceBear addresses are replaced in the interface with local initials. If you have an avatar at another external URL, retrieving the image may disclose your IP address and browser technical details to that server.

Currently only the controller has administrative access to the project. Data may be disclosed to competent authorities when legally required.

## 5. Processing outside the EEA

The United Kingdom is outside the European Economic Area. Providers with global infrastructure may also process data in other countries, including the United States. Transfer arrangements rely on applicable adequacy decisions or contractual safeguards, including standard contractual clauses, described in the relevant provider's terms. We do not guarantee that all data stays exclusively in the EU. Contact the controller for information about applicable safeguards.

## 6. Retention

- Account data and your own financial records remain for the lifetime of the account. Successfully completing self-service deletion in Settings deletes the account, avatar files and its associated production records. There is no recovery window. Some information forming the other Allowance participant's own records may remain on their account.
- You can also request deletion or exercise other rights by email. We respond without undue delay, normally within one month; if an extension is legally available, we explain the reason and deadline. This is not an automatic waiting period for self-service deletion.
- Infrastructure logs follow the provider's configuration and current plan. Diagnostic information retained for an outage or incident remains for the time needed to investigate and secure the matter. MCP auditing is associated with the account. We do not promise an unverified universal 90-day log retention period.
- We retain correspondence as needed to handle the matter; where necessary to document an obligation or claim, the applicable statutory and limitation periods govern retention. Unnecessary correspondence is deleted.
- The controller currently makes no independent database backups. The service uses Supabase Free, without a guarantee of an automatic backup available to the controller for restoration. The provider may keep internal technical copies under its own terms. Additional backups and their retention require an update to this information; we do not currently promise a 90-day backup cycle.

## 7. Browser storage and analytics

The app stores session information and language/theme preferences in browser storage. Session information supports authentication and security and is removed or replaced on sign-out or expiry. Preferences remain until you change or remove them. Clearing browser storage may sign you out or reset preferences.

**Google Analytics 4 runs only after voluntary consent**, for signed-out visitors to the home page, blog and legal documents. Before consent and after refusal we load no Google tag and send no analytics pings. We exclude the private panel, login, signup, password recovery, invitations and external-app authorization. Measurement stops on sign-in and when leaving a measured page.

Its purpose is to understand visits to public content. Google receives the public page address without query parameters or fragments, a page-view event and browser/device technical information, including the IP address needed for communication and cookie identifiers. We do not send account data, email addresses, finances, form contents or the previous page address. Tag configuration disables Google Signals and advertising personalization and denies advertising consent. We do not use these statistics for advertising.

Refusal is as accessible as acceptance and does not restrict Spendist. You can withdraw consent using **Analytics preferences** at the bottom of any page and **Reject / withdraw**. Withdrawal stops future measurement and removes this integration's cookies; it does not affect the lawfulness of earlier processing or automatically erase information Google already received. Contact the controller about erasure.

Your decision is stored locally under `spendist.analytics-consent` for **180 days**, including refusal. It is not linked to your account. After consent, the tag may set host-only cookies `_ga` and `_ga_WY8ZY07NGW` for up to **180 days**, without renewing them on each measurement. You can also delete them in your browser. Data received by Google follows retention configured in the GA4 property and Google's policies; cookie lifetime is not report retention. Contact the controller for current retention settings.


## 8. Rights and security

Subject to the GDPR's conditions, you can request access and a copy, correction, erasure, restriction, portability, object to processing based on legitimate interests, and withdraw consent where consent is the legal basis. You may complain to the **President of Poland's Personal Data Protection Office (UODO)**. Additional mandatory local rights remain unaffected.

Contact **hello@spendist.app**. Where there are reasonable doubts, we may ask for information needed to verify identity and avoid disclosing data to an unauthorized person.

We use HTTPS, authentication and access controls isolating users' data. A hobby project cannot guarantee freedom from outages or recovery of deleted data. Protect your password and mailbox and use export if you need your own copy.

## 9. Changes

We update the policy when features, providers or processing change. The version and release date appear above. Material changes are communicated in the app or by email. Acknowledging this policy at signup confirms receipt of information; it is not blanket consent to data processing.
