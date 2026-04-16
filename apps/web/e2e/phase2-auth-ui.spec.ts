import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test.describe('Auth UI and onboarding entry', () => {
  test('signed-out home falls back cleanly when Clerk JS fails to load', async ({ page }) => {
    await page.route('**/npm/@clerk/clerk-js@*/dist/clerk.browser.js*', (route) => route.abort());

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /public beta access for the roster mcp server control plane/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: /authentication temporarily unavailable/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to beta/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /reload and retry/i })).toBeVisible();
  });

  test('signed-out home exposes the beta auth entry points', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /public beta access for the roster mcp server control plane/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to beta/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create beta account/i })).toBeVisible();
  });

  test('signed-out getting-started explains the setup gate', async ({ page }) => {
    await page.goto('/getting-started');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1, name: /sign in to continue setup/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to continue/i })).toBeVisible();
  });

  test('getting-started never renders the authenticated checklist when Clerk JS fails to load', async ({
    page,
  }) => {
    await page.route('**/npm/@clerk/clerk-js@*/dist/clerk.browser.js*', (route) => route.abort());

    await page.goto('/getting-started');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /hosted auth needs attention before setup can continue/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to continue/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /reload and retry/i })).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /finish setup before the dashboard takes over/i,
      }),
    ).toHaveCount(0);
  });

  test('signed-in users land on the onboarding checklist when storage state is present', async ({
    page,
  }) => {
    const storagePath = process.env.E2E_STORAGE_STATE;
    test.skip(!storagePath, 'Set E2E_STORAGE_STATE to verify the authenticated onboarding route');
    test.skip(!storagePath || !fs.existsSync(storagePath), 'Storage state file missing');

    await page.goto('/getting-started');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /finish setup before the dashboard takes over/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /open integrations/i })).toBeVisible();
  });
});
