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

function previousMonthStartInput(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 10);
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

async function currencyAmount(locator: Locator): Promise<number> {
  const text = (await locator.textContent()) ?? '';
  const sign = text.includes('-') ? -1 : 1;
  const numericText = text.replace(/[^\d.,]/g, '');
  const decimalSeparatorIndex = Math.max(
    numericText.lastIndexOf(','),
    numericText.lastIndexOf('.')
  );

  if (decimalSeparatorIndex < 0) {
    return sign * Number(numericText);
  }

  const integerPart = numericText
    .slice(0, decimalSeparatorIndex)
    .replace(/[.,]/g, '');
  const fractionPart = numericText.slice(decimalSeparatorIndex + 1);
  return sign * Number(`${integerPart}.${fractionPart}`);
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

async function selectFirstCategoryOption(page: Page): Promise<string> {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Category', exact: true }).click();

  const search = dialog.getByPlaceholder('Search categories...');
  await expect(search).toBeFocused();

  const option = dialog.getByRole('option').first();
  await expect(option).toBeVisible({ timeout: 15000 });
  const label = (await option.textContent())?.trim() ?? '';
  if (!label) {
    throw new Error('Missing selectable category.');
  }

  await option.click();
  return label;
}

async function selectFirstTransactionCategory(page: Page): Promise<string> {
  return selectFirstCategoryOption(page);
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
  await filterTransactionsByRange(page, occurredOn, occurredOn);
}

async function expandAdvancedTransactionFilters(page: Page): Promise<void> {
  const toggle = page.getByTestId('transaction-advanced-filters-toggle');
  await expect(toggle).toBeVisible({ timeout: 15000 });

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

async function filterTransactionsByRange(
  page: Page,
  from: string,
  to: string
): Promise<void> {
  await expandAdvancedTransactionFilters(page);
  const fromInput = page.getByLabel('Date from', { exact: true });
  const toInput = page.getByLabel('Date to', { exact: true });

  await fromInput.fill(from);
  await toInput.fill(to);

  const summaryResponse = page.waitForResponse((response) => {
    if (!response.url().includes('/rpc/category_expense_summary')) {
      return false;
    }

    const body = response.request().postDataJSON() as {
      p_from?: string | null;
      p_to?: string | null;
    };
    return (
      body.p_from?.startsWith(from) === true &&
      body.p_to?.startsWith(to) === true
    );
  });

  await toInput.press('Tab');
  await summaryResponse;
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

async function expectDefaultCategoryGroups(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Category groups' }).click();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const groupsPanel = page.locator('#settings-categories-panel-groups');
    const essentials = groupsPanel.locator('article').filter({
      has: page.getByRole('heading', { name: 'Essentials', exact: true }),
    });
    const income = groupsPanel.locator('article').filter({
      has: page.getByRole('heading', { name: 'Income', exact: true }),
    });

    try {
      await expect(essentials).toBeVisible({ timeout: 3000 });
      await expect(income).toBeVisible({ timeout: 3000 });
      return;
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }

      await page.reload();
      await openSettingsPanel(page, 'Categories');
      await page.getByRole('tab', { name: 'Category groups' }).click();
    }
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

async function openTransactionCreateForm(page: Page): Promise<void> {
  await page.getByTestId('transaction-add-menu-trigger').click();
  await page
    .getByRole('menu')
    .getByRole('menuitem', { name: 'Add transaction' })
    .click();
}

async function openModule(
  page: Page,
  linkName: 'Places' | 'Recurring payments',
  heading: string
): Promise<void> {
  await page.getByRole('button', { name: 'Modules' }).click();
  await page.getByRole('link', { name: linkName }).click();
  await expect(page).toHaveURL(
    linkName === 'Places'
      ? /\/modules\/places$/
      : /\/modules\/recurring-payments$/,
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

test('signs out and blocks protected routes afterwards', async ({ page }) => {
  await ensureAuthenticated(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
});

test('shows password change validation in settings', async ({ page }) => {
  await ensureAuthenticated(page);
  await openSettings(page);

  await page.getByRole('button', { name: 'Security options' }).click();

  await expect(page.getByRole('heading', { name: 'Password' })).toBeVisible();
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Current password is required.')).toBeVisible();

  await fillStableInput(page.locator('#current-password'), DEFAULT_PASSWORD);
  await fillStableInput(page.locator('#new-password'), 'Next1234');
  await fillStableInput(page.locator('#confirm-new-password'), 'Different123');

  await page.getByRole('button', { name: 'Change password' }).click();

  await expect(page.getByText('Passwords must match.')).toBeVisible();
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

  await expectDefaultCategoryGroups(page);

  await page.getByRole('button', { name: /^Profile\b/ }).click();
  await page.getByRole('button', { name: 'Security options' }).click();
  await page.getByRole('button', { name: 'Delete my account' }).click();

  await fillStableInput(
    page.locator('#delete-account-password'),
    DEFAULT_PASSWORD
  );
  await fillStableInput(
    page.locator('#delete-account-confirmation'),
    'DELETE'
  );
  await page
    .getByLabel(
      'I understand that my account and all of its data will be permanently deleted.'
    )
    .check();
  await page
    .getByRole('button', { name: 'Permanently delete account' })
    .click();

  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

  await page.getByRole('link', { name: 'Log in' }).click();
  await fillStableInput(page.locator('#email'), email);
  await fillStableInput(page.locator('#password'), DEFAULT_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toBeVisible();
});

test('adds transaction and keeps it after reload', async ({
  page,
}, testInfo) => {
  const description = `E2E coffee ${uniqueSuffix(testInfo)}`;

  await ensureAuthenticated(page);
  await openTransactions(page);

  await openTransactionCreateForm(page);
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

test('exposes bulk entry and applies year, month, and amount sorting', async ({
  page,
}, testInfo) => {
  const suffix = uniqueSuffix(testInfo);
  const lowerAmountDescription = `E2E lower amount ${suffix}`;
  const higherAmountDescription = `E2E higher amount ${suffix}`;

  await ensureAuthenticated(page);
  await openTransactions(page);

  const addTrigger = page.getByTestId('transaction-add-menu-trigger');
  await addTrigger.hover();
  const bulkAction = page.getByRole('menuitem', { name: 'Add in bulk' });
  await expect(bulkAction).toBeVisible();
  await bulkAction.click();
  const bulkDialog = page.getByRole('dialog');
  await expect(
    bulkDialog.getByRole('heading', { name: 'Add transactions in bulk' })
  ).toBeVisible();

  const firstDateInput = bulkDialog.locator('input[type="date"]').first();
  await expect(firstDateInput).toBeVisible();
  expect(
    (await firstDateInput.boundingBox())?.width ?? 0
  ).toBeGreaterThanOrEqual(128);

  const firstCopyMenu = bulkDialog.locator('details').first();
  await firstCopyMenu.locator('summary').click();
  await expect(firstCopyMenu).toHaveAttribute('open', '');
  await firstCopyMenu.getByRole('button', { name: 'Fill rows below' }).click();
  await expect(firstCopyMenu).not.toHaveAttribute('open', '');

  await bulkDialog
    .getByRole('button', { name: 'Category', exact: true })
    .first()
    .click();
  const categorySearch = bulkDialog.getByPlaceholder('Search categories...');
  await expect(categorySearch).toBeVisible();
  await expect
    .poll(() =>
      categorySearch.evaluate(
        (element) => getComputedStyle(element.parentElement!).position
      )
    )
    .toBe('absolute');

  await page.evaluate(() => {
    const clipboardData = new DataTransfer();
    clipboardData.setData(
      'text/plain',
      '2026-07-10\tPasted with Ctrl+V\t25.50\tPLN\tGroceries\tclipboard\t\t1'
    );
    document.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, clipboardData })
    );
  });
  await expect(
    bulkDialog.locator('input[placeholder="Description"]').first()
  ).toHaveValue('Pasted with Ctrl+V');

  await bulkDialog.getByRole('button', { name: 'Cancel' }).click();

  for (const transaction of [
    { description: lowerAmountDescription, amount: '10' },
    { description: higherAmountDescription, amount: '90' },
  ]) {
    await openTransactionCreateForm(page);
    const dialog = page.getByRole('dialog');
    await dialog
      .locator('input[formcontrolname="description"]')
      .fill(transaction.description);
    await dialog
      .locator('input[formcontrolname="occurredOn"]')
      .fill('2026-07-10');
    await selectFirstTransactionCategory(page);
    await dialog
      .locator('input[formcontrolname="amount"]')
      .fill(transaction.amount);
    await dialog
      .locator('select[formcontrolname="currency"]')
      .selectOption('PLN');
    await dialog.getByRole('button', { name: 'Save transaction' }).click();
    await expect(page.getByText(transaction.description)).toBeVisible();
  }

  await expandAdvancedTransactionFilters(page);
  const year = page.getByTestId('transaction-year-filter');
  const month = page.getByTestId('transaction-month-filter');
  await year.selectOption('2026');
  await expect(month).toBeEnabled();
  await expect(month.locator('option')).toHaveCount(13);
  await expect(page.getByLabel('Date from', { exact: true })).toHaveValue(
    '2026-01-01'
  );
  await expect(page.getByLabel('Date to', { exact: true })).toHaveValue(
    '2026-12-31'
  );

  await month.selectOption('6');
  await expect(page.getByLabel('Date from', { exact: true })).toHaveValue(
    '2026-07-01'
  );
  await expect(page.getByLabel('Date to', { exact: true })).toHaveValue(
    '2026-07-31'
  );

  await page.getByTestId('transaction-sort-filter').selectOption('amountDesc');
  const rows = page
    .locator('#transactions-results ul > li')
    .filter({ hasText: suffix });
  await expect(rows.nth(1)).toBeVisible({ timeout: 15000 });
  await expect(rows.nth(0)).toContainText(higherAmountDescription);
  await expect(rows.nth(1)).toContainText(lowerAmountDescription);
});

test('filters categories from the sidebar with group checkboxes', async ({
  page,
}) => {
  await ensureAuthenticated(page);
  await openTransactions(page);

  await expect(page.getByTestId('transaction-category-filter')).toHaveCount(0);
  await expect(page.getByTestId('category-filter-checkbox')).toHaveCount(0);

  await page.getByTestId('category-filter-mode-toggle').check();

  const firstGroup = page
    .locator('nav section')
    .filter({
      has: page.getByTestId('category-group-filter-checkbox'),
    })
    .first();
  const groupCheckbox = firstGroup.getByTestId(
    'category-group-filter-checkbox'
  );
  const categoryCheckboxes = firstGroup.getByTestId('category-filter-checkbox');

  await expect(groupCheckbox).toBeVisible();
  await expect(categoryCheckboxes.first()).toBeVisible();
  await groupCheckbox.check();
  await expect(groupCheckbox).toBeChecked();

  for (const categoryCheckbox of await categoryCheckboxes.all()) {
    await expect(categoryCheckbox).toBeChecked();
  }

  await page.getByTestId('category-filter-clear-all').click();
  await expect(groupCheckbox).not.toBeChecked();
  await expect(categoryCheckboxes.first()).not.toBeChecked();

  await page.getByTestId('category-filter-select-all').click();
  await expect(groupCheckbox).toBeChecked();
  await expect(categoryCheckboxes.first()).toBeChecked();
});

test('shows transaction tags on the dashboard', async ({ page }, testInfo) => {
  const suffix = uniqueSuffix(testInfo);
  const description = `E2E tagged expense ${suffix}`;
  const tagName = `e2e-tag-${suffix}`;

  await ensureAuthenticated(page);
  await openTransactions(page);

  await openTransactionCreateForm(page);
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Add transaction' })
  ).toBeVisible();

  await dialog
    .locator('input[formcontrolname="description"]')
    .fill(description);
  await selectFirstTransactionCategory(page);
  await dialog.locator('input[formcontrolname="amount"]').fill('42.24');
  await dialog
    .locator('select[formcontrolname="currency"]')
    .selectOption('PLN');
  await dialog.getByLabel('Tags').fill(tagName);
  await dialog.getByLabel('Tags').press('Enter');
  await expect(
    dialog.locator('.badge').filter({ hasText: tagName })
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Save transaction' }).click();

  await expect(
    dialog.getByRole('heading', { name: 'Add transaction' })
  ).toHaveCount(0);
  await expect(page.getByText(description)).toBeVisible();

  await openDashboard(page);
  const expenseTagsCard = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Expense tags' }) });
  await expect(expenseTagsCard).toBeVisible({ timeout: 15000 });
  await expect(expenseTagsCard).toContainText(tagName, { timeout: 15000 });
  await expect(expenseTagsCard).toContainText('42.24');
});

test('filters transactions from the sidebar tags tab', async ({
  page,
}, testInfo) => {
  const suffix = uniqueSuffix(testInfo);
  const currentDescription = `E2E current tagged expense ${suffix}`;
  const previousDescription = `E2E previous tagged expense ${suffix}`;
  const currentTagName = `e2e-current-tag-${suffix}`;
  const previousTagName = `e2e-previous-tag-${suffix}`;

  await ensureAuthenticated(page);
  await openTransactions(page);

  await openTransactionCreateForm(page);
  let dialog = page.getByRole('dialog');
  await dialog
    .locator('input[formcontrolname="description"]')
    .fill(currentDescription);
  await selectFirstTransactionCategory(page);
  await dialog.locator('input[formcontrolname="amount"]').fill('11.11');
  await dialog
    .locator('select[formcontrolname="currency"]')
    .selectOption('PLN');
  await dialog.getByLabel('Tags').fill(currentTagName);
  await dialog.getByLabel('Tags').press('Enter');
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page.getByText(currentDescription)).toBeVisible();

  await openTransactionCreateForm(page);
  dialog = page.getByRole('dialog');
  await dialog
    .locator('input[formcontrolname="description"]')
    .fill(previousDescription);
  await dialog
    .locator('input[formcontrolname="occurredOn"]')
    .fill(previousMonthStartInput());
  await selectFirstTransactionCategory(page);
  await dialog.locator('input[formcontrolname="amount"]').fill('22.22');
  await dialog
    .locator('select[formcontrolname="currency"]')
    .selectOption('PLN');
  await dialog.getByLabel('Tags').fill(previousTagName);
  await dialog.getByLabel('Tags').press('Enter');
  await dialog.getByRole('button', { name: 'Save transaction' }).click();

  const sidebar = page.locator('aside');
  await sidebar.getByRole('tab', { name: 'Tags' }).click();
  await expect(sidebar.getByRole('button', { name: /All tags/ })).toBeVisible();
  await expect(sidebar).toContainText(currentTagName, { timeout: 15000 });
  await expect(sidebar).not.toContainText(previousTagName);

  await sidebar
    .getByRole('button', { name: new RegExp(currentTagName) })
    .click();
  await expect(page.getByText(currentDescription)).toBeVisible();
  await expect(page.getByText(previousDescription)).toHaveCount(0);
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

  await expect(
    page.locator('article').filter({ hasText: placeName })
  ).toBeVisible();
  await expect(page.getByText('Zebrzydowice').first()).toBeVisible();

  await openTransactions(page);
  await openTransactionCreateForm(page);
  await page.locator('input[formcontrolname="description"]').fill(description);
  await selectFirstTransactionCategory(page);
  await selectTransactionPlace(page, placeName);
  await page.locator('input[formcontrolname="amount"]').fill('55');
  await page.getByRole('button', { name: 'Save transaction' }).click();

  const transactionRow = page.locator('li').filter({ hasText: description });
  await expect(transactionRow).toBeVisible();
  await expect(transactionRow).toContainText(placeName);

  await openDashboard(page);
  await expect(
    page.getByRole('heading', { name: 'Spending by place' })
  ).toBeVisible();
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
  await filterTransactionsByDate(page, '2026-05-29');
  await openTransactionCreateForm(page);

  await page.locator('input[formcontrolname="description"]').fill(description);
  await page.locator('input[formcontrolname="occurredOn"]').fill('2026-05-29');
  const categoryLabel = await selectFirstTransactionCategory(page);
  const categoryFilter = page
    .getByTestId('category-filter-row')
    .filter({ hasText: categoryLabel });
  const categoryAmount = categoryFilter.locator('span').last();
  const categoryTotalBefore = Math.abs(await currencyAmount(categoryAmount));

  await page.locator('input[formcontrolname="amount"]').fill('10');
  await page.locator('select[formcontrolname="currency"]').selectOption('USD');
  await page.getByRole('button', { name: 'Show advanced fields' }).click();
  const initialDefaultAmount = page.locator(
    'input[formcontrolname="foreignAmount"]'
  );
  await expect.poll(() => initialDefaultAmount.inputValue()).toBe('36.39');
  await page.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page.getByText(description)).toBeVisible();

  await expect
    .poll(
      async () =>
        Math.abs(await currencyAmount(categoryAmount)) - categoryTotalBefore
    )
    .toBeCloseTo(36.39, 2);

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
  await selectFirstCategoryOption(page);
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

test('backfills transactions for a recurring payment started in the past', async ({
  page,
}, testInfo) => {
  const name = `E2E recurring history ${uniqueSuffix(testInfo)}`;
  const startDate = previousMonthStartInput();
  const today = futureDateInput(0);

  await ensureAuthenticated(page);
  await openModule(page, 'Recurring payments', 'Active recurring payments');
  await page
    .getByRole('button', { name: /Add recurring/i })
    .last()
    .click();

  await page.locator('#recurring-name').fill(name);
  await selectFirstCategoryOption(page);
  await selectFirstRealOption(page.locator('#recurring-wallet'));
  await page.locator('#recurring-amount').fill('12');
  await page.locator('select[formcontrolname="currency"]').selectOption('PLN');
  await page.locator('#recurring-schedule-frequency').selectOption('monthly');
  await page.locator('input[formcontrolname="scheduleDayOfMonth"]').fill('1');
  await page.locator('#recurring-start-date').fill(startDate);

  const backfillResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/functions/v1/process-recurring-payments') &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Save recurring payment' }).click();

  const response = await backfillResponse;
  const responseBody = await response.text();
  expect(
    response.ok(),
    `Backfill failed with HTTP ${response.status()}: ${responseBody}`
  ).toBe(true);
  const result = JSON.parse(responseBody) as {
    processedCount?: number;
    skippedCount?: number;
  };
  expect(result.skippedCount).toBe(0);
  expect(result.processedCount).toBeGreaterThanOrEqual(2);
  await expect(
    page.getByRole('heading', { name: 'Schedule a recurring payment' })
  ).toHaveCount(0);

  await openTransactions(page);
  await filterTransactionsByRange(page, startDate, today);
  await expect(
    page
      .locator('#transactions-results > ul > li')
      .filter({ hasText: name })
  ).toHaveCount(2);
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
  await page.getByRole('button', { name: 'Add category', exact: true }).click();

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
