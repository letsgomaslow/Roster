import { expect, test } from '@playwright/test';

test.describe('Phase 1 dashboard (no BFF auth)', () => {
  test('home HTML includes dashboard shell (SSR / RSC payload)', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toMatch(/text\/html/i);
    const body = await res.text();
    expect(body).toMatch(/Roster Control Plane|Roster/);
    expect(body).toMatch(/Private beta control plane/i);
    expect(body).toMatch(/Integration readiness/i);
    expect(body).toMatch(/Workspace activity/i);
    expect(body).toMatch(/Skip to main content/i);
  });

  test('BFF health route returns JSON', async ({ request }) => {
    const res = await request.get('/api/roster/health');
    expect(res.headers()['content-type']).toMatch(/application\/json/);
    const json = (await res.json()) as { error?: string; rosterStatus?: number; success?: boolean };
    expect(json).toBeTruthy();
    // 503 if ROSTER_HTTP_URL unset in dev server env; 502 if unreachable; 200 if OK
    expect([200, 502, 503]).toContain(res.status());
  });

  test('shell exposes accessible navigation and landmark hooks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
    await expect(page.getByRole('main')).toHaveAttribute('id', 'main-content');
    await expect(
      page.getByRole('navigation', { name: /primary/i }).getByRole('link', { name: 'Home Overview' }),
    ).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: /Open command palette/i }).click();
    await expect(page.getByRole('dialog', { name: /Command palette/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /Command palette/i })).toBeHidden();
  });
});
