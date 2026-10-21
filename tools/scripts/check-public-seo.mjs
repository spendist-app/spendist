import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

// Run against local Wrangler after a production build, or pass a deployed origin.
// Only public HTML/XML is fetched; scripts and external resources are not run.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:8787').origin;

const sitemapSource = await readFile(
  new URL('../../apps/web/public/sitemap.xml', import.meta.url),
  'utf8'
);

const sitemap = new JSDOM(sitemapSource, { contentType: 'text/xml' });

const urls = [...sitemap.window.document.querySelectorAll('loc')].map(
  (node) => new URL(node.textContent.trim())
);

sitemap.window.close();

assert.ok(urls.length > 0, 'Sitemap must contain public URLs');

async function request(path, method = 'GET') {
  return fetch(new URL(path, origin), {
    method,
    redirect: 'manual',
    headers: { accept: 'text/html' },
    signal: AbortSignal.timeout(15_000),
  });
}

let failures = 0;

async function check(name, action) {
  try {
    await action();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

await check('served sitemap matches generated source', async () => {
  const response = await request('/sitemap.xml');

  assert.equal(response.status, 200);
  assert.equal(await response.text(), sitemapSource);
});

for (const url of urls) {
  await check(url.pathname, async () => {
    assert.ok(url.pathname === '/' || !url.pathname.endsWith('/'));

    const response = await request(url.pathname);

    assert.equal(
      response.status,
      200,
      'Canonical URL must serve HTML directly'
    );
    assert.equal(response.headers.get('location'), null);

    // This check reads metadata only; jsdom's CSS parser does not support all
    // of the modern CSS emitted by Angular/Tailwind.
    const page = new JSDOM(await response.text(), {
      virtualConsole: new VirtualConsole(),
    });

    try {
      const canonicals = page.window.document.querySelectorAll(
        'link[rel="canonical"]'
      );

      assert.equal(canonicals.length, 1, 'Exactly one canonical is required');
      assert.equal(canonicals[0].getAttribute('href'), url.href);
      assert.equal(
        page.window.document
          .querySelector('meta[property="og:url"]')
          ?.getAttribute('content'),
        url.href
      );
      assert.doesNotMatch(
        page.window.document
          .querySelector('meta[name="robots"]')
          ?.getAttribute('content') ?? '',
        /noindex/
      );
    } finally {
      page.window.close();
    }

    const head = await request(url.pathname, 'HEAD');

    assert.equal(head.status, 200);

    if (url.pathname === '/') return;

    for (const suffix of ['/', '/index.html', '.html']) {
      const variant = await request(
        `${url.pathname}${suffix}?utm_source=seo-check`,
        'HEAD'
      );

      assert.ok(
        [301, 307, 308].includes(variant.status),
        'HTML alias must redirect'
      );
      assert.equal(
        new URL(variant.headers.get('location'), origin).href,
        `${origin}${url.pathname}?utm_source=seo-check`,
        'Redirect must reach the canonical URL in one hop and preserve query parameters'
      );
    }
  });
}

for (const locale of ['pl', 'en']) {
  await check(`${locale} blog 404 and tag filters`, async () => {
    for (const method of ['GET', 'HEAD']) {
      const response = await request(
        `/${locale}/blog/__seo-missing-page`,
        method
      );

      assert.equal(response.status, 404);
      assert.equal(response.headers.get('location'), null);
      assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);

      if (method === 'GET') {
        assert.match(await response.text(), /<app-blog-not-found[\s>]/);
      }
    }

    const filtered = await request(`/${locale}/blog?tag=privacy`);

    assert.equal(filtered.status, 200);
    assert.equal(filtered.headers.get('x-robots-tag'), 'noindex, follow');
  });
}

if (failures > 0) process.exitCode = 1;
