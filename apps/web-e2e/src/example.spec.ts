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
  await expect(page.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute(
    'href',
    '/forgot-password'
  );
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
