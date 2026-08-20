import { expect, test } from '@playwright/test';
import { expectNoBlockingAxeViolations } from './a11y';

const ROUTES = [
  { path: '/', heading: /Public beta access for the Roster MCP server control plane/i },
  { path: '/getting-started', heading: /Sign in to continue setup/i },
  { path: '/library', heading: /Sign in to continue to prompt library/i },
  { path: '/library/new', heading: /Sign in to continue to prompt library/i },
  { path: '/agents', heading: /Sign in to continue to agent catalog/i },
  { path: '/agents/subagents/example-subagent', heading: /Sign in to continue to agent catalog/i },
  { path: '/runs', heading: /Sign in to continue to orchestration runs/i },
  { path: '/runs/example-run', heading: /Sign in to continue to orchestration runs/i },
  { path: '/integrations', heading: /Sign in to continue to integrations/i },
  { path: '/settings', heading: /Sign in to continue to settings/i },
] as const;

test.describe('Phase 3 accessibility', () => {
  for (const route of ROUTES) {
    test(`route ${route.path} has no critical or serious axe violations`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
      await expectNoBlockingAxeViolations(page);
    });
  }

  test('desktop overlays remain accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /open command palette/i }).click();
    await expect(page.getByRole('dialog', { name: /command palette/i })).toBeVisible();
    await expectNoBlockingAxeViolations(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /share beta feedback/i }).click();
    await expect(page.getByRole('dialog', { name: /beta feedback/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to send feedback/i })).toBeVisible();
    await expectNoBlockingAxeViolations(page);
  });

  test('mobile navigation drawer remains accessible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByRole('dialog', { name: /primary navigation/i })).toBeVisible();
    await expectNoBlockingAxeViolations(page);
  });

  test('public beta entry stays responsive on mobile and tablet', async ({ page }) => {
    const assertions = [
      { path: '/', heading: /Public beta access for the Roster MCP server control plane/i },
      { path: '/getting-started', heading: /Sign in to continue setup/i },
      { path: '/library', heading: /Sign in to continue to prompt library/i },
      { path: '/integrations', heading: /Sign in to continue to integrations/i },
    ];

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);

      for (const assertion of assertions) {
        await page.goto(assertion.path);
        await page.waitForLoadState('networkidle');
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: assertion.heading,
          }),
        ).toBeVisible();
        const hasHorizontalOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        expect(hasHorizontalOverflow).toBe(false);
      }
    }
  });
});
