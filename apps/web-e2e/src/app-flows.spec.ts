import {
  expect,
  type Locator,
  type Page,
  test,
  type TestInfo,
} from '@playwright/test';

const DEFAULT_EMAIL = 'e2e-shared-user@gmail.com';
const DEFAULT_PASSWORD = 'Test1234!';
const DASHBOARD_HEADING = 'Your personalised command centre';

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
  const email = envValueOrDefault('E2E_AUTH_EMAIL', DEFAULT_EMAIL);
  const password = envValueOrDefault('E2E_AUTH_PASSWORD', DEFAULT_PASSWORD);

  await page.goto('/login');
  await fillStableInput(page.locator('#email'), email);
  await fillStableInput(page.locator('#password'), password);
  await page.getByRole('button', { name: 'Log in' }).click();

  try {
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: DASHBOARD_HEADING })
    ).toBeVisible({ timeout: 15000 });
  } catch (error) {
    const alerts = await page
      .locator('[role="alert"], .alert, .text-error')
      .allTextContents()
      .catch(() => []);
    throw new Error(
      `Login did not reach dashboard. Current URL: ${page.url()}. Alerts: ${
        alerts.join(' | ') || 'none'
      }. ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function fillStableInput(input: Locator, value: string): Promise<void> {
  await expect(input).toBeEditable({ timeout: 15000 });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await input.fill(value);
    await input.page().waitForTimeout(150);

    if ((await input.inputValue()) === value) {
      return;
    }
  }

  await expect(input).toHaveValue(value);
}

function envValueOrDefault(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    return fallback;
  }

  if (key.endsWith('_EMAIL') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return fallback;
  }

  return value;
}

async function selectFirstRealOption(select: Locator): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const value = await select.locator('option').evaluateAll((options) => {
      const option = options.find((element) => {
        const candidate = element as HTMLOptionElement;
        return !candidate.disabled && candidate.value.trim().length > 0;
      }) as HTMLOptionElement | undefined;

      return option?.value ?? '';
    });

    if (value) {
      await select.selectOption(value);
      return value;
    }

    await select.page().waitForTimeout(250);
  }

  throw new Error('Missing selectable option value.');
}

async function selectFirstTransactionCategory(page: Page): Promise<string> {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Category', exact: true }).click();

  const search = dialog.getByPlaceholder('Search categories...');
  await expect(search).toBeFocused();

  const option = dialog.getByRole('option').first();
  await expect(option).toBeVisible({ timeout: 15000 });
  const label = (await option.textContent())?.trim() ?? '';
  if (!label) {
    throw new Error('Missing selectable transaction category.');
  }

  await option.click();
  return label;
}

async function selectTransactionPlace(page: Page, name: string): Promise<void> {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Place', exact: true }).click();

  const search = dialog.getByPlaceholder('Search places...');
  await expect(search).toBeFocused();
  await search.fill(name);

  const option = dialog.getByRole('option').filter({ hasText: name }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
}

async function filterTransactionsByDate(
  page: Page,
  occurredOn: string
): Promise<void> {
  await page.getByLabel('Date from', { exact: true }).fill(occurredOn);
  await page.getByLabel('Date to', { exact: true }).fill(occurredOn);
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
  await openSettings(page);
  await page.getByRole('button', { name: new RegExp(`^${panel}\\b`) }).click();

  const heading = panel === 'Categories' ? 'Categories & groups' : panel;
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  if (panel === 'Categories') {
    await page.getByRole('tab', { name: 'Manage categories' }).click();
    await expect(page.locator('#settings-category-search')).toBeVisible({
      timeout: 15000,
    });
  } else {
    await expect(page.getByRole('button', { name: 'Add wallet' })).toBeVisible({
      timeout: 15000,
    });
  }
}

async function openDashboard(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(
    page.getByRole('heading', { name: DASHBOARD_HEADING })
  ).toBeVisible();
}

async function openTransactions(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Transactions' }).click();
  await expect(page).toHaveURL(/\/transactions$/, { timeout: 15000 });
  await expect(
    page.getByRole('heading', { name: 'Transactions', exact: true })
  ).toBeVisible();
}

async function openModule(
  page: Page,
  linkName: 'Places' | 'Recurring payments',
  heading: string
): Promise<void> {
  await page.getByRole('button', { name: 'Modules' }).click();
  await page.getByRole('link', { name: linkName }).click();
  await expect(page).toHaveURL(
    linkName === 'Places' ? /\/modules\/places$/ : /\/modules\/recurring-payments$/,
    { timeout: 15000 }
  );
  await expect(
    page.getByRole('heading', { name: heading, exact: true })
  ).toBeVisible();
}

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/, { timeout: 15000 });
}

function formWithHeading(page: Page, heading: string): Locator {
  return page
    .locator('form')
    .filter({ has: page.getByRole('heading', { name: heading }) })
    .first();
}

test('logs in with the shared e2e account', async ({ page }) => {
  await ensureAuthenticated(page);

  await expect(
    page.getByRole('heading', { name: DASHBOARD_HEADING })
  ).toBeVisible();
});

test('registers a new account and opens dashboard', async ({
  page,
}, testInfo) => {
  const suffix = uniqueSuffix(testInfo);
  const name = `Spendist User ${suffix}`;
  const email = `signup-${suffix}@gmail.com`;

  await page.goto('/signup');
  await fillStableInput(page.locator('#name'), name);
  await fillStableInput(page.locator('#email'), email);
  await fillStableInput(page.locator('#password'), DEFAULT_PASSWORD);
  await fillStableInput(page.locator('#confirmPassword'), DEFAULT_PASSWORD);
  await page.getByLabel('First wallet currency').selectOption({ label: 'PLN' });
  await page.getByRole('button', { name: 'Sign up' }).click();

  try {
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: DASHBOARD_HEADING })
    ).toBeVisible();
  } catch (error) {
    const alerts = await page
      .locator('[role="alert"], .alert, .text-error')
      .allTextContents()
      .catch(() => []);
    throw new Error(
      `Signup did not reach dashboard. Current URL: ${page.url()}. Alerts: ${
        alerts.join(' | ') || 'none'
      }. ${error instanceof Error ? error.message : String(error)}`
    );
  }

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
  await openTransactions(page);

  await page.getByRole('button', { name: 'Add transaction' }).click();
  await expect(
    page.getByRole('heading', { name: 'Add transaction' })
  ).toBeVisible();

  await page.locator('input[formcontrolname="description"]').fill(description);
  await selectFirstTransactionCategory(page);
  await page.locator('input[formcontrolname="amount"]').fill('12.50');
  await page.locator('select[formcontrolname="currency"]').selectOption('PLN');
  await page.getByRole('button', { name: 'Save transaction' }).click();

  await expect(
    page.getByRole('heading', { name: 'Add transaction' })
  ).toHaveCount(0);
  await expect(page.getByText(description)).toBeVisible();

  await page.reload();
  await openTransactions(page);
  await expect(page.getByText(description)).toBeVisible();
});

test('uses transaction quick-entry controls', async ({ page }, testInfo) => {
  const description = `E2E quick entry ${uniqueSuffix(testInfo)}`;

  await ensureAuthenticated(page);
  await openTransactions(page);
  await page.keyboard.press('n');

  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Add transaction' })
  ).toBeVisible();

  const descriptionInput = dialog.locator(
    'input[formcontrolname="description"]'
  );
  await expect(descriptionInput).toBeFocused();
  await descriptionInput.fill(description);

  const dateInput = dialog.locator('input[formcontrolname="occurredOn"]');
  await dateInput.fill('2026-06-01');
  await dialog.getByRole('button', { name: 'Set today' }).click();
  await expect(dateInput).toHaveValue(futureDateInput(0));

  await selectFirstTransactionCategory(page);
  await dialog.locator('input[formcontrolname="amount"]').fill('9.99');
  await dialog.getByRole('button', { name: 'Save and add another' }).click();

  await expect(
    dialog.getByRole('heading', { name: 'Add transaction' })
  ).toBeVisible();
  await expect(descriptionInput).toHaveValue('');
  await expect(dialog.locator('input[formcontrolname="amount"]')).toHaveValue(
    ''
  );
  await expect(descriptionInput).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.getByText(description)).toBeVisible();
});

test('creates place and assigns it to a transaction', async ({
  page,
}, testInfo) => {
  const suffix = uniqueSuffix(testInfo);
  const placeName = `E2E barber ${suffix}`;
  const description = `E2E haircut ${suffix}`;

  await ensureAuthenticated(page);
  await openModule(page, 'Places', 'Places');

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

  await openTransactions(page);
  await page.getByRole('button', { name: 'Add transaction' }).click();
  await page.locator('input[formcontrolname="description"]').fill(description);
  await selectFirstTransactionCategory(page);
  await selectTransactionPlace(page, placeName);
  await page.locator('input[formcontrolname="amount"]').fill('55');
  await page.getByRole('button', { name: 'Save transaction' }).click();

  const transactionRow = page.locator('li').filter({ hasText: description });
  await expect(transactionRow).toBeVisible();
  await expect(transactionRow).toContainText(placeName);

  await openDashboard(page);
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
  await openTransactions(page);
  await page.getByRole('button', { name: 'Add transaction' }).click();

  await page.locator('input[formcontrolname="description"]').fill(description);
  await page.locator('input[formcontrolname="occurredOn"]').fill('2026-05-29');
  const categoryLabel = await selectFirstTransactionCategory(page);
  await page.locator('input[formcontrolname="amount"]').fill('10');
  await page.locator('select[formcontrolname="currency"]').selectOption('USD');
  await page.getByRole('button', { name: 'Save transaction' }).click();
  await filterTransactionsByDate(page, '2026-05-29');
  await expect(page.getByText(description)).toBeVisible();

  const categoryFilter = page
    .locator('aside nav button')
    .filter({ hasText: categoryLabel });
  await expect(categoryFilter).toContainText(/36[,.]39/);

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
  await openTransactions(page);
  await filterTransactionsByDate(page, '2026-05-29');
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
  await openModule(page, 'Recurring payments', 'Active recurring payments');

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
  await openModule(page, 'Recurring payments', 'Active recurring payments');
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
