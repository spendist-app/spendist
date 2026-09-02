# Public legal pages

## What they do

Spendist publishes the Polish hosted-service privacy policy at
`/polityka-prywatnosci` and terms at `/regulamin`. Both routes are public,
indexable, statically prerendered, and linked from the public landing-page
footer. The sign-up notice links directly to both documents.

The Markdown files under `docs/legal/` are the canonical content. Running
`npm run legal:generate` renders and sanitizes them into the generated Angular
module at `apps/web/src/app/pages/legal/legal-content.generated.ts`. The web
build runs `legal:check`, so a Markdown change without its generated output
fails before deployment.

The current documents visibly identify themselves as drafts. Publishing a page
does not by itself make a draft an effective legal document. Before removing
that label, the operator must resolve the remaining checklist in
`docs/legal/README.md`, set the effective date and version, and update the
sign-up notice to describe acceptance of the effective terms.

## SEO and routing

The legal routes set Polish document language, canonical URLs, descriptions,
Open Graph metadata, and `index,follow`. They are included in `sitemap.xml` and
explicitly allowed by `robots.txt`. Route ownership is in
`apps/web/src/app/app.routes.ts`; source-driven SEO output remains owned by the
existing blog generator because it generates the shared sitemap and robots
files.
