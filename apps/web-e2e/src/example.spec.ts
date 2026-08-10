import { test, expect } from '@playwright/test';

test('shows the public landing page with core calls to action', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Spendist/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'See where your money really goes',
    })
  ).toBeVisible();

  await expect(page.getByText('Open-source personal finance')).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'From one expense to the whole picture',
    })
  ).toBeVisible();
  await expect(page.getByText('Cash flow at a glance')).toBeVisible();
  await expect(page.getByText('Fast and bulk entry')).toBeVisible();
  await expect(page.getByText('Recurring costs that keep up')).toBeVisible();
  await expect(page.getByText('Your data stays portable')).toBeVisible();

  await expect(
    page.getByRole('link', { name: 'I already have an account' })
  ).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: /Get started/ })).toHaveAttribute(
    'href',
    '/signup'
  );
  await expect(
    page.getByRole('link', { name: 'Follow development on GitHub' })
  ).toHaveAttribute('href', 'https://github.com/spendist-app/spendist');
  await expect(
    page.getByRole('link', { name: 'Blog' }).first()
  ).toHaveAttribute('href', '/en/blog');
  await expect(page.getByTestId('tickist-link')).toHaveAttribute(
    'href',
    'https://tickist.com/'
  );
  await expect(page.getByTestId('tickist-link')).toHaveAttribute(
    'rel',
    'noopener noreferrer'
  );
  await expect(page.getByTestId('tickist-github-link')).toHaveAttribute(
    'href',
    'https://github.com/tickist/tickist-app'
  );
});

test('serves separate, indexable English and Polish blog indexes', async ({
  page,
}) => {
  await page.goto('/en/blog');
  await expect(page).toHaveTitle(/Spendist Blog/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Ideas for clearer personal finances',
    })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'What Is Spendist? Meet the Open-Source App for Managing Your Household Budget',
    })
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://spendist.app/en/blog'
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.locator('link[rel="alternate"][hreflang="pl"]')
  ).toHaveAttribute('href', 'https://spendist.app/pl/blog');
  await expect(
    page.locator('link[rel="alternate"][type="application/rss+xml"]')
  ).toHaveAttribute('href', '/en/blog/feed.xml');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'index,follow,max-image-preview:large'
  );
  await expect(
    page.getByRole('navigation', { name: 'Blog categories' })
  ).toBeVisible();
  await expect(page.locator('.article-card')).toHaveCount(3);

  await page.goto('/pl/blog');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Pomysły na bardziej przejrzyste finanse',
    })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Dlaczego powstał Spendist?',
    })
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://spendist.app/pl/blog'
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(
    page.locator('link[rel="alternate"][hreflang="en"]')
  ).toHaveAttribute('href', 'https://spendist.app/en/blog');
  await expect(
    page.getByRole('navigation', { name: 'Kategorie bloga' })
  ).toBeVisible();
  await expect(page.locator('.article-card')).toHaveCount(3);
});

test('publishes blog discovery files', async ({ page }) => {
  const [sitemap, robots, englishFeed, polishFeed] = await Promise.all([
    page.request.get('/sitemap.xml'),
    page.request.get('/robots.txt'),
    page.request.get('/en/blog/feed.xml'),
    page.request.get('/pl/blog/feed.xml'),
  ]);

  expect(sitemap.ok()).toBe(true);
  const sitemapText = await sitemap.text();
  const robotsText = await robots.text();
  const englishFeedText = await englishFeed.text();
  const polishFeedText = await polishFeed.text();

  expect(sitemapText).toContain('https://spendist.app/en/blog');
  expect(sitemapText).toContain('https://spendist.app/pl/blog');
  expect(sitemapText).not.toContain('/login');
  expect(sitemapText).toContain(
    'https://spendist.app/en/blog/what-is-spendist'
  );
  expect(sitemapText).toContain(
    'https://spendist.app/pl/blog/czym-jest-spendist'
  );
  expect(robotsText).toContain('Allow: /pl/blog');
  expect(robotsText).toContain('Disallow: /transactions');
  expect(robotsText).toContain('Sitemap: https://spendist.app/sitemap.xml');
  expect(englishFeedText).toContain('<language>en</language>');
  expect(englishFeedText.match(/<item>/g) ?? []).toHaveLength(3);
  expect(polishFeedText).toContain('<language>pl</language>');
  expect(polishFeedText.match(/<item>/g) ?? []).toHaveLength(3);
});

