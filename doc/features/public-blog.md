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
2. Add a Markdown file named `{slug}.md` to `apps/web/content/blog/pl/` or `apps/web/content/blog/en/` using the front matter documented in `apps/web/content/blog/README.md`. The repository-local `add-spendist-blog-post` skill can create this file from supplied Markdown and always starts it as a draft.
3. Put original raster files in the article-owned `apps/web/image-sources/blog/{locale}/{slug}/` directory. `cover.{ext}` is the cover; other lowercase kebab-case filenames are body assets.
4. Run `npm run images:generate`. This writes deployable responsive variants and manifests; source images never share a directory with generated assets.
5. Set `draft: false` only when the article, metadata, and all referenced images are ready.
6. Run `npm run blog:generate` and commit the Markdown, source images, generated responsive assets/manifests, generated TypeScript, RSS feeds, sitemap, and robots file together.
7. Run the Nx lint, test, and build targets before publishing.

The generator rejects malformed slugs, unknown categories, invalid dates, missing logical images, non-pipeline Markdown images, and descriptions outside 50-160 characters. The Nx production build runs both `images:check` and `blog:check` and fails when generated files are stale.

## Rendering and SEO

Published Markdown is converted to sanitized HTML during the build. Article H2/H3 headings receive stable anchors and feed the table of contents. Table-of-contents links retain the localized article path and scroll to the selected heading. The generator calculates reading time and sorts articles newest first.

Blog pages provide canonical URLs, robots directives, Open Graph, Twitter cards, RSS discovery, and JSON-LD. Article pages use `BlogPosting` and breadcrumbs. The visually separated sharing panel uses icon-only Web Share, copy-link, Facebook, LinkedIn, and X actions with accessible labels; it does not load third-party social SDKs. Edition home pages have reciprocal PL/EN `hreflang`; article pages do not, because posts are independent. The generated sitemap contains the landing page, both edition indexes, published articles, and non-empty category archives. Unknown blog URLs receive a branded `noindex` page and the Cloudflare Worker returns HTTP 404.

## User-visible behavior and limits

- Layouts are mobile-first and responsive.
- Article cards and article bodies use generated AVIF/WebP `srcset` candidates, explicit `sizes`, intrinsic dimensions, and a JPEG/PNG fallback. Covers reserve the 1200:630 ratio, non-critical images are lazy-loaded, and the article cover receives high fetch priority.
- Sharing uses the browser Web Share API when available, copy-to-clipboard, and plain outbound Facebook, LinkedIn, and X URLs. No social SDK or tracker is embedded.
- Author attribution is `Spendist Team`.
- Comments, author profiles, search, related posts, and an editorial UI are not included.
- An empty edition remains indexable and presents a localized coming-soon state.
