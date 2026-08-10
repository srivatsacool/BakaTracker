import { defineConfig, devices } from '@playwright/test';

// BakaTracker Browser E2E (phase3-plan.md step 7).
//
// Stack (only Google's external OAuth endpoints are faked):
//   - platform/scripts/e2e-worker.mjs → REAL worker on http://127.0.0.1:8787
//     (Miniflare direct boot from wrangler.jsonc; .dev.vars injected;
//     Google token+userinfo stubbed via outboundService `google-mock`).
//   - Vite dev server on http://127.0.0.1:5173 → REAL React SPA.
//   - Chromium drives the real UI through the real OAuth chain
//     (DCR → PKCE → approval dialog → callback → /token → whoami → REST).
//
// `TEST_LOCAL=1` is injected by the harness so the `__Host-` cookie names/Secure
// flag relax to plain names over HTTP loopback (same opt-in style as REST_DEV_BYPASS).
//
// Run:  npx playwright test --config=e2e/playwright.config.ts
export default defineConfig({
  testDir: '.',
  // Vite cold-starts on the first page load (full dep transform can exceed 30s
  // on a fresh dev server) — give the first navigation real headroom. The test
  // timeout alone is not enough: page.goto uses the navigation timeout, which
  // defaults to 30s. Both are raised so a cold Vite serve cannot flake the
  // first test (it passed on retry in bring-up, but must pass on first try).
  timeout: 120_000,
  retries: process.env.CI ? 2 : 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    navigationTimeout: 90_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  // Serial: one shared worker DB per suite run (deterministic isolation).
  fullyParallel: false,
  workers: 1,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: process.env.CI
    ? [['list']]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  // Auto-start both local services (reuse if already running).
  webServer: [
    {
      command: 'node scripts/e2e-worker.mjs',
      cwd: '../platform',
      port: 8787,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npx vite --host 127.0.0.1',
      cwd: '..',
      port: 5173,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:8787',
        VITE_GOOGLE_CLIENT_ID: 'e2e-browser-test.apps.googleusercontent.com',
      },
    },
  ],
});