import { test, expect } from '@playwright/test';

test('shows the public landing page with core calls to action', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Spendist/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Take control of your\s+finances/
  );

  await expect(page.getByText('Smart personal finance')).toBeVisible();
  await expect(
    page.getByText('Everything you need to manage your money')
  ).toBeVisible();
  await expect(page.getByText('Transactions tracked')).toBeVisible();
  await expect(page.getByText('Interactive dashboard')).toBeVisible();
  await expect(page.getByText('Import & export')).toBeVisible();

  await expect(page.getByRole('link', { name: /Log in/i })).toHaveAttribute(
    'href',
    '/login'
  );
  await expect(page.getByRole('link', { name: /Sign up/i })).toHaveAttribute(
    'href',
    '/signup'
  );
  await expect(
    page.getByRole('link', { name: /Get started/i })
  ).toHaveAttribute('href', '/signup');
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
  await expect(page.getByLabel('First wallet currency')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
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
