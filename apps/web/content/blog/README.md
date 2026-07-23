# Spendist blog authoring

Polish and English blogs are independent. Put articles in `pl/` or `en/` and
define their category in the matching `categories.json`.

```md
---
title: A clear article title
slug: clear-article-slug
description: A unique search description between 50 and 160 characters.
publishedAt: 2026-07-22
updatedAt: 2026-07-22
category: personal-finance
tags:
  - budgeting
  - privacy
coverImageId: blog/en/clear-article-slug/cover
coverImageAlt: Descriptive alternative text
draft: true
---

# A clear article title

Article body in Markdown.

![A descriptive alternative](image:monthly-chart 'Optional caption')
```

`draft` must be explicitly set to `false` to publish. Published articles require
all fields except `updatedAt`.

## Adding an article from Markdown

The repository-local `add-spendist-blog-post` skill accepts supplied Markdown
or article text and creates the actual
`apps/web/content/blog/{pl|en}/{slug}.md` file. It always creates a draft. The
Markdown file is therefore safely stored in the repository before images are
available.

## Image ownership and conversion

Do not put original raster images directly in `public/`. Keep every post's
source files together:

```text
apps/web/image-sources/blog/en/clear-article-slug/
├── cover.jpg
└── monthly-chart.png
```

The logical IDs are `blog/en/clear-article-slug/cover` and
`blog/en/clear-article-slug/monthly-chart`. The cover ID belongs in front
matter. Body images use `image:monthly-chart` without a filename extension.

Use a cover source at least 1200 pixels wide in the 1200:630 social sharing
ratio; published entries that do not meet this contract are rejected. Use the
largest clean original available for body images, but do not upscale a small
source.

Run `npm run images:generate` after adding or changing sources. It creates
multiple widths up to 1600 pixels, AVIF and WebP candidates, a JPEG or PNG
fallback, and the generated manifest under `apps/web/public/`. The browser then
selects an appropriate file through `srcset` and `sizes`. Do not edit or mix
generated files with source files. `npm run images:check` detects stale or
missing output.

For a draft, run `npm run blog:generate` and keep `draft: true`. The generator
validates its metadata, category, slug, description, and logical body-image
syntax without requiring image files or adding the draft to public output. To
publish, first add and convert all referenced images, set `draft: false`, then
run `npm run blog:generate`. Review the generated registry, sitemap, robots,
and feeds. Commit the Markdown, source images, generated image
assets/manifests, and generated blog outputs together. CI runs `images:check`
and `blog:check`.
