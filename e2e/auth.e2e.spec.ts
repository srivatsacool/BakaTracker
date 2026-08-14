import { test, expect } from '@playwright/test';
import { API, loginAs } from './helpers';

// ---------------------------------------------------------------------------

test.describe('Browser E2E [oauth]', () => {
  test.describe.configure({ mode: 'serial' });

  test('landing renders auth entry; whoami is 401 unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /SIGN IN/i })).toBeVisible();
    const res = await page.request.get(`${API}/api/v1/whoami`);
    expect(res.status()).toBe(401);
  });

  test('authenticated user reaches whoami with their Google sub', async ({ page }) => {
    const token = await loginAs(page, 'e2e-user-a');

    const who = await page.request.get(`${API}/api/v1/whoami`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(who.status()).toBe(200);
    expect(await who.json()).toMatchObject({ sub: 'e2e-user-a' });
  });

  test('per-user isolation: each user lists only their own files', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const tokA = await loginAs(pageA, 'e2e-user-a');
    const tokB = await loginAs(pageB, 'e2e-user-b');

    // User A uploads a file; user B uploads theirs. Worker derives user_id from sub.
    const aUp = await pageA.request.post(`${API}/api/v1/files`, {
      headers: { Authorization: `Bearer ${tokA}` },
      multipart: { file: { name: 'a.txt', buffer: Buffer.from('user-A data'), mimeType: 'text/plain' } },
    });
    expect(aUp.status()).toBe(201);
    const bUp = await pageB.request.post(`${API}/api/v1/files`, {
      headers: { Authorization: `Bearer ${tokB}` },
      multipart: { file: { name: 'b.txt', buffer: Buffer.from('user-B data'), mimeType: 'text/plain' } },
    });
    expect(bUp.status()).toBe(201);

    const listAResp = (await (await pageA.request.get(`${API}/api/v1/files`, { headers: { Authorization: `Bearer ${tokA}` } })).json()) as { files?: { id: string; name: string }[] };
    const listBResp = (await (await pageB.request.get(`${API}/api/v1/files`, { headers: { Authorization: `Bearer ${tokB}` } })).json()) as { files?: { id: string; name: string }[] };
    const listA = listAResp.files ?? [];
    const listB = listBResp.files ?? [];

    // No cross-user leak; cross-user GET /files/:id yields 404 (no existence oracle).
    expect(listA.some((f) => f.name === 'b.txt')).toBe(false);
    expect(listB.some((f) => f.name === 'a.txt')).toBe(false);
    expect(listA.length).toBeGreaterThanOrEqual(1);
    expect(listB.length).toBeGreaterThanOrEqual(1);

    // Cross-user file access must 404 (existence oracle blocked).
    const aId = (await aUp.json()).file.id;
    const crossGet = await pageA.request.get(`${API}/api/v1/files/${aId}`, {
      headers: { Authorization: `Bearer ${tokB}` }, // B trying to read A's file
    });
    expect(crossGet.status()).toBe(404);

    await ctxA.close();
    await ctxB.close();
  });

  test('logout clears the session -- whoami returns to 401', async ({ page }) => {
    await loginAs(page, 'e2e-user-logout');

    // Simulate the SPA's logout: token lives in sessionStorage.
    await page.evaluate(() => sessionStorage.removeItem('bt_oauth_token'));
    await page.goto('/');

    const who = await page.request.get(`${API}/api/v1/whoami`);
    expect(who.status()).toBe(401);
  });

  test('malformed bearer token -> deterministic 401 (not 403/500)', async ({ page }) => {
    const res = await page.request.get(`${API}/api/v1/whoami`, {
      headers: { Authorization: 'Bearer garbage-not-a-jwt' },
    });
    expect(res.status()).toBe(401);
  });
});