import { expect, type Page } from '@playwright/test';

// E2E helpers ---------------------------------------------------------------

export const API = 'http://127.0.0.1:8787';
export const SPA = 'http://127.0.0.1:5173';

// Drive the REAL worker OAuth chain through a real browser, with ONLY the
// Google consent page faked. The SPA does the real DCR + PKCE (stores the
// verifier in sessionStorage); the worker's Google token/userinfo calls are
// stubbed in the harness via outboundService.
//
// Flow: SPA SIGN IN → /authorize (dialog) → POST approve → 302 to Google
//       → [we capture the 302 + state, then navigate to /callback ourselves]
//       → worker exchanges (fake Google) → 302 to SPA ?code= → SPA /token
//       → bt_oauth_token stored → authenticated.
export async function loginAs(page: Page, sub: string): Promise<string> {
  // 1. Landing → click real SIGN IN (SPA does DCR + PKCE, stores verifier).
  await page.goto(SPA);
  await page.getByRole('button', { name: /SIGN IN/i }).click();

  // 2. SPA redirects to worker /authorize → real approval dialog renders.
  await page.waitForURL((u) => u.origin === API && u.pathname === '/authorize');

  // Set up POST-response capture BEFORE clicking Approve.
  const postResponsePromise = page.waitForResponse(
    (r) => r.url().includes('/authorize') && r.request().method() === 'POST',
    { timeout: 30000 },
  );

  await page.getByRole('button', { name: 'Approve' }).click();

  // 3. Capture the POST /authorize 302 → extract the state token from the
  //    Google redirect Location header (this is the worker's state binding).
  const postResponse = await postResponsePromise;
  const location = postResponse.headers()['location'] || '';
  const gsMatch = location.match(/state=([^&]+)/);
  const googleState = gsMatch ? decodeURIComponent(gsMatch[1]) : '';
  if (!googleState) throw new Error('No state in redirect location');

  // 4. Navigate directly to /callback with our fake code + the real state.
  //    (The browser may have started navigating to the real Google page;
  //    page.goto interrupts it. The Google call itself is faked server-side
  //    via outboundService, so no real external interaction happens.)
  await page.goto(`${API}/callback?code=e2e-${sub}&state=${encodeURIComponent(googleState)}`);

  // 5. Worker exchanges with fake Google → completeAuthorization → 302 to SPA ?code=.
  await page.waitForURL((u) => u.origin === SPA, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // 6. SPA exchanges code at /token with the verifier IT stored → token.
  // NOTE: the SPA keeps the token in SESSION storage (bt_oauth_token), not
  // localStorage — poll sessionStorage.
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('bt_oauth_token')), { timeout: 15000 })
    .toBeTruthy();

  const token = await page.evaluate(() => sessionStorage.getItem('bt_oauth_token')) as string;
  return token;
}

/** Auto-accept window.confirm dialogs (Playwright dismisses them by default). */
export function acceptDialogs(page: Page): void {
  page.on('dialog', (dialog) => void dialog.accept());
}

/**
 * Dismiss the First-Run onboarding wizard.
 *
 * It appears for any fresh account on a protected route while
 * `localStorage.bt_first_run !== 'done'` and the account has no habits/tasks/
 * journal yet. It is unrelated to the notes feature under test, so the E2E
 * skips it deterministically: pre-set the flag (covers the common case where
 * the wizard has not mounted yet) AND click through the "Skip" path (covers
 * the case where it already rendered over the current route).
 */
export async function skipFirstRunWizard(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.setItem('bt_first_run', 'done'));

  const welcome = page.getByRole('heading', { name: 'Welcome to BakaTracker!' });
  if (!(await welcome.isVisible().catch(() => false))) return;

  await page.getByRole('button', { name: /Begin Setup/i }).click();
  await page.getByRole('button', { name: /Skip for now/i }).click();
  await page.getByRole('button', { name: /Skip for now/i }).click();
  await page.getByRole('button', { name: /Skip Tour, Start Tracking/i }).click();
}