test('keeps tag filters out of the index and publishes article metadata', async ({
  page,
}) => {
  await page.goto('/en/blog?tag=draft-only');

  await expect(page.getByText('Filtered by #draft-only')).toBeVisible();
  await expect(page.getByText('No articles match this tag')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex,follow'
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://spendist.app/en/blog'
  );

  await page.goto('/en/blog/what-is-spendist');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'What Is Spendist? Meet the Open-Source App for Managing Your Household Budget',
    })
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'index,follow,max-image-preview:large'
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://spendist.app/en/blog/what-is-spendist'
  );
  await expect(page.locator('article.article-shell')).toBeVisible();
  await expect(
    page.locator('source[type="image/avif"]').first()
  ).toHaveAttribute('srcset', /\/media\/blog\/en\/what-is-spendist\//);

  const firstContentsLink = page.locator('.toc a').first();
  await expect(firstContentsLink).toHaveAttribute(
    'href',
    /^\/en\/blog\/what-is-spendist#/
  );
  await firstContentsLink.click();
  await expect(page).toHaveURL(/\/en\/blog\/what-is-spendist#[\w-]+$/);

  const sharePanel = page.getByRole('region', { name: 'Share article' });
  await expect(
    sharePanel.getByText('Share article', { exact: true })
  ).toHaveCount(1);
  await expect(
    sharePanel.getByRole('button', { name: 'Copy link' })
  ).toBeVisible();
  await expect(
    sharePanel.getByRole('link', { name: 'Facebook' })
  ).toBeVisible();
  await expect(
    sharePanel.getByRole('link', { name: 'LinkedIn' })
  ).toBeVisible();
  await expect(sharePanel.getByRole('link', { name: 'X' })).toBeVisible();
});

test('marks invalid blog pagination as noindex', async ({ page }) => {
  await page.goto('/pl/blog/page/2');

  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Ta strona bloga nie istnieje',
    })
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex,follow'
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://spendist.app/pl/blog/page/2'
  );
});

test('keeps the published blog usable on a mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/pl/blog');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Pomysły na bardziej przejrzyste finanse',
    })
  ).toBeVisible();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(horizontalOverflow).toBe(false);
  const navbarLayout = await page.locator('nav.navbar').evaluate((navbar) => {
    const children = [...navbar.children].map((child) =>
      child.getBoundingClientRect()
    );
    return {
      height: navbar.getBoundingClientRect().height,
      rowCenters: children.map((child) =>
        Math.round(child.top + child.height / 2)
      ),
    };
  });
  expect(navbarLayout.height).toBeLessThanOrEqual(72);
  expect(
    Math.max(...navbarLayout.rowCenters) - Math.min(...navbarLayout.rowCenters)
  ).toBeLessThanOrEqual(1);
  await expect(
    page.getByRole('group', { name: 'Język' }).getByRole('button')
  ).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Polski' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByRole('link', { name: 'RSS' })).toBeVisible();
});

test('opens unauthenticated login and signup forms', async ({ page }) => {
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'Welcome back' })
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();

  await page.locator('section').getByRole('link', { name: 'Sign up' }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(
    page.getByRole('heading', { name: 'Create your account' })
  ).toBeVisible();
  await expect(page.getByLabel('Name')).toBeVisible();
  await expect(
    page.getByText(
      'Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.'
    )
  ).toBeVisible();
  await expect(page.getByLabel('First wallet currency')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
});

test('opens password reset flow from login', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('link', { name: 'Forgot password?' }).click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(
    page.getByRole('heading', { name: 'Reset your password' })
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();

  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
});

test('shows reset-password expired link state without a recovery token', async ({
  page,
}) => {
  await page.goto('/reset-password');

  await expect(
    page.getByRole('heading', { name: 'Set a new password' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Request a new reset link' })
  ).toHaveAttribute('href', '/forgot-password');
});

test('shows password reset success message on login callback', async ({
  page,
}) => {
  await page.goto('/login?passwordReset=success');

  await expect(
    page.getByText('Your password was changed. Log in with the new password.')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});

test('redirects guests away from protected application routes', async ({
  page,
}) => {
  for (const route of ['/dashboard', '/transactions', '/settings']) {
    await page.goto(route);

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'See where your money really goes',
      })
    ).toBeVisible();
  }
});

test('exposes installable PWA metadata', async ({ page }) => {
  await page.goto('/');

  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveAttribute('href', 'manifest.webmanifest');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#0EA5A5'
  );

  const response = await page.request.get('/manifest.webmanifest');
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: 'Spendist',
    short_name: 'Spendist',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    theme_color: '#0EA5A5',
    background_color: '#FFFDFB',
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      }),
      expect.objectContaining({
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        purpose: 'maskable',
      }),
    ])
  );
});
