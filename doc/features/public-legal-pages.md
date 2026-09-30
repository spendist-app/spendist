# Public legal pages

## What they do

Spendist serves hosted-service privacy information at `/polityka-prywatnosci` and terms at `/regulamin`. Both are public, indexable, statically prerendered and linked from the landing footer, signup, Settings and the existing-account notice. Polish is the default; `?lang=en` selects the full English document on the same route. A language link switches the rendered document without changing its route. Both versions retain the canonical base URL.

The version 1.0 documents describe a free hobby project operated by an individual, adult accounts (18+) without a country restriction, the Supabase Free primary database in London, Cloudflare hosting/mail forwarding, and personal Gmail correspondence. They distinguish planned GA4/SES from configured services. There is currently no GA tag, analytical cookie or analytics-consent banner. The controller currently makes no independent database backups. Retention uses actual account deletion and purpose/provider-based criteria rather than unverified universal 30/90-day promises.

The policies also describe Allowance sharing, client-authorized OAuth/MCP access and revocation limits, and the external client's responsibility for copies it already received. No claim is made that a hobby status removes mandatory user rights or that publication proves compliance with every local law. The operator authorized preparation without a paid legal review; operational supplier-account checks and future activation steps remain explicit in `docs/legal/README.md`.

## Source and acceptance

The four Markdown files under `docs/legal/` are canonical. `npm run legal:generate` renders and sanitizes both languages into `apps/web/src/app/pages/legal/legal-content.generated.ts` and exposes a small `LEGAL_VERSION` constant for acceptance. The generator rejects missing or mismatched versions. The build runs `legal:check` and rejects stale HTML.

Signup requires an unchecked adulthood checkbox and an unchecked terms-acceptance/privacy-acknowledgement checkbox. Privacy acknowledgement is not blanket consent. Auth metadata records the current terms/privacy version, a client timestamp and the adulthood declaration. This is user-editable declaration data, not age verification, immutable evidence or authorization. No date of birth or ID document is collected.

Signed-in accounts without current confirmation see a notice with the same declarations. Saving confirmation uses the existing Auth update API and hides the notice only after a successful update. Access to records and export is not blocked. Prior acceptance is not backfilled or invented. Changing the shared version resurfaces the notice. Updated documents take effect on publication in the service; a develop push alone is not publication.

## SEO and routing

The routes set document language, canonical URLs, descriptions, Open Graph metadata and `index,follow`. They remain included in `sitemap.xml` and allowed by `robots.txt`. There are no new base routes. Route ownership is in `apps/web/src/app/app.routes.ts`; the existing blog generator owns shared SEO output.

## Planned analytics

GA4 activation is a separate step after the operator creates a property/stream. It requires a consent interface, strict blocking before consent and after refusal, easy withdrawal, a reviewed signed-out page allowlist, sanitized URLs, runtime/SPA/CSP verification, provider settings and a policy version update. This change does not enable analytics or accept supplier agreements on the operator's behalf.
