import { expect, test } from '@playwright/test';

test('signed-out visitor cannot open administration', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Administration', exact: true })
  ).toHaveCount(0);
});

test('ordinary account cannot open administration', async ({
  page,
}) => {
  await page.goto('/login');
  await page
    .locator('#email')
    .fill(process.env['E2E_AUTH_EMAIL'] ?? 'e2e-shared-user@gmail.com');
  await page
    .locator('#password')
    .fill(process.env['E2E_AUTH_PASSWORD'] ?? 'Test1234!');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(
    page.getByRole('heading', { name: 'Administration', exact: true })
  ).toHaveCount(0);
});
