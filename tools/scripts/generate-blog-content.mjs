import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, 'apps/web/content/blog');
const PUBLIC_ROOT = path.join(ROOT, 'apps/web/public');
const GENERATED_TS = path.join(
  ROOT,
  'apps/web/src/app/pages/blog/blog-content.generated.ts'
);
const LOCALES = ['pl', 'en'];
const SITE_URL = 'https://spendist.app';
const PAGE_SIZE = 12;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyHeading(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

function requiredString(data, field, file) {
  const value = data[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${file}: ${field} must be a non-empty string.`);
  }
  return value.trim();
}

function positiveInteger(data, field, file) {
  const value = Number(data[field]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${file}: ${field} must be a positive integer.`);
  }
  return value;
}

function isoDate(data, field, file, optional = false) {
  const value = data[field];
  if (optional && (value === undefined || value === null || value === ''))
    return null;
  const normalized = requiredString(data, field, file);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
    Number.isNaN(Date.parse(normalized))
  ) {
    throw new Error(`${file}: ${field} must use YYYY-MM-DD.`);
  }
  return normalized;
}

export function extractHeadings(markdown) {
  const used = new Map();
  return markdown
    .split(/\r?\n/)
    .map((line) => /^(#{2,3})\s+(.+?)\s*$/.exec(line))
    .filter(Boolean)
    .map((match) => {
      const text = match[2].replace(/[*_`[\]]/g, '').trim();
      const base = slugifyHeading(text) || 'section';
      const occurrence = (used.get(base) ?? 0) + 1;
      used.set(base, occurrence);
      return {
        depth: match[1].length,
        id: occurrence === 1 ? base : `${base}-${occurrence}`,
        text,
      };
    });
}

export function renderMarkdown(markdown, headings) {
  let headingIndex = 0;
  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens);
    const heading =
      depth === 2 || depth === 3 ? headings[headingIndex++] : null;
    const id = heading ? ` id="${heading.id}"` : '';
    return `<h${depth}${id}>${text}</h${depth}>\n`;
  };
  const rendered = marked.parse(markdown, { gfm: true, renderer });
  return sanitizeHtml(String(rendered), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'figure',
      'figcaption',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'title', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      h2: ['id'],
      h3: ['id'],
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

async function loadCategories(locale) {
  const file = path.join(CONTENT_ROOT, locale, 'categories.json');
  const parsed = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${file}: expected an array.`);
  const seen = new Set();
  return parsed.map((entry) => {
    const slug = requiredString(entry, 'slug', file);
    const name = requiredString(entry, 'name', file);
    const description = requiredString(entry, 'description', file);
    if (!SLUG_PATTERN.test(slug))
      throw new Error(`${file}: invalid category slug ${slug}.`);
    if (seen.has(slug))
      throw new Error(`${file}: duplicate category slug ${slug}.`);
    seen.add(slug);
    return { locale, slug, name, description };
  });
}

async function loadArticles(locale, categories) {
  const directory = path.join(CONTENT_ROOT, locale);
  const entries = (await readdir(directory))
    .filter((name) => name.endsWith('.md'))
    .sort();
  const categorySlugs = new Set(categories.map((category) => category.slug));
  const slugs = new Set();
  const articles = [];
  for (const name of entries) {
    const file = path.join(directory, name);
    const parsed = matter(await readFile(file, 'utf8'));
    if (parsed.data.draft !== false) continue;
    const title = requiredString(parsed.data, 'title', file);
    const slug = requiredString(parsed.data, 'slug', file);
    const description = requiredString(parsed.data, 'description', file);
    const publishedAt = isoDate(parsed.data, 'publishedAt', file);
    const updatedAt = isoDate(parsed.data, 'updatedAt', file, true);
    const category = requiredString(parsed.data, 'category', file);
    const coverImage = requiredString(parsed.data, 'coverImage', file);
    const coverImageAlt = requiredString(parsed.data, 'coverImageAlt', file);
    const coverImageWidth = positiveInteger(
      parsed.data,
      'coverImageWidth',
      file
    );
    const coverImageHeight = positiveInteger(
      parsed.data,
      'coverImageHeight',
      file
    );
    const tags = Array.isArray(parsed.data.tags)
      ? [
          ...new Set(
            parsed.data.tags.map((tag) => String(tag).trim()).filter(Boolean)
          ),
        ]
      : [];
    if (!SLUG_PATTERN.test(slug) || path.basename(name, '.md') !== slug) {
      throw new Error(
        `${file}: slug must match the lowercase kebab-case filename.`
      );
    }
    if (slugs.has(slug))
      throw new Error(`${file}: duplicate article slug ${slug}.`);
    if (!categorySlugs.has(category))
      throw new Error(`${file}: unknown category ${category}.`);
    if (description.length < 50 || description.length > 160) {
      throw new Error(`${file}: description must contain 50-160 characters.`);
    }
    if (updatedAt && updatedAt < publishedAt) {
      throw new Error(`${file}: updatedAt cannot precede publishedAt.`);
    }
    if (!coverImage.startsWith('/blog/')) {
      throw new Error(
        `${file}: coverImage must be an absolute /blog/ asset path.`
      );
    }
    await access(path.join(PUBLIC_ROOT, coverImage.slice(1)));
    slugs.add(slug);
    const headings = extractHeadings(parsed.content);
    const words = parsed.content.trim().split(/\s+/).filter(Boolean).length;
    articles.push({
      locale,
      title,
      slug,
      description,
      publishedAt,
      updatedAt,
      category,
      tags,
      coverImage,
      coverImageAlt,
      coverImageWidth,
      coverImageHeight,
      bodyHtml: renderMarkdown(parsed.content, headings),
      headings,
      readingMinutes: Math.max(1, Math.ceil(words / 220)),
      url: `/${locale}/blog/${slug}`,
    });
  }
  return articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function generatedTypescript(content) {
  return `import type { BlogGeneratedContent } from './blog.types';\n\n// Generated by tools/scripts/generate-blog-content.mjs. Do not edit manually.\nexport const BLOG_CONTENT: BlogGeneratedContent = ${JSON.stringify(
    content,
    null,
    2
  )};\n`;
}

function sitemap(content) {
  const paginationUrls = LOCALES.flatMap((locale) => {
    const localeArticles = content.articles.filter(
      (article) => article.locale === locale
    );
    return Array.from(
      { length: Math.max(0, Math.ceil(localeArticles.length / PAGE_SIZE) - 1) },
      (_, index) => ({
        path: `/${locale}/blog/page/${index + 2}`,
        modified: null,
      })
    );
  });
  const categoryPaginationUrls = content.categories.flatMap((category) => {
    const total = content.articles.filter(
      (article) =>
        article.locale === category.locale && article.category === category.slug
    ).length;
    return Array.from(
      { length: Math.max(0, Math.ceil(total / PAGE_SIZE) - 1) },
      (_, index) => ({
        path: `/${category.locale}/blog/category/${category.slug}/page/${
          index + 2
        }`,
        modified: null,
      })
    );
  });
  const urls = [
    { path: '/', modified: null },
    ...LOCALES.map((locale) => ({ path: `/${locale}/blog`, modified: null })),
    ...content.articles.map((article) => ({
      path: article.url,
      modified: article.updatedAt ?? article.publishedAt,
    })),
    ...content.categories
      .filter((category) =>
        content.articles.some(
          (article) =>
            article.locale === category.locale &&
            article.category === category.slug
        )
      )
      .map((category) => ({
        path: `/${category.locale}/blog/category/${category.slug}`,
        modified: null,
      })),
    ...paginationUrls,
    ...categoryPaginationUrls,
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      ({ path: urlPath, modified }) =>
        `  <url>\n    <loc>${SITE_URL}${urlPath}</loc>${
          modified ? `\n    <lastmod>${modified}</lastmod>` : ''
        }\n  </url>`
    )
    .join('\n')}\n</urlset>\n`;
}

function robots() {
  return `# Generated by tools/scripts/generate-blog-content.mjs.\nUser-agent: *\nAllow: /\nAllow: /pl/blog\nAllow: /en/blog\n\nDisallow: /login\nDisallow: /signup\nDisallow: /forgot-password\nDisallow: /reset-password\nDisallow: /dashboard\nDisallow: /home\nDisallow: /transactions\nDisallow: /settings\nDisallow: /modules/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

function rss(locale, articles) {
  const title = locale === 'pl' ? 'Blog Spendist' : 'Spendist Blog';
  const description =
    locale === 'pl'
      ? 'Praktyczna wiedza o finansach osobistych i Spendist.'
      : 'Practical personal-finance and Spendist articles.';
  const escape = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  const items = articles
    .filter((article) => article.locale === locale)
    .map(
      (article) =>
        `    <item>\n      <title>${escape(
          article.title
        )}</title>\n      <link>${SITE_URL}${
          article.url
        }</link>\n      <guid>${SITE_URL}${
          article.url
        }</guid>\n      <description>${escape(
          article.description
        )}</description>\n      <pubDate>${new Date(
          `${article.publishedAt}T00:00:00Z`
        ).toUTCString()}</pubDate>\n    </item>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${title}</title>\n    <link>${SITE_URL}/${locale}/blog</link>\n    <description>${description}</description>\n    <language>${locale}</language>${
    items ? `\n${items}` : ''
  }\n  </channel>\n</rss>\n`;
}

async function buildOutputs() {
  const categories = (await Promise.all(LOCALES.map(loadCategories))).flat();
  const articles = (
    await Promise.all(
      LOCALES.map((locale) =>
        loadArticles(
          locale,
          categories.filter((category) => category.locale === locale)
        )
      )
    )
  ).flat();
  const content = { articles, categories };
  return new Map([
    [GENERATED_TS, generatedTypescript(content)],
    [path.join(PUBLIC_ROOT, 'sitemap.xml'), sitemap(content)],
    [path.join(PUBLIC_ROOT, 'robots.txt'), robots()],
    ...LOCALES.map((locale) => [
      path.join(PUBLIC_ROOT, locale, 'blog', 'feed.xml'),
      rss(locale, articles),
    ]),
  ]);
}

async function main() {
  const check = process.argv.includes('--check');
  const outputs = await buildOutputs();
  const stale = [];
  for (const [file, content] of outputs) {
    if (check) {
      const current = await readFile(file, 'utf8').catch(() => '');
      if (current !== content) stale.push(path.relative(ROOT, file));
    } else {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
    }
  }
  if (stale.length) {
    throw new Error(
      `Generated blog artifacts are stale:\n- ${stale.join(
        '\n- '
      )}\nRun npm run blog:generate.`
    );
  }
  console.log(
    check ? 'Blog artifacts are current.' : 'Blog artifacts generated.'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
