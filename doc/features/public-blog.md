# Public multilingual blog

## Purpose

Spendist has a public, search-indexable blog for people who are not signed in. Its Polish and English editions are separate editorial products: an English article does not require a Polish equivalent, and there is no translation relationship between individual posts.

## Public routes

- `/pl/blog` and `/en/blog` are the indexable edition home pages.
- `/{locale}/blog/{slug}` is a published article.
- `/{locale}/blog/category/{categorySlug}` is an indexable category archive when the category has at least one published article.
- `/{locale}/blog/page/{page}` and category pagination use 12 articles per page.
- `?tag={tag}` filters an index but is `noindex,follow`; tags do not create sitemap URLs.
- `/{locale}/blog/feed.xml` is the locale-specific RSS 2.0 feed.

The landing page and signed-out navigation link to the blog edition matching the active UI language. Changing language while visiting a blog URL opens the other edition's home page because articles are not translations of each other.

## Repository publishing workflow

There is no CMS, administrator panel, comment system, or database table for the first version. Editors publish through the repository:

1. Add or update a localized category in `apps/web/content/blog/{locale}/categories.json`.
2. Store the cover image under `apps/web/public/blog/`.
3. Add a Markdown file named `{slug}.md` to `apps/web/content/blog/pl/` or `apps/web/content/blog/en/` using the front matter documented in `apps/web/content/blog/README.md`.
4. Set `draft: false` when the article is ready.
5. Run `npm run blog:generate` and commit the Markdown, image, generated TypeScript, RSS feeds, sitemap, and robots file together.
6. Run the Nx lint, test, and build targets before publishing.

The generator rejects malformed slugs, unknown categories, invalid dates, missing images, invalid dimensions, and descriptions outside 50-160 characters. The Nx production build runs `blog:check` and fails when generated files are stale.

## Rendering and SEO

Published Markdown is converted to sanitized HTML during the build. Article H2/H3 headings receive stable anchors and feed the table of contents. The generator calculates reading time and sorts articles newest first.

Blog pages provide canonical URLs, robots directives, Open Graph, Twitter cards, RSS discovery, and JSON-LD. Article pages use `BlogPosting` and breadcrumbs. Edition home pages have reciprocal PL/EN `hreflang`; article pages do not, because posts are independent. The generated sitemap contains the landing page, both edition indexes, published articles, and non-empty category archives. Unknown blog URLs receive a branded `noindex` page and the Cloudflare Worker returns HTTP 404.

## User-visible behavior and limits

- Layouts are mobile-first and responsive.
- Article cards reserve image dimensions, and published article routes are prerendered.
- Sharing uses the browser Web Share API when available, copy-to-clipboard, and plain outbound Facebook, LinkedIn, and X URLs. No social SDK or tracker is embedded.
- Author attribution is `Spendist Team`.
- Comments, author profiles, search, related posts, and an editorial UI are not included.
- An empty edition remains indexable and presents a localized coming-soon state.
