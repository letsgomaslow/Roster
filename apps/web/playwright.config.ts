import fs from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

// Chromium can hit net::ERR_NAME_NOT_RESOLVED for localhost if system proxy env breaks loopback.
for (const k of [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'http_proxy',
  'https_proxy',
  'ALL_PROXY',
  'all_proxy',
]) {
  delete process.env[k];
}

const port = process.env.PW_PORT ?? '3100';
const baseURL = `http://127.0.0.1:${port}`;
const storagePath = process.env.E2E_STORAGE_STATE;
const storageState = storagePath && fs.existsSync(storagePath) ? storagePath : undefined;
const skipWebServer = process.env.PW_SKIP_WEB_SERVER === '1';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...(storageState ? { storageState } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: `pnpm exec next dev --webpack -p ${port}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
