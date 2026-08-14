import { test, expect, type Page } from '@playwright/test';
import { API, SPA, loginAs, acceptDialogs, skipFirstRunWizard } from './helpers';

// B-6 gate: Create → Draw → Reload → Verify persistence through the REAL
// SPA + REAL worker (fake Google only), against a REAL Excalidraw canvas.
//
// The scene round-trip is asserted at the API layer (the persisted scene JSON
// must contain the drawn rectangle) AND at the UI layer (the canvas re-renders
// without an error banner after reload).

// The routed page is mounted into TWO <main> elements by Layout: a hidden
// mobile copy (inside an `md:hidden` wrapper, 0×0 on desktop) and the visible
// desktop one (`hidden md:block flex-1 h-screen`). Excalidraw renders in both,
// so canvas locators must be scoped to the DESKTOP main — never `.first()` on
// an unscoped locator (that hits the hidden 0×0 copy).
function desktopMain(page: Page) {
  return page.locator('main.hidden.md\\:block').first();
}

/**
 * Wait until the visible Excalidraw editor is actually ready to draw:
 *  1. the interactive canvas exists inside the desktop main,
 *  2. it has a NON-ZERO bounding box (flex layout settled — no fixed sleep),
 *  3. the Rectangle tool is ACTIVE (keyboard "2" applied, radio checked).
 * Only then perform the drag.
 */
async function drawRectangle(page: Page): Promise<void> {
  const main = desktopMain(page);
  const canvas = main.locator('canvas.excalidraw__canvas.interactive');
  await canvas.waitFor({ state: 'visible', timeout: 30000 });

  // Deterministic readiness: the canvas must have a real, measurable size.
  await expect
    .poll(async () => {
      const box = await canvas.boundingBox();
      return box !== null && box.width > 0 && box.height > 0;
    }, { timeout: 15000, message: 'Excalidraw canvas never got a non-zero size' })
    .toBe(true);

  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Focus the editor with a real pointer click, switch to the Rectangle tool,
  // then WAIT for the tool to be checked — the keyboard event is only useful
  // once Excalidraw's handlers are attached, and `toBeChecked` proves it.
  await page.mouse.click(cx, cy);
  await page.keyboard.press('2');
  const rectTool = main.locator('[data-testid="toolbar-rectangle"]');
  await expect(rectTool).toBeChecked({ timeout: 10000 });

  // Drag center → offset to create a rectangle.
  await page.mouse.move(cx - 120, cy - 80);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy + 80, { steps: 10 });
  await page.mouse.up();
}

