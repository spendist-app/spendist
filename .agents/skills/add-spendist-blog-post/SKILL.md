---
name: add-spendist-blog-post
description: Create a repository-backed Polish or English Spendist blog draft from supplied Markdown or article text. Use when the user asks to add, import, prepare, or save a Spendist blog entry, including requests that provide only an .md file and plan to add images later.
---

# Add Spendist Blog Post

Create a real Markdown entry in the repository. Keep Polish and English as
independent editorial collections and leave image conversion to the separate
repository pipeline.

## Workflow

1. Read `AGENTS.md` and `apps/web/content/blog/README.md`.
2. Read the supplied Markdown completely. Determine `pl` or `en` from the
   explicit request. Infer it from the article language only when unambiguous.
3. Derive a lowercase kebab-case slug. Check that the same filename does not
   already exist in the selected locale.
4. Review the locale's `categories.json`. Use an existing category when it
   clearly fits. Do not silently invent a category; explain when the catalog
   needs a new entry.
5. Create `apps/web/content/blog/{locale}/{slug}.md`. Do not leave the supplied
   file outside the content collection as the only copy.
6. Preserve the article's meaning and headings. Add or normalize front matter:
   `title`, `slug`, `description`, `publishedAt`, optional `updatedAt`,
   `category`, `tags`, `coverImageId`, `coverImageAlt`, and `draft`.
7. Set `coverImageId` to `blog/{locale}/{slug}/cover` and always set
   `draft: true`. Never publish merely because the Markdown looks complete.
   Use today's verified date only when the source does not specify a date.
8. For body graphics, use `![descriptive alt](image:asset-name "Optional
caption")`. Asset names must be unique lowercase kebab-case names within the
   article and must not include an extension.
9. Do not create, copy, convert, or optimize image files as part of this skill.
   Do not run `images:generate`.
10. Run `npm run blog:generate` and `npm run blog:check`. A draft must remain
    absent from generated public articles, sitemap, and RSS.
11. Report the created Markdown path and the future source locations:
    `apps/web/image-sources/blog/{locale}/{slug}/cover.<ext>` plus
    `apps/web/image-sources/blog/{locale}/{slug}/{asset-name}.<ext>` for every
    body image reference.

## Guardrails

- Never create or require a translated counterpart.
- Never change `draft` to `false` without an explicit publication request.
- Do not fabricate an image, alt text describing an unseen image, category, or
  article fact. Mark unresolved front matter clearly and keep the entry a
  draft.
- Keep the SEO description unique and between 50 and 160 characters.
- Report that the later cover source must be at least 1200 pixels wide in the
  1200:630 ratio.
- Use one H1 in front matter/title context; structure the body with H2/H3.
- Do not add a CMS, database record, comments, or social tracking SDK.
