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

async function selectOptionContaining(
  select: Locator,
  text: string
): Promise<string> {
  const option = select.locator('option').filter({ hasText: text }).first();
  const value = await option.getAttribute('value');
  if (!value) {
    throw new Error(`Missing option value for ${text}.`);
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

async function openSettingsPanel(
  page: Page,
  panel: 'Wallets' | 'Categories'
): Promise<void> {
  await page.goto('/settings');
  await page.getByRole('button', { name: new RegExp(`^${panel}\\b`) }).click();

  const heading = panel === 'Categories' ? 'Categories & groups' : panel;
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

function formWithHeading(page: Page, heading: string): Locator {
  return page
    .locator('form')
    .filter({ has: page.getByRole('heading', { name: heading }) })
    .first();
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
  await page.getByLabel('First wallet currency').selectOption({ label: 'PLN' });
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();

  await openSettingsPanel(page, 'Categories');
  await expect(page.getByText('Food').first()).toBeVisible();
  await expect(page.getByText('Groceries').first()).toBeVisible();
  await expect(page.getByText('Biedronka').first()).toBeVisible();

  await page.getByRole('tab', { name: 'Category groups' }).click();
  await expect(page.locator('article').filter({ hasText: 'Essentials' })).toBeVisible();
  await expect(page.locator('article').filter({ hasText: 'Income' })).toBeVisible();
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

test('creates place and assigns it to a transaction', async ({
  page,
}, testInfo) => {
  const suffix = uniqueSuffix(testInfo);
  const placeName = `E2E barber ${suffix}`;
  const description = `E2E haircut ${suffix}`;

  await ensureAuthenticated(page);
  await page.goto('/modules/places');
  await expect(page.getByRole('heading', { name: 'Places' })).toBeVisible();

  await page.getByRole('button', { name: 'Add place' }).first().click();
  const placeForm = formWithHeading(page, 'Add place');
  await placeForm.locator('input[formcontrolname="name"]').fill(placeName);
  await placeForm
    .locator('input[formcontrolname="street"]')
    .fill('Main Street 12');
  await placeForm.locator('input[formcontrolname="city"]').fill('Zebrzydowice');
  await placeForm.getByRole('button', { name: 'Save place' }).click();

  await expect(page.locator('article').filter({ hasText: placeName })).toBeVisible();
  await expect(page.getByText('Zebrzydowice').first()).toBeVisible();

  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).click();
  await page.locator('input[formcontrolname="description"]').fill(description);
  await selectFirstRealOption(
    page.locator('select[formcontrolname="categoryId"]')
  );
  await selectOptionContaining(
    page.locator('select[formcontrolname="placeId"]'),
    placeName
  );
  await page.locator('input[formcontrolname="amount"]').fill('55');
  await page.getByRole('button', { name: 'Save transaction' }).click();

  const transactionRow = page.locator('li').filter({ hasText: description });
  await expect(transactionRow).toBeVisible();
  await expect(transactionRow).toContainText(placeName);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Spending by place' })).toBeVisible();
  const placeSummary = page.locator('article').filter({ hasText: placeName });
  await expect(placeSummary).toBeVisible();
  await expect(placeSummary).toContainText('55');
});

test('updates transaction exchange rate in edit form', async ({
  page,
}, testInfo) => {
  const description = `E2E exchange ${uniqueSuffix(testInfo)}`;

  await ensureAuthenticated(page);
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).click();

  await page.locator('input[formcontrolname="description"]').fill(description);
  await page.locator('input[formcontrolname="occurredOn"]').fill('2026-05-29');
  await selectFirstRealOption(
    page.locator('select[formcontrolname="categoryId"]')
  );
  await page.locator('input[formcontrolname="amount"]').fill('10');
  await page.locator('select[formcontrolname="currency"]').selectOption('USD');
  await page.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page.getByText(description)).toBeVisible();

  const transactionRow = page.locator('li').filter({ hasText: description });
  await transactionRow.getByRole('button', { name: 'Edit' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit transaction' })
  ).toBeVisible();
  await expect(page.locator('select[formcontrolname="currency"]')).toHaveValue(
    'USD'
  );

  await page.getByRole('button', { name: 'Show advanced fields' }).click();
  const defaultAmountInput = page.locator(
    'input[formcontrolname="foreignAmount"]'
  );
  await defaultAmountInput.fill('1');
  await page.getByRole('button', { name: 'Update exchange rate' }).click();

  await expect
    .poll(() => defaultAmountInput.inputValue())
    .toMatch(/^[1-9]\d*(\.\d{2})$/);
  await expect(defaultAmountInput).not.toHaveValue('1');

  await page.getByRole('button', { name: 'Update transaction' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit transaction' })
  ).toHaveCount(0);
  await expect(transactionRow).toContainText('PLN');

  await page.reload();
  await expect(
    page.locator('li').filter({ hasText: description })
  ).toContainText('PLN');
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

test('creates wallet and keeps it after reload', async ({ page }, testInfo) => {
  const walletName = `E2E wallet ${uniqueSuffix(testInfo)}`;

  await ensureAuthenticated(page);
  await openSettingsPanel(page, 'Wallets');
  await page.getByRole('button', { name: 'Add wallet' }).click();

  const form = formWithHeading(page, 'Create wallet');
  await form.locator('input[formcontrolname="name"]').fill(walletName);
  await form
    .locator('select[formcontrolname="currencyId"]')
    .selectOption({ label: 'EUR' });
  await form.getByRole('button', { name: 'Save wallet' }).click();

  const walletCard = page.locator('article').filter({ hasText: walletName });
  await expect(walletCard).toBeVisible();
  await expect(walletCard).toContainText('EUR');

  await page.reload();
  await openSettingsPanel(page, 'Wallets');
  await expect(
    page.locator('article').filter({ hasText: walletName })
  ).toContainText('EUR');
});

test('creates category group and category', async ({ page }, testInfo) => {
  const suffix = uniqueSuffix(testInfo);
  const groupName = `E2E group ${suffix}`;
  const categoryName = `E2E category ${suffix}`;

  await ensureAuthenticated(page);
  await openSettingsPanel(page, 'Categories');
  await page.getByRole('button', { name: 'New category group' }).click();

  const groupForm = formWithHeading(page, 'Create category group');
  await groupForm.locator('input[formcontrolname="name"]').fill(groupName);
  await groupForm.getByRole('button', { name: 'Create group' }).click();

  await expect(
    page.locator('article').filter({ hasText: groupName })
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Manage categories' }).click();
  await page.getByRole('button', { name: 'Add category' }).click();

  const categoryForm = formWithHeading(page, 'Create category');
  await categoryForm
    .locator('input[formcontrolname="name"]')
    .fill(categoryName);
  await categoryForm
    .locator('select[formcontrolname="groupId"]')
    .selectOption({ label: groupName });
  await categoryForm.getByRole('button', { name: 'Create category' }).click();

  await expect(page.getByText(categoryName).first()).toBeVisible();
  await expect(page.getByText(groupName).first()).toBeVisible();

  await page.reload();
  await openSettingsPanel(page, 'Categories');
  await page.locator('#settings-category-search').fill(categoryName);
  await expect(page.getByText(categoryName).first()).toBeVisible();

  await page.getByRole('tab', { name: 'Category groups' }).click();
  await expect(
    page.locator('article').filter({ hasText: groupName })
  ).toBeVisible();
});
