import { expect, test } from '@playwright/test';

test.describe('AI Work Library public entry', () => {
  test('home HTML explains the library value (SSR / RSC payload)', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toMatch(/text\/html/i);
    const body = await res.text();
    expect(body).toMatch(/Roster · AI Work Library/i);
    expect(body).toMatch(/Save reusable work once/i);
    expect(body).toMatch(/Open export and MCP retrieval on every plan/i);
    expect(body).toMatch(/Skip to main content/i);
  });

  test('BFF health route returns JSON', async ({ request }) => {
    const res = await request.get('/api/roster/health');
    expect(res.headers()['content-type']).toMatch(/application\/json/);
    const json = (await res.json()) as { error?: string; rosterStatus?: number; success?: boolean };
    expect(json).toBeTruthy();
    // Signed-out callers may be rejected before the route checks the Roster host.
    expect([200, 401, 502, 503]).toContain(res.status());
  });

  test('shell exposes accessible landmark hooks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
    await expect(page.getByRole('main')).toHaveAttribute('id', 'main-content');
    await expect(
      page.getByRole('heading', { name: /Save reusable work once/i, level: 1 }),
    ).toBeVisible();
  });
});
