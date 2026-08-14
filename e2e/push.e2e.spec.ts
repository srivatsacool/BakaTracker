import { test, expect } from '@playwright/test';
import { SPA, loginAs, acceptDialogs, skipFirstRunWizard } from './helpers';

test.describe('Browser E2E [push settings]', () => {
  test('settings modal shows push toggle when authenticated', async ({ page }) => {
    acceptDialogs(page);
    const token = await loginAs(page, `e2e-push-${Date.now()}`);
    await skipFirstRunWizard(page);

    await page.goto(SPA);

    // Open settings modal via the sidebar settings button.
    const settingsBtn = page.getByRole('button', { name: /Settings/i });
    await settingsBtn.click();

    // The modal should appear with the push toggle section.
    await expect(page.getByText('Push Notifications')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Receive proactive reminders from BakaSur')).toBeVisible();

    // Status badge should show initial state.
    await expect(page.getByText('Off').or(page.getByText('Active')).first()).toBeVisible();

    // Enable/Disable button should be present.
    const toggleBtn = page.getByRole('button', { name: /Enable Push|Disable Push/ });
    await expect(toggleBtn).toBeVisible();

    // Click enable — in dev context, push may not be available (no service
    // worker registration on HTTP), so we accept either success or a graceful
    // error message via the alert() call.
    await toggleBtn.click();

    // Wait for the action to complete (button returns from disabled state).
    await expect(toggleBtn).not.toBeDisabled({ timeout: 15000 });
  });
});
