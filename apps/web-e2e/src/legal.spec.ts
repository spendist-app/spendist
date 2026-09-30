import { expect, test } from '@playwright/test';

// These checks use mocked Auth responses and never write to a database.
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.route('**/env.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'globalThis.__env = {SUPABASE_URL:"http://127.0.0.1:55321",SUPABASE_ANON_KEY:"test-publishable-key"}; globalThis.env = globalThis.__env;',
    })
  );

  await page.route(/\/(?:auth|rest|storage)\/v1\//, (route) => route.abort());
});

test('shows current legal documents in Polish and English on desktop and mobile', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });

    for (const path of ['/regulamin', '/polityka-prywatnosci']) {
      await page.goto(path);
      await expect(page.locator('.legal-content')).toContainText('Wersja 1.0');
      await expect(page.locator('.legal-content')).not.toContainText(
        'Wersja robocza'
      );
      await page
        .locator('.legal-header')
        .getByRole('link', { name: 'English', exact: true })
        .click();
      await expect(page.locator('.legal-content')).toContainText('Version 1.0');
      await page.reload();
      await expect(page.locator('.legal-content')).toContainText('Version 1.0');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://spendist.app${path}`
      );

      const overflowing = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );

      expect(overflowing).toBe(false);
    }
  }

  expect(errors).toEqual([]);
});

test('requires adult and legal confirmation and sends versions without an external avatar', async ({
  page,
}) => {
  let calls = 0;
  let signupBody = '';
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    if (/dicebear|google-analytics|googletagmanager/.test(request.url())) {
      forbiddenRequests.push(request.url());
    }
  });

  await page.route('**/auth/v1/signup**', (route) => {
    calls += 1;
    signupBody = route.request().postData() ?? '';

    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock-user',
        email: 'legal@example.test',
        user_metadata: {},
        identities: [],
      }),
    });
  });
  await page.goto('/signup');
  await page.locator('#name').fill('Legal Test');
  await page.locator('#email').fill('legal@example.test');
  await page.locator('#password').fill('Password123!');
  await page.locator('#confirmPassword').fill('Password123!');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  expect(calls).toBe(0);

  await page.locator('#adultConfirmed').check();
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  expect(calls).toBe(0);

  await expect(page.locator('a[href="/regulamin?lang=en"]')).toHaveAttribute(
    'target',
    '_blank'
  );
  await page.locator('#termsAccepted').check();
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Check your email' })
  ).toBeVisible();
  expect(calls).toBe(1);
  expect(signupBody).toContain('"terms_version":"1.0"');
  expect(signupBody).toContain('"privacy_version":"1.0"');
  expect(signupBody).toContain('"adult_confirmed":true');
  expect(signupBody).toContain('"avatar_url":null');
  expect(forbiddenRequests).toEqual([]);
});
