import { expect, test } from '@playwright/test';
import { expectNoBlockingAxeViolations } from './a11y';

const CORE_ROUTES = [
  { path: '/', heading: /Turn waiting work into trusted team workflows/i },
  { path: '/getting-started', heading: /Your team’s best AI work, ready when you are/i },
  { path: '/library', heading: /Sign in to open your team’s Library/i },
  { path: '/library/new', heading: /Sign in to open your team’s Library/i },
  { path: '/my-work', heading: /Sign in to continue your saved work/i },
  { path: '/approvals', heading: /Sign in to review team work/i },
  { path: '/integrations', heading: /Sign in to open the Setup Center/i },
  { path: '/workspace-admin', heading: /Sign in to manage Library settings/i },
  { path: '/advanced', heading: /Legacy Advanced tools are unavailable/i },
] as const;

test.describe('Brand OS accessibility', () => {
  for (const route of CORE_ROUTES) {
    test(`route ${route.path} has no critical or serious axe violations`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible({
        timeout: 15_000,
      });
      await expectNoBlockingAxeViolations(page);
    });
  }

  test('the public first-use path is keyboard reachable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const firstUseLink = page.getByRole('link', { name: /see how governance works/i });
    await firstUseLink.focus();
    await expect(firstUseLink).toBeFocused();
    await expectNoBlockingAxeViolations(page);
    await firstUseLink.click();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Your team’s best AI work, ready when you are/i,
      }),
    ).toBeVisible();
  });

  test('core entry pages stay responsive on mobile and tablet', async ({ page }) => {
    const assertions = [
      { path: '/', heading: /Turn waiting work into trusted team workflows/i },
      { path: '/getting-started', heading: /Your team’s best AI work, ready when you are/i },
      { path: '/library', heading: /Sign in to open your team’s Library/i },
      { path: '/integrations', heading: /Sign in to open the Setup Center/i },
    ];

    for (const viewport of [
      { width: 320, height: 720 },
      { width: 768, height: 1024 },
      { width: 1024, height: 900 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);

      for (const assertion of assertions) {
        await page.goto(assertion.path, { waitUntil: 'domcontentloaded' });
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: assertion.heading,
          }),
        ).toBeVisible({ timeout: 15_000 });
        const hasHorizontalOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        expect(hasHorizontalOverflow).toBe(false);
      }
    }
  });
});
