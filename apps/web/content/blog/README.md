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
coverImage: /blog/en/clear-article-slug/cover.webp
coverImageAlt: Descriptive alternative text
coverImageWidth: 1200
coverImageHeight: 630
draft: true
---

# A clear article title

Article body in Markdown.
```

`draft` must be explicitly set to `false` to publish. Published articles require
all fields except `updatedAt`. Store images under `apps/web/public/blog/`.

Run `npm run blog:generate`, review the generated registry, sitemap, robots and
feeds, then commit source and generated files together. CI runs
`npm run blog:check` and fails when generated files are stale.
