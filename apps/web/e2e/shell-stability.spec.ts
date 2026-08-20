import { expect, test } from '@playwright/test';

test.describe('stable application shell motion', () => {
  test('does not animate the entire route when content appears', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    const routeContent = page.locator('main > div').first();
    await expect(routeContent).toBeVisible();
    await expect
      .poll(() => routeContent.evaluate((element) => getComputedStyle(element).animationName))
      .toBe('none');
  });

  test('keeps loading placeholders still instead of shimmering', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const animationName = await page.evaluate(() => {
      const placeholder = document.createElement('div');
      placeholder.className = 'animate-pulse';
      document.body.append(placeholder);
      return getComputedStyle(placeholder).animationName;
    });

    expect(animationName).toBe('none');
  });

  test('keeps the signed-out mobile header compact', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const header = page.getByRole('banner');
    await expect(header).toBeVisible();
    const box = await header.boundingBox();
    expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(100);
    await expect(page.getByRole('button', { name: 'Share feedback' })).toBeHidden();
  });
});
