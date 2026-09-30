import { expect, test } from '@playwright/test';

const consentKey = 'spendist.analytics-consent';

const googleScript = `
(() => {
  if (Array.from(window.dataLayer || []).some(item => Object.prototype.toString.call(item) !== '[object Arguments]')) throw new Error('Google requires Arguments queue entries');
  const disabled = () => window['ga-disable-G-WY8ZY07NGW'];
  const config = Array.from(window.dataLayer || []).find(item => item[0] === 'config')?.[2];
  const consent = Array.from(window.dataLayer || []).find(item => item[0] === 'consent')?.[2];
  const collect = () => {
    if (disabled() || !config) return;
    document.cookie = '_ga=mock-visitor; Path=/';
    document.cookie = '_ga_WY8ZY07NGW=mock-session; Path=/';
    const url = new URL('https://www.google-analytics.com/g/collect');
    url.searchParams.set('dl', config.page_location);
    url.searchParams.set('dr', config.page_referrer);
    url.searchParams.set('config', JSON.stringify(config));
    url.searchParams.set('consent', JSON.stringify(consent));
    fetch(url, { keepalive: true }).catch(() => {});
  };
  collect();
  // Deliberately keep a collector alive: removing a script tag would leak requests.
  setInterval(collect, 100);
})();
`;

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ context }) => {
  await context.route('**/env.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'globalThis.__env = {SUPABASE_URL:"http://127.0.0.1:55321",SUPABASE_ANON_KEY:"test-publishable-key"}; globalThis.env = globalThis.__env;',
    })
  );
  await context.route(/\/(?:auth|rest|storage)\/v1\//, (route) =>
    route.abort()
  );
});

