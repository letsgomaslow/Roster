import fs from 'node:fs';

import { expect, test } from '@playwright/test';

import { e2eBaseURL } from './helpers';

const authGateOn =
  process.env.ROSTER_BFF_REQUIRE_AUTH === 'true' || process.env.ROSTER_BFF_REQUIRE_AUTH === '1';

/**
 * Run with auth gate enabled on the Next dev server, e.g.:
 *   ROSTER_BFF_REQUIRE_AUTH=true ROSTER_HTTP_URL=http://127.0.0.1:9 pnpm exec playwright test e2e/phase2-bff-auth.spec.ts
 *
 * 401 tests use a fresh API context (no cookies) so they stay valid even if `E2E_STORAGE_STATE` is set.
 *
 * Signed-in 200 check: sign in once in a browser, then:
 *   npx playwright codegen http://127.0.0.1:3100 --save-storage=e2e/storage/clerk.json
 *   ROSTER_BFF_REQUIRE_AUTH=true E2E_STORAGE_STATE=e2e/storage/clerk.json pnpm run test:e2e:auth
 */
test.describe('Phase 2 BFF auth gate', () => {
  test('GET /api/roster/prompts returns 401 without session', async ({ playwright }) => {
    test.skip(!authGateOn, 'Set ROSTER_BFF_REQUIRE_AUTH=true for this test');
    const ctx = await playwright.request.newContext({ baseURL: e2eBaseURL() });
    try {
      const res = await ctx.get('/api/roster/prompts');
      expect(res.status()).toBe(401);
      const json = (await res.json()) as { error?: string };
      expect(json.error).toMatch(/Unauthorized/i);
    } finally {
      await ctx.dispose();
    }
  });

  test('GET /api/roster/health returns 401 without session', async ({ playwright }) => {
    test.skip(!authGateOn, 'Set ROSTER_BFF_REQUIRE_AUTH=true for this test');
    const ctx = await playwright.request.newContext({ baseURL: e2eBaseURL() });
    try {
      const res = await ctx.get('/api/roster/health');
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });

  test('GET /api/roster/prompts returns 200 when Clerk session present (storageState)', async ({
    request,
  }) => {
    test.skip(!authGateOn, 'Set ROSTER_BFF_REQUIRE_AUTH=true for this test');
    const storagePath = process.env.E2E_STORAGE_STATE;
    test.skip(!storagePath, 'Set E2E_STORAGE_STATE to Playwright storage JSON path');
    if (!storagePath) return;
    test.skip(!fs.existsSync(storagePath), `E2E_STORAGE_STATE file missing: ${storagePath}`);
    const res = await request.get('/api/roster/prompts');
    expect(res.status()).toBe(200);
    const json = (await res.json()) as { data?: unknown };
    expect(json).toBeTruthy();
  });
});
