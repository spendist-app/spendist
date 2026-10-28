import { expect, type Locator } from '@playwright/test';

// Fills an input and repeats until the value sticks: hydration can replace a
// server-rendered field right after the first fill.
export async function fillStableInput(
  input: Locator,
  value: string
): Promise<void> {
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
