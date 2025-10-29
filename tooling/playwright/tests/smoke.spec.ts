import { expect, test } from '@playwright/test';

test('placeholder smoke test loads blank page', async ({ page }) => {
  await page.goto('about:blank');
  await expect(page).toBeDefined();
});
