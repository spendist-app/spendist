import { expect, test } from '@playwright/test';
import { fillStableInput } from './stable-input';

test('signed-out visitor cannot open administration', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Administration', exact: true })
  ).toHaveCount(0);
});

test('ordinary account cannot open administration', async ({ page }) => {
  await page.goto('/login');
  await fillStableInput(
    page.locator('#email'),
    process.env['E2E_AUTH_EMAIL'] ?? 'e2e-shared-user@gmail.com'
  );
  await fillStableInput(
    page.locator('#password'),
    process.env['E2E_AUTH_PASSWORD'] ?? 'Test1234!'
  );
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(
    page.getByRole('heading', { name: 'Administration', exact: true })
  ).toHaveCount(0);
});

test('administrator can hide preview modules', async ({ page }) => {
  await page.goto('/login');
  await fillStableInput(
    page.locator('#email'),
    process.env['E2E_ADMIN_EMAIL'] ?? 'e2e-admin-user@gmail.com'
  );
  await fillStableInput(
    page.locator('#password'),
    process.env['E2E_AUTH_PASSWORD'] ?? 'Test1234!'
  );
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  await page.getByRole('button', { name: 'Modules' }).click();
  await expect(page.getByRole('link', { name: 'Mortgages' })).toBeVisible();

  await page.goto('/admin');
  await page.getByTestId('hide-preview-features').check();

  await page.getByRole('button', { name: 'Modules' }).click();
  await expect(page.getByRole('link', { name: 'Mortgages' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Allowance' })).toHaveCount(0);
});