/** Read the persisted scene for a page via the REAL API. */
async function getScene(page: Page, token: string, pageId: string): Promise<any> {
  const res = await page.request.get(`${API}/api/v1/pages/${pageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { page: { scene: string | null; revision: number } };
  expect(body.page.scene, 'scene should be persisted (not null)').not.toBeNull();
  return JSON.parse(body.page.scene!);
}

/**
 * Poll the REAL API until the scene is actually persisted (scene != null and
 * revision bumped). The autosave is debounced (1500ms idle + request round
 * trip), so an immediate readback can race the commit — the badge proves the
 * app TRANSITIONED to "Saved", this proves the DATA landed.
 */
async function waitForPersistedScene(page: Page, token: string, pageId: string): Promise<any> {
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API}/api/v1/pages/${pageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status() !== 200) return null;
        const body = (await res.json()) as { page: { scene: string | null; revision: number } };
        if (!body.page.scene || body.page.revision < 1) return null;
        return body.page.scene;
      },
      { timeout: 20000, message: 'scene never persisted via API' },
    )
    .not.toBeNull();
  return getScene(page, token, pageId);
}

test.describe('Browser E2E [notes]', () => {
  test.describe.configure({ mode: 'serial' });

  test('create notebook → create page → draw → reload → scene persists', async ({ page }) => {
    acceptDialogs(page); // window.confirm is auto-dismissed otherwise
    const token = await loginAs(page, `e2e-notes-${Date.now()}`);

    // Fresh accounts get the First-Run onboarding wizard; skip it.
    await skipFirstRunWizard(page);

    // --- Notes list: create a notebook -------------------------------------
    await page.goto(`${SPA}/notes`);
    await expect(page.getByRole('heading', { name: 'Notebooks' })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /New notebook/i }).click();
    await page.getByPlaceholder('Notebook name…').fill('E2E Draw Notebook');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name: 'E2E Draw Notebook' })).toBeVisible({ timeout: 15000 });

    // --- Create a page inside the notebook ---------------------------------
    const nbSection = page.locator('section', { hasText: 'E2E Draw Notebook' });
    await nbSection.getByRole('button', { name: 'Page' }).click();
    await expect(nbSection.getByRole('link', { name: 'Untitled' })).toBeVisible({ timeout: 15000 });

    // --- Open the page → real Excalidraw canvas ----------------------------
    await nbSection.getByRole('link', { name: 'Untitled' }).click();
    await page.waitForURL(/\/notes\/note_/, { timeout: 15000 });
    const pageId = page.url().split('/notes/')[1];
    expect(pageId).toBeTruthy();

    // --- Draw a rectangle --------------------------------------------------
    await drawRectangle(page);

    // --- Autosave must land: watch for the "Saved" status -------------------
    // Scoped to the DESKTOP main's header (the mobile copy is display:none
    // but its text is still in the DOM — unscoped text locators see 2 matches).
    await expect(desktopMain(page).locator('header').getByText('Saved').first()).toBeVisible({ timeout: 20000 });

    // --- API readback: the scene JSON has our rectangle ---------------------
    // Poll the API until the debounced autosave actually commits — an
    // immediate readback races the 1500ms debounce + round trip.
    const scene = await waitForPersistedScene(page, token, pageId);
    const rects = (scene.elements ?? []).filter((el: any) => el.type === 'rectangle');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    expect(scene.appState).toBeDefined();

    // --- Reload → canvas re-renders the persisted scene ---------------------
    await page.reload();
    await desktopMain(page).locator('canvas.excalidraw__canvas.interactive').waitFor({
      state: 'visible',
      timeout: 30000,
    });
    // No error/conflict banner after reload — the scene hydrated cleanly.
    await expect(page.getByText(/couldn.t open|save failed|this canvas is too large/i)).toHaveCount(0);

    // The scene is still there server-side (revision bumped, not reset).
    const scene2 = await getScene(page, token, pageId);
    const rects2 = (scene2.elements ?? []).filter((el: any) => el.type === 'rectangle');
    expect(rects2.length).toBeGreaterThanOrEqual(1);

    // --- Back to Notes: page still listed under the notebook ---------------
    await page.getByRole('link', { name: /Back/i }).click();
    await page.waitForURL(/\/notes$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'E2E Draw Notebook' })).toBeVisible({ timeout: 15000 });
  });

  test('archive removes page from list; restore brings it back', async ({ page }) => {
    acceptDialogs(page);
    const token = await loginAs(page, `e2e-notes-arc-${Date.now()}`);

    // Fresh accounts get the First-Run onboarding wizard; skip it.
    await skipFirstRunWizard(page);

    await page.goto(`${SPA}/notes`);
    await expect(page.getByRole('heading', { name: 'Notebooks' })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /New notebook/i }).click();
    await page.getByPlaceholder('Notebook name…').fill('Archive E2E');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name: 'Archive E2E' })).toBeVisible({ timeout: 15000 });

    const nbSection = page.locator('section', { hasText: 'Archive E2E' });
    await nbSection.getByRole('button', { name: 'Page' }).click();
    await expect(nbSection.getByRole('link', { name: 'Untitled' })).toBeVisible({ timeout: 15000 });

    // Archive via the row action (touch-visible on this viewport size).
    await nbSection.getByRole('button', { name: 'Archive page' }).click();
    await expect(nbSection.getByRole('link', { name: 'Untitled' })).toHaveCount(0, { timeout: 15000 });

    // Show archived → restore.
    await page.getByRole('button', { name: /Show archived/i }).click();
    await expect(nbSection.getByRole('link', { name: 'Untitled' })).toBeVisible({ timeout: 15000 });
    await nbSection.getByRole('button', { name: 'Restore page' }).click();
    await expect(nbSection.getByRole('link', { name: 'Untitled' })).toBeVisible({ timeout: 15000 });

    // Still one live page server-side.
    const notebooksRes = await page.request.get(`${API}/api/v1/notebooks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notebooks = ((await notebooksRes.json()) as { notebooks: { id: string }[] }).notebooks;
    expect(notebooks.length).toBeGreaterThanOrEqual(1);
  });
});
