import { expect, test } from '@playwright/test';
import { expectNoBlockingAxeViolations } from './a11y';

const ROUTES = [
  { path: '/', heading: /Private beta control plane for the Roster MCP server/i },
  { path: '/library', heading: /Prompt search, filtering, and beta-ready editing/i },
  { path: '/library/new', heading: /New prompt/i },
  { path: '/agents', heading: /Subagents and main agents in one navigation path/i },
  { path: '/agents/subagents/example-subagent', heading: /example-subagent/i },
  { path: '/runs', heading: /Execution history, status, and report entry points/i },
  { path: '/runs/example-run', heading: /example-run/i },
  { path: '/integrations', heading: /Claude Desktop, Cursor, and generic MCP onboarding/i },
  { path: '/settings', heading: /Usage, plan visibility, and feedback history/i },
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
    await page.getByRole('button', { name: /open command palette/i }).click();
    await expect(page.getByRole('dialog', { name: /command palette/i })).toBeVisible();
    await expectNoBlockingAxeViolations(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /share beta feedback/i }).click();
    await expect(page.getByRole('dialog', { name: /beta feedback/i })).toBeVisible();
    await expect(page.getByLabel(/what happened\?/i)).toBeVisible();
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
});
