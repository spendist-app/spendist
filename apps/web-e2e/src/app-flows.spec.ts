import {
  expect,
  type Locator,
  type Page,
  test,
  type TestInfo,
} from '@playwright/test';

const DEFAULT_EMAIL = 'e2e-shared-user@spendist.dev';
const DEFAULT_PASSWORD = 'Test1234!';

function uniqueSuffix(testInfo: TestInfo): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${testInfo.project.name}-${Date.now()}-${randomPart}`;
}

function futureDateInput(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

async function ensureAuthenticated(page: Page): Promise<void> {
  const email = process.env['E2E_AUTH_EMAIL'] ?? DEFAULT_EMAIL;
  const password = process.env['E2E_AUTH_PASSWORD'] ?? DEFAULT_PASSWORD;

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

async function selectFirstRealOption(select: Locator): Promise<string> {
  const option = select.locator('option:not([disabled])').nth(1);
  const value = await option.getAttribute('value');
  if (!value) {
    throw new Error('Missing selectable option value.');
  }
  await select.selectOption(value);
  return value;
}

async function stubRecurringBackfill(page: Page): Promise<void> {
  await page.route(
    '**/functions/v1/process-recurring-payments',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processedCount: 0,
          skippedCount: 0,
          processed: [],
          skipped: [],
          backfill: true,
        }),
      });
    }
  );
}

test('logs in with the shared e2e account', async ({ page }) => {
  await ensureAuthenticated(page);

  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
});

test('registers a new account and opens dashboard', async ({
  page,
}, testInfo) => {
  const suffix = uniqueSuffix(testInfo);

  await page.goto('/signup');
  await page.getByLabel('Name').fill(`Spendist User ${suffix}`);
  await page.getByLabel('Email').fill(`signup-${suffix}@spendist.dev`);
  await page.getByLabel('Password', { exact: true }).fill(DEFAULT_PASSWORD);
  await page.getByLabel('Confirm password').fill(DEFAULT_PASSWORD);
  await page.getByLabel('First wallet currency').selectOption('1');
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
});

test('adds transaction and keeps it after reload', async ({
  page,
}, testInfo) => {
  const description = `E2E coffee ${uniqueSuffix(testInfo)}`;

  await ensureAuthenticated(page);
  await page.goto('/transactions');
  await expect(
    page.getByRole('heading', { name: 'Transactions' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Add transaction' }).click();
  await expect(
    page.getByRole('heading', { name: 'Add transaction' })
  ).toBeVisible();

  await page.locator('input[formcontrolname="description"]').fill(description);
  await selectFirstRealOption(
    page.locator('select[formcontrolname="categoryId"]')
  );
  await page.locator('input[formcontrolname="amount"]').fill('12.50');
  await page.locator('select[formcontrolname="currency"]').selectOption('PLN');
  await page.getByRole('button', { name: 'Save transaction' }).click();

  await expect(
    page.getByRole('heading', { name: 'Add transaction' })
  ).toHaveCount(0);
  await expect(page.getByText(description)).toBeVisible();

  await page.reload();
  await expect(page.getByText(description)).toBeVisible();
});

test('adds recurring payment with selected currency', async ({
  page,
}, testInfo) => {
  const name = `E2E hosting ${uniqueSuffix(testInfo)}`;

  await stubRecurringBackfill(page);
  await ensureAuthenticated(page);
  await page.goto('/modules/recurring-payments');
  await expect(
    page.getByRole('heading', { name: 'Recurring payments' })
  ).toBeVisible();

  await page
    .getByRole('button', { name: /Add recurring/i })
    .last()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Schedule a recurring payment' })
  ).toBeVisible();

  await page.locator('#recurring-name').fill(name);
  await selectFirstRealOption(page.locator('#recurring-category'));
  await selectFirstRealOption(page.locator('#recurring-wallet'));
  await page.locator('#recurring-amount').fill('29.99');
  await page.locator('select[formcontrolname="currency"]').selectOption('USD');
  await page.locator('#recurring-schedule-frequency').selectOption('monthly');
  await page.locator('#recurring-start-date').fill(futureDateInput(7));
  await page.getByRole('button', { name: 'Save recurring payment' }).click();

  await expect(
    page.getByRole('heading', { name: 'Schedule a recurring payment' })
  ).toHaveCount(0);
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText('USD')).toBeVisible();

  await page.reload();
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText('USD')).toBeVisible();
});