test('requires consent, sanitizes public visits and destroys collection on auth routes and withdrawal', async ({
  page,
  context,
}) => {
  const scriptRequests: string[] = [];
  const collections: URL[] = [];
  const violations: string[] = [];
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      message.text().includes('Content Security Policy')
    ) {
      violations.push(message.text());
    }
  });
  await context.route('https://www.googletagmanager.com/**', (route) => {
    scriptRequests.push(route.request().url());

    return route.fulfill({
      contentType: 'application/javascript',
      body: googleScript,
    });
  });
  await context.route('https://*.google-analytics.com/**', (route) => {
    collections.push(new URL(route.request().url()));

    return route.fulfill({
      status: 204,
      headers: { 'access-control-allow-origin': '*' },
    });
  });

  await page.goto('/?email=private@example.test#secret');
  const banner = page.getByRole('dialog', { name: 'Allow visit statistics?' });
  await expect(banner).toBeVisible();
  expect(scriptRequests).toHaveLength(0);
  expect(collections).toHaveLength(0);
  expect(
    (await context.cookies()).filter((cookie) => cookie.name.startsWith('_ga'))
  ).toHaveLength(0);

  await page
    .getByRole('button', { name: 'Reject / withdraw', exact: true })
    .click();
  await page.reload();
  await expect(banner).toHaveCount(0);
  expect(scriptRequests).toHaveLength(0);
  await page
    .getByRole('button', { name: 'Analytics preferences', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Allow analytics', exact: true })
    .click();
  await expect.poll(() => collections.length).toBeGreaterThan(0);
  expect(scriptRequests[0]).toContain('id=G-WY8ZY07NGW');

  const payload = collections[0].searchParams;
  expect(payload.get('dl')).toBe(new URL('/', page.url()).href);
  expect(payload.get('dr')).toBe('');
  expect(payload.toString()).not.toContain('private');
  expect(payload.toString()).not.toContain('secret');
  expect(JSON.parse(payload.get('config') ?? '{}')).toMatchObject({
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'none',
    cookie_expires: 15552000,
    cookie_update: false,
  });
  expect(JSON.parse(payload.get('consent') ?? '{}')).toMatchObject({
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });

  await page.getByRole('link', { name: 'Log in', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('iframe[src="/analytics/frame.html"]')).toHaveCount(
    0
  );
  // Wait for a stable private page, then assert a former timer cannot keep collecting.
  await expect(
    page.getByRole('button', { name: 'Log in', exact: true })
  ).toBeVisible();
  const privateCount = collections.length;
  await page.waitForTimeout(350);
  expect(collections).toHaveLength(privateCount);

  await page.goto('/regulamin?lang=en&token=hidden#fragment');
  await expect
    .poll(() =>
      collections.some((url) =>
        url.searchParams.get('dl')?.endsWith('/regulamin')
      )
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'Analytics preferences', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reject / withdraw', exact: true })
    .click();
  await expect(page.locator('iframe[src="/analytics/frame.html"]')).toHaveCount(
    0
  );
  expect(
    (await context.cookies()).filter((cookie) => cookie.name.startsWith('_ga'))
  ).toHaveLength(0);
  const withdrawnCount = collections.length;
  await page.waitForTimeout(350);
  expect(collections).toHaveLength(withdrawnCount);
  expect(violations).toEqual([]);

  const runtime = await page.goto('/analytics/frame.html');
  expect(runtime?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  const directCount = scriptRequests.length;
  await page.waitForTimeout(200);
  expect(scriptRequests).toHaveLength(directCount);
});

test('withdrawal in another tab stops a loaded runtime and persisted consent never enables auth pages', async ({
  page,
  context,
}) => {
  const collections: string[] = [];
  await context.route('https://www.googletagmanager.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: googleScript })
  );
  await context.route('https://*.google-analytics.com/**', (route) => {
    collections.push(route.request().url());

    return route.fulfill({
      status: 204,
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Allow analytics', exact: true })
    .click();
  await expect.poll(() => collections.length).toBeGreaterThan(0);

  const second = await context.newPage();
  await second.goto('/login');
  await expect(
    second.getByRole('button', { name: 'Log in', exact: true })
  ).toBeVisible();
  await expect(
    second.locator('iframe[src="/analytics/frame.html"]')
  ).toHaveCount(0);
  await second
    .getByRole('button', { name: 'Analytics preferences', exact: true })
    .click();
  await second
    .getByRole('button', { name: 'Reject / withdraw', exact: true })
    .click();
  await expect(page.locator('iframe[src="/analytics/frame.html"]')).toHaveCount(
    0
  );
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? '{}').choice,
      consentKey
    )
  ).toBe('rejected');
  const count = collections.length;
  await page.waitForTimeout(350);
  expect(collections).toHaveLength(count);
});

test('Polish consent banner fits a small screen and leaves the page usable after refusal', async ({
  page,
  context,
}) => {
  const googleRequests: string[] = [];
  await context.route(
    /https:\/\/[^/]*(?:google-analytics|googletagmanager)\.com\//,
    (route) => {
      googleRequests.push(route.request().url());

      return route.abort();
    }
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pl/blog');
  await expect(
    page.getByRole('dialog', { name: 'Zgoda na statystyki odwiedzin?' })
  ).toBeVisible();

  const accept = page.getByRole('button', {
    name: 'Zezwól na analitykę',
    exact: true,
  });

  const reject = page.getByRole('button', {
    name: 'Odmów / wycofaj',
    exact: true,
  });

  expect(await accept.getAttribute('class')).toBe(
    await reject.getAttribute('class')
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);

  await reject.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('h1')).toBeVisible();
  expect(googleRequests).toHaveLength(0);
});

test('a restored signed-in session blocks analytics even on a public page with persisted consent', async ({
  page,
  context,
}) => {
  const googleRequests: string[] = [];
  await context.route(
    /https:\/\/[^/]*(?:google-analytics|googletagmanager)\.com\//,
    (route) => {
      googleRequests.push(route.request().url());

      return route.abort();
    }
  );
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        choice: 'accepted',
        expiresAt: Date.now() + 86400000,
      })
    );
    localStorage.setItem(
      'sb-127-auth-token',
      JSON.stringify({
        access_token: 'mock-browser-session',
        refresh_token: 'mock-browser-refresh',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: '77e5dc42-ec48-4f02-9599-2b032d009870',
          email: 'mock@example.test',
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2026-09-30T12:00:00Z',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {
            legal_acceptance: {
              terms_version: '1.1',
              privacy_version: '1.1',
              adult_confirmed: true,
              accepted_at: '2026-09-30T12:00:00Z',
            },
          },
        },
      })
    );
  }, consentKey);
  await page.goto('/regulamin');
  await expect(page.locator('.avatar')).toBeVisible();
  await expect(page.locator('iframe[src="/analytics/frame.html"]')).toHaveCount(
    0
  );
  await expect(
    page.getByRole('dialog', { name: 'Allow visit statistics?' })
  ).toHaveCount(0);
  expect(googleRequests).toHaveLength(0);
});
