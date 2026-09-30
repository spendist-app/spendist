# Spendist privacy policy

**Version 1.0 — 2026-09-30**

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

## 7. Browser storage and planned analytics

The app stores session information and language/theme preferences in browser storage. Session information supports authentication and security and is removed or replaced on sign-out or expiry. Preferences remain until you change or remove them. Clearing browser storage may sign you out or reset preferences.

**Google Analytics 4 is not currently enabled.** We do not set its `_ga` or `_ga_*` cookies or send analytics events. We plan analytics only on pages for signed-out visitors. Before activation, we will implement voluntary consent, block tags before consent, offer an equivalent refusal option and easy withdrawal, and update this policy with the actual collection scope and retention period. Analytics will not include financial data, form contents or authentication data. Refusing consent will not restrict the service.

## 8. Rights and security

Subject to the GDPR's conditions, you can request access and a copy, correction, erasure, restriction, portability, object to processing based on legitimate interests, and withdraw consent where consent is the legal basis. You may complain to the **President of Poland's Personal Data Protection Office (UODO)**. Additional mandatory local rights remain unaffected.

Contact **hello@spendist.app**. Where there are reasonable doubts, we may ask for information needed to verify identity and avoid disclosing data to an unauthorized person.

We use HTTPS, authentication and access controls isolating users' data. A hobby project cannot guarantee freedom from outages or recovery of deleted data. Protect your password and mailbox and use export if you need your own copy.

## 9. Changes

We update the policy when features, providers or processing change. The version and release date appear above. Material changes are communicated in the app or by email. Acknowledging this policy at signup confirms receipt of information; it is not blanket consent to data processing.
