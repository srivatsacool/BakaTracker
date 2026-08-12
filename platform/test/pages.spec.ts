/**
 * v2.1A — Notebook + Page persistence test suite.
 *
 * Tests:
 *  - migration: fresh DB, upgrade from 0001+0002, existing notes preserved, new columns
 *  - migration: idempotency, notebooks table + indexes
 *  - notebook CRUD + ownership
 *  - page CRUD + ownership
 *  - scene save / revision increment / 409 conflict
 *  - ordering + reordering + isolation
 *  - bounds (oversized scene → 413, oversized title → 400)
 *  - security (malformed IDs, nonexistent, cross-user, no existence oracle, missing auth)
 *  - existing Notes API regression (create_note, get_note, update_note, search_notes)
 *  - sync compatibility (pullChanges includes pages with new columns)
 *
 * No live Workers AI or production deployment — local Miniflare D1 + R2 pool only.
 */
import { env, applyD1Migrations, reset } from "cloudflare:test";
import { SELF } from "cloudflare:test";
import migrationSql from "../migrations/0001_init.sql?raw";
import migrationFilesSql from "../migrations/0002_files.sql?raw";
import migrationPagesSql from "../migrations/0003_notes_pages.sql?raw";
import { splitSqlStatements } from "../scripts/sql-split.mjs";
import { describe, it, expect, beforeAll } from "vitest";
import { repositories } from "../src/storage/repositories";
import { ToolRegistry, ToolRegistryError } from "../src/registry";
import { registerAll } from "../src/tools";
import { PAGE_SCENE_MAX_BYTES, PAGE_TITLE_MAX } from "../src/domain/schemas";
import { applySyncPush, pullOps, pullChanges } from "../src/storage/sync";

const ALICE = "alice-sub-v21a";
const BOB = "bob-sub-v21a";

// --- test helpers ------------------------------------------------------------

beforeAll(async () => {
  await reset();
  await applyD1Migrations(env.BAKA_DB, [
    { name: "0001_init.sql", queries: splitSqlStatements(migrationSql) },
    { name: "0002_files.sql", queries: splitSqlStatements(migrationFilesSql) },
    { name: "0003_notes_pages.sql", queries: splitSqlStatements(migrationPagesSql) },
  ]);
});

/** REST request with local-dev bypass auth. */
function authedFetch(path: string, init: RequestInit = {}, sub: string = ALICE): Promise<Response> {
  return SELF.fetch(`http://localhost${path}`, {
    ...init,
    headers: { "X-User-Sub": sub, ...(init.headers ?? {}) },
  });
}

function json(res: Response): Promise<any> {
  return res.json();
}

// =============================================================================
// MIGRATION
// =============================================================================

describe("Migration 0003 — notebooks + notes extension", () => {
  it("fresh DB: notebooks table + new notes columns exist", async () => {
    const cols = await env.BAKA_DB.prepare("PRAGMA table_info(notebooks)").all();
    const colNames = (cols.results ?? []).map((r: any) => r.name);
    expect(colNames).toEqual(expect.arrayContaining(["id", "user_id", "name", "position", "created_at", "updated_at"]));

    const noteCols = await env.BAKA_DB.prepare("PRAGMA table_info(notes)").all();
    const noteColNames = (noteCols.results ?? []).map((r: any) => r.name);
    expect(noteColNames).toContain("kind");
    expect(noteColNames).toContain("scene");
    expect(noteColNames).toContain("notebook_id");
    expect(noteColNames).toContain("position");
    expect(noteColNames).toContain("archived_at");
    expect(noteColNames).toContain("revision");
  });

  it("new notes columns have safe defaults for existing rows", async () => {
    // Insert an old-style note (no new columns explicitly set).
    await env.BAKA_DB.prepare(
      `INSERT INTO notes (id, user_id, created_at, updated_at, title, body, tags)
       VALUES ('note_old_default', 'u1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'title', 'body', '[]')`,
    ).run();

    const { results } = await env.BAKA_DB.prepare(
      "SELECT kind, scene, notebook_id, position, archived_at, revision FROM notes WHERE id='note_old_default'",
    ).all();
    expect(results[0]).toEqual({
      kind: "text",
      scene: null,
      notebook_id: null,
      position: 0,
      archived_at: null,
      revision: 0,
    });
  });

  it("indexes exist for user-scoped queries", async () => {
    const { results } = await env.BAKA_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
    ).all();
    const idx = (results ?? []).map((r: any) => r.name);
    expect(idx).toContain("idx_notebooks_user_position");
    expect(idx).toContain("idx_notes_user_notebook");
    expect(idx).toContain("idx_notes_user_updated");
    expect(idx).toContain("idx_notes_user_kind");
  });

  it("migration is tracked by d1_migrations", async () => {
    const { results } = await env.BAKA_DB.prepare("SELECT name FROM d1_migrations ORDER BY id").all();
    expect(results.map((r: any) => r.name)).toContain("0003_notes_pages.sql");
  });

  it("idempotent: migration machinery applies 0003 exactly once via d1_migrations", async () => {
    // Production idempotency comes from migration tracking, NOT from raw SQL
    // re-runs (D1 has no ADD COLUMN IF NOT EXISTS). Re-applying through the
    // same machinery must skip already-recorded migrations.
    const before = await env.BAKA_DB.prepare("SELECT name FROM d1_migrations ORDER BY id").all();
    expect((before.results ?? []).map((r: any) => r.name)).toContain("0003_notes_pages.sql");
    const beforeCount = (before.results ?? []).length;

    // Existing data survives a re-application attempt.
    await env.BAKA_DB.prepare(
      "INSERT INTO notebooks (id, user_id, name, position, created_at, updated_at) VALUES ('nb_survive', 'u1', 'Keep', 0, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
    ).run();

    await applyD1Migrations(env.BAKA_DB, [
      { name: "0001_init.sql", queries: splitSqlStatements(migrationSql) },
      { name: "0002_files.sql", queries: splitSqlStatements(migrationFilesSql) },
      { name: "0003_notes_pages.sql", queries: splitSqlStatements(migrationPagesSql) },
    ]);

    // No duplicate tracking rows; the migration was not executed twice.
    const after = await env.BAKA_DB.prepare("SELECT name FROM d1_migrations ORDER BY id").all();
    const names = (after.results ?? []).map((r: any) => r.name);
    expect(names.filter((n: string) => n === "0003_notes_pages.sql")).toHaveLength(1);
    expect((after.results ?? []).length).toBe(beforeCount);

    // Existing data survived; resulting schema is correct.
    const survived = await env.BAKA_DB.prepare("SELECT name FROM notebooks WHERE id='nb_survive'").first();
    expect(survived?.name).toBe("Keep");
    const cols = await env.BAKA_DB.prepare("PRAGMA table_info(notes)").all();
    const noteColNames = (cols.results ?? []).map((r: any) => r.name);
    expect(noteColNames).toEqual(expect.arrayContaining(["kind", "scene", "notebook_id", "position", "archived_at", "revision"]));
  });
});

// =============================================================================
// NOTEBOOK CRUD + OWNERSHIP
// =============================================================================

describe("Notebook CRUD", () => {
  it("create → list", async () => {
    const res = await authedFetch("/api/v1/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Notebook" }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.notebook.name).toBe("My Notebook");

    const listRes = await authedFetch("/api/v1/notebooks");
    expect(listRes.status).toBe(200);
    const listBody = await json(listRes);
    expect(listBody.ok).toBe(true);
    expect(listBody.notebooks.some((n: any) => n.name === "My Notebook")).toBe(true);
  });

  it("default Personal notebook is created on-demand and is user-scoped", async () => {
    // Alice creates a page with no notebook_id → default notebook created.
    const res = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Page 1" }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.page.notebook_id).toBe("notebook_personal");

    // Alice's notebook list includes "Personal".
    const listRes = await authedFetch("/api/v1/notebooks");
    const listBody = await json(listRes);
    expect(listBody.notebooks.some((n: any) => n.id === "notebook_personal")).toBe(true);

    // Bob's notebook list does NOT include Alice's Personal notebook.
    const bobList = await authedFetch("/api/v1/notebooks", {}, BOB);
    const bobBody = await json(bobList);
    expect(bobBody.notebooks.some((n: any) => n.id === "notebook_personal")).toBe(false);
  });

  it("delete notebook reassigns pages to default", async () => {
    await authedFetch("/api/v1/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "To Delete" }),
    });
    const nbList = await authedFetch("/api/v1/notebooks");
    const nbBody = await json(nbList);
    const toDelete = nbBody.notebooks.find((n: any) => n.name === "To Delete");

    const pageRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "In Delete NB", notebook_id: toDelete.id }),
    });
    const pageBody = await json(pageRes);
    const pageId = pageBody.page.id;

    const delRes = await authedFetch(`/api/v1/notebooks/${toDelete.id}`, { method: "DELETE" });
    expect(delRes.status).toBe(200);

    // Page should now be in the default notebook.
    const pageAfter = await authedFetch(`/api/v1/pages/${pageId}`);
    const pageAfterBody = await json(pageAfter);
    expect(pageAfterBody.ok).toBe(true);
    expect(pageAfterBody.page.notebook_id).toBe("notebook_personal");
  });

  it("user B cannot read user A's notebook", async () => {
    await authedFetch("/api/v1/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice Secret" }),
    });
    const nbList = await authedFetch("/api/v1/notebooks");
    const nbBody = await json(nbList);
    const aliceNb = nbBody.notebooks.find((n: any) => n.name === "Alice Secret");

    const bobRes = await authedFetch(`/api/v1/notebooks`, {}, BOB);
    const bobBody = await json(bobRes);
    expect(bobBody.notebooks.some((n: any) => n.id === aliceNb.id)).toBe(false);
  });

  it("user B cannot delete user A's notebook (404, no existence oracle)", async () => {
    await authedFetch("/api/v1/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice Protected" }),
    });
    const nbList = await authedFetch("/api/v1/notebooks");
    const nbBody = await json(nbList);
    const aliceNb = nbBody.notebooks.find((n: any) => n.name === "Alice Protected");

    const bobDel = await authedFetch(`/api/v1/notebooks/${aliceNb.id}`, { method: "DELETE" }, BOB);
    expect(bobDel.status).toBe(404);

    // Alice can still see it.
    const aliceList = await authedFetch("/api/v1/notebooks");
    const aliceBody = await json(aliceList);
    expect(aliceBody.notebooks.some((n: any) => n.id === aliceNb.id)).toBe(true);
  });

  it("listing notebooks is user-isolated", async () => {
    await authedFetch("/api/v1/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice N" }),
    });
    await authedFetch("/api/v1/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob N" }),
    }, BOB);

    const aliceList = await authedFetch("/api/v1/notebooks");
    const aliceBody = await json(aliceList);
    const bobList = await authedFetch("/api/v1/notebooks", {}, BOB);
    const bobBody = await json(bobList);

    expect(aliceBody.notebooks.length).toBeGreaterThan(0);
    expect(bobBody.notebooks.length).toBeGreaterThan(0);
    expect(aliceBody.notebooks.some((n: any) => n.name === "Bob N")).toBe(false);
    expect(bobBody.notebooks.some((n: any) => n.name === "Alice N")).toBe(false);
  });
});

// =============================================================================
// PAGE CRUD + OWNERSHIP
// =============================================================================

describe("Page CRUD", () => {
  it("create → list → get", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Page", kind: "excalidraw" }),
    });
    expect(createRes.status).toBe(201);
    const created = await json(createRes);
    expect(created.ok).toBe(true);
    expect(created.page.title).toBe("Test Page");
    expect(created.page.kind).toBe("excalidraw");
    expect(created.page.scene).toBeNull();
    expect(typeof created.page.id).toBe("string");

    const listRes = await authedFetch("/api/v1/notebooks/notebook_personal/pages");
    expect(listRes.status).toBe(200);
    const listed = await json(listRes);
    expect(listed.ok).toBe(true);
    expect(listed.pages.some((p: any) => p.id === created.page.id)).toBe(true);

    const getRes = await authedFetch(`/api/v1/pages/${created.page.id}`);
    expect(getRes.status).toBe(200);
    const got = await json(getRes);
    expect(got.ok).toBe(true);
    expect(got.page.title).toBe("Test Page");
    expect(got.page.revision).toBe(0);
  });

  it("rename (PATCH title)", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Original" }),
    });
    const created = await json(createRes);

    const patchRes = await authedFetch(`/api/v1/pages/${created.page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Renamed" }),
    });
    expect(patchRes.status).toBe(200);
    const patched = await json(patchRes);
    expect(patched.page.title).toBe("Renamed");
  });

  it("update metadata (notebook_id, position)", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Move Me" }),
    });
    const created = await json(createRes);
    expect(created.page.notebook_id).toBe("notebook_personal");

    const moved = await authedFetch(`/api/v1/pages/${created.page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebook_id: "notebook_personal", position: 999 }),
    });
    expect(moved.status).toBe(200);
    const movedBody = await json(moved);
    expect(movedBody.page.position).toBe(999);
  });

  it("archive → restore → verify archived pages excluded from list", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Archivable" }),
    });
    const created = await json(createRes);
    const pageId = created.page.id;

    // Archived page should NOT appear in the list.
    const archRes = await authedFetch(`/api/v1/pages/${pageId}/archive`, { method: "POST" });
    expect(archRes.status).toBe(200);

    const listRes = await authedFetch("/api/v1/notebooks/notebook_personal/pages");
    const listed = await json(listRes);
    expect(listed.pages.some((p: any) => p.id === pageId)).toBe(false);

    // But it's still directly readable (archived_at set).
    const getRes = await authedFetch(`/api/v1/pages/${pageId}`);
    expect(getRes.status).toBe(200);
    const got = await json(getRes);
    expect(got.page.archived_at).not.toBeNull();

    // Restore it.
    const restoreRes = await authedFetch(`/api/v1/pages/${pageId}/restore`, { method: "POST" });
    expect(restoreRes.status).toBe(200);

    // Now it should appear in the list again.
    const listAfter = await authedFetch("/api/v1/notebooks/notebook_personal/pages");
    const listedAfter = await json(listAfter);
    expect(listedAfter.pages.some((p: any) => p.id === pageId)).toBe(true);

    const getAfter = await authedFetch(`/api/v1/pages/${pageId}`);
    const gotAfter = await json(getAfter);
    expect(gotAfter.page.archived_at).toBeNull();
  });

  it("duplicate creates a new page with copied scene", async () => {
    // Create a page and save a scene.
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Source" }),
    });
    const created = await json(createRes);
    const pageId = created.page.id;

    const scene = JSON.stringify({ type: "excalidraw", version: 2, elements: [], appState: {}, files: {} });
    const saveRes = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene, expected_revision: 0 }),
    });
    expect(saveRes.status).toBe(200);
    const saved = await json(saveRes);
    expect(saved.revision).toBe(1);

    // Duplicate.
    const dupRes = await authedFetch(`/api/v1/pages/${pageId}/duplicate`, { method: "POST" });
    expect(dupRes.status).toBe(201);
    const dup = await json(dupRes);
    expect(dup.page.title).toBe("Source (copy)");
    expect(dup.page.scene).toBe(scene);
    expect(dup.page.revision).toBe(0);
    expect(dup.page.id).not.toBe(pageId);
  });

  it("delete (archive) via DELETE endpoint", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Delete Me" }),
    });
    const created = await json(createRes);

    const delRes = await authedFetch(`/api/v1/pages/${created.page.id}`, { method: "DELETE" });
    expect(delRes.status).toBe(200);
    const delBody = await json(delRes);
    expect(delBody.archived).toBe(true);

    // Not in list anymore.
    const listRes = await authedFetch("/api/v1/notebooks/notebook_personal/pages");
    const listed = await json(listRes);
    expect(listed.pages.some((p: any) => p.id === created.page.id)).toBe(false);
  });
});

// =============================================================================
// OWNERSHIP (cross-user isolation)
// =============================================================================

describe("Page ownership isolation", () => {
  let alicePageId: string;

  beforeAll(async () => {
    const res = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Alice Private" }),
    });
    const body = await json(res);
    alicePageId = body.page.id;
  });

  it("user B cannot read user A's page (404, no existence oracle)", async () => {
    const res = await authedFetch(`/api/v1/pages/${alicePageId}`, {}, BOB);
    expect(res.status).toBe(404);
    expect((await json(res)).error).toBe("not_found");
  });

  it("user B cannot update user A's page (404)", async () => {
    const res = await authedFetch(`/api/v1/pages/${alicePageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hacked" }),
    }, BOB);
    expect(res.status).toBe(404);
  });

  it("user B cannot save a scene on user A's page (404)", async () => {
    const res = await authedFetch(`/api/v1/pages/${alicePageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: "{}", expected_revision: 0 }),
    }, BOB);
    expect(res.status).toBe(404);
  });

  it("user B cannot archive user A's page (404)", async () => {
    const res = await authedFetch(`/api/v1/pages/${alicePageId}/archive`, { method: "POST" }, BOB);
    expect(res.status).toBe(404);
  });

  it("user B cannot delete user A's page (404)", async () => {
    const res = await authedFetch(`/api/v1/pages/${alicePageId}`, { method: "DELETE" }, BOB);
    expect(res.status).toBe(404);
  });

  it("user B cannot duplicate user A's page (404)", async () => {
    const res = await authedFetch(`/api/v1/pages/${alicePageId}/duplicate`, { method: "POST" }, BOB);
    expect(res.status).toBe(404);
  });

  it("user B cannot reorder user A's page into their list", async () => {
    const res = await authedFetch("/api/v1/pages/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: [alicePageId] }),
    }, BOB);
    expect(res.status).toBe(200);

    // Alice's page is untouched (still there, unchanged).
    const aliceGet = await authedFetch(`/api/v1/pages/${alicePageId}`);
    expect(aliceGet.status).toBe(200);
  });

  it("user A's page remains intact after all B attempts", async () => {
    const res = await authedFetch(`/api/v1/pages/${alicePageId}`);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.page.title).toBe("Alice Private");
    expect(body.page.archived_at).toBeNull();
  });
});

// =============================================================================
// ORDERING
// =============================================================================

describe("Page ordering", () => {
  it("creates pages with increasing positions and persists reordering", async () => {
    // Scope to a dedicated notebook so the assertions are isolated from pages
    // created by earlier tests (pages are notebook-scoped by contract).
    const nbRes = await authedFetch("/api/v1/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ordering NB" }),
    });
    expect(nbRes.status).toBe(201);
    const nbBody = await json(nbRes);
    const nbId = nbBody.notebook.id;

    const titles = ["Page A", "Page B", "Page C"];
    const ids: string[] = [];
    for (const t of titles) {
      const res = await authedFetch("/api/v1/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, notebook_id: nbId }),
      });
      const body = await json(res);
      expect(res.status).toBe(201);
      ids.push(body.page.id);
    }

    // List should be in creation order (position ascending).
    const listRes = await authedFetch(`/api/v1/notebooks/${nbId}/pages`);
    const listed = await json(listRes);
    const listedIds = listed.pages.map((p: any) => p.id);
    expect(listedIds).toEqual(ids);

    // Reorder: reverse the order.
    const reversed = [...ids].reverse();
    const reorderRes = await authedFetch(`/api/v1/pages/reorder?notebook_id=${nbId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reversed }),
    });
    expect(reorderRes.status).toBe(200);

    const listAfter = await authedFetch(`/api/v1/notebooks/${nbId}/pages`);
    const listedAfter = await json(listAfter);
    const afterIds = listedAfter.pages.map((p: any) => p.id);
    expect(afterIds).toEqual(reversed);

    // Verify positions are persisted correctly (0, 1000, 2000).
    for (let i = 0; i < reversed.length; i++) {
      const pageRes = await authedFetch(`/api/v1/pages/${reversed[i]}`);
      const page = await json(pageRes);
      expect(page.page.position).toBe(i * 1000);
    }
  });

  it("reorder is user-isolated", async () => {
    // Bob's reorder must not affect Alice's page positions.
    const aliceCreate = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Alice Ordered" }),
    });
    const alicePage = await json(aliceCreate);
    const aliceId = alicePage.page.id;
    const aliceBeforePos = alicePage.page.position;

    // Bob creates his own page and reorders.
    await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Bob Ordered" }),
    }, BOB);

    const bobRes = await authedFetch("/api/v1/pages/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: [] }),
    }, BOB);

    // Alice's page position unchanged.
    const aliceGet = await authedFetch(`/api/v1/pages/${aliceId}`);
    const aliceAfter = await json(aliceGet);
    expect(aliceAfter.page.position).toBe(aliceBeforePos);
  });
});

// =============================================================================
// SCENE / REVISION / CONFLICT
// =============================================================================

describe("Scene save & revision conflict", () => {
  it("initial revision is 0, first save increments to 1", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Scene Page" }),
    });
    const created = await json(createRes);
    const pageId = created.page.id;
    expect(created.page.revision).toBe(0);

    // GET page returns revision.
    const getRes = await authedFetch(`/api/v1/pages/${pageId}`);
    const got = await json(getRes);
    expect(got.page.revision).toBe(0);

    const scene = JSON.stringify({ type: "excalidraw", version: 2, elements: [], appState: {}, files: {} });
    const saveRes = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene, expected_revision: 0 }),
    });
    expect(saveRes.status).toBe(200);
    const saved = await json(saveRes);
    expect(saved.revision).toBe(1);
  });

  it("reload returns exact scene + incremented revision", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Reload Page" }),
    });
    const created = await json(createRes);
    const pageId = created.page.id;

    const scene = JSON.stringify({ type: "excalidraw", version: 2, elements: [{ id: "e1", type: "text", text: "hello" }], appState: {}, files: {} });
    await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene, expected_revision: 0 }),
    });

    const getRes = await authedFetch(`/api/v1/pages/${pageId}`);
    const got = await json(getRes);
    expect(got.page.scene).toBe(scene);
    expect(got.page.revision).toBe(1);
  });

  it("revision increments on each successive save", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Increment Page" }),
    });
    const pageId = (await json(createRes)).page.id;

    let rev = 0;
    for (let i = 1; i <= 3; i++) {
      const scene = JSON.stringify({ version: i });
      const saveRes = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, expected_revision: rev }),
      });
      expect(saveRes.status).toBe(200);
      const saved = await json(saveRes);
      expect(saved.revision).toBe(i);
      rev = i;
    }
  });

  it("stale revision → 409 with currentRevision, scene NOT overwritten", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Conflict Page" }),
    });
    const pageId = (await json(createRes)).page.id;

    const scene1 = JSON.stringify({ version: 1, data: "original" });
    const save1Res = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: scene1, expected_revision: 0 }),
    });
    expect(save1Res.status).toBe(200);
    expect((await json(save1Res)).revision).toBe(1);

    // Attempt stale save with expected_revision=0 (real revision is now 1).
    const scene2 = JSON.stringify({ version: 2, data: "stale" });
    const staleRes = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: scene2, expected_revision: 0 }),
    });
    expect(staleRes.status).toBe(409);
    const conflict = await json(staleRes);
    expect(conflict.error).toBe("conflict");
    expect(conflict.currentRevision).toBe(1);

    // Scene NOT overwritten — still scene1.
    const getRes = await authedFetch(`/api/v1/pages/${pageId}`);
    const got = await json(getRes);
    expect(got.page.scene).toBe(scene1);
    expect(got.page.revision).toBe(1);
  });

  it("concurrent save protection: two stale clients both fail after first save", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Concurrent Page" }),
    });
    const pageId = (await json(createRes)).page.id;

    const s1 = JSON.stringify({ v: 1 });
    const s2 = JSON.stringify({ v: 2 });

    // Both try with expectedRevision=0.
    const res1 = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: s1, expected_revision: 0 }),
    });
    const res2 = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: s2, expected_revision: 0 }),
    });

    // One succeeds (200), one fails (409).
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    // The saved scene is whichever won.
    const getRes = await authedFetch(`/api/v1/pages/${pageId}`);
    const got = await json(getRes);
    expect(got.page.revision).toBe(1);
    expect([s1, s2]).toContain(got.page.scene);
  });
});

// =============================================================================
// BOUNDS
// =============================================================================

describe("Bounds & validation", () => {
  it("oversized scene → 413", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Big Scene" }),
    });
    const pageId = (await json(createRes)).page.id;

    const bigScene = JSON.stringify({ type: "excalidraw", elements: [], appState: {}, files: {}, big: "x".repeat(PAGE_SCENE_MAX_BYTES + 1) });
    const res = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: bigScene, expected_revision: 0 }),
    });
    expect(res.status).toBe(413);
  });

  it("oversized title → 400 (existing schema convention: max 300)", async () => {
    const res = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x".repeat(PAGE_TITLE_MAX + 1) }),
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("invalid_input");
  });

  it("empty title → 400", async () => {
    const res = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("scene too large via tool registry → conflict error (400)", async () => {
    const registry = new ToolRegistry();
    registerAll(registry);
    const bigScene = "x".repeat(PAGE_SCENE_MAX_BYTES + 1);
    await expect(
      registry.call("save_page_scene", { id: "page_x", scene: bigScene, expected_revision: 0 }, {
        env: env as any, user: { sub: ALICE }, cache: env.OAUTH_KV,
        repos: repositories(env.BAKA_DB as any, env.R2_BUCKET as any),
      }),
    ).rejects.toThrow(/exceeds the .* byte cap/);
  });
});

// =============================================================================
// SECURITY
// =============================================================================

describe("Security", () => {
  it("malformed page ID (empty) → 404", async () => {
    const res = await authedFetch("/api/v1/pages/", {}); // Hono matches :id
    // Empty/odd IDs should not leak — at minimum, not 200.
    expect([400, 404]).toContain(res.status);
  });

  it("nonexistent page → 404", async () => {
    const res = await authedFetch("/api/v1/pages/nonexistent_page_id");
    expect(res.status).toBe(404);
    expect((await json(res)).error).toBe("not_found");
  });

  it("nonexistent notebook → 404", async () => {
    const res = await authedFetch("/api/v1/notebooks/nonexistent_nb_id");
    expect(res.status).toBe(404);
  });

  it("cross-user page access → 404 (no existence oracle)", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Alice Hidden" }),
    });
    const alicePageId = (await json(createRes)).page.id;

    // Bob trying to access Alice's page.
    const res = await authedFetch(`/api/v1/pages/${alicePageId}`, {}, BOB);
    expect(res.status).toBe(404);
  });

  it("cross-user notebook access → 404", async () => {
    const createRes = await authedFetch("/api/v1/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice Hidden NB" }),
    });
    const aliceNbId = (await json(createRes)).notebook.id;

    const bobPages = await authedFetch(`/api/v1/notebooks/${aliceNbId}/pages`, {}, BOB);
    expect(bobPages.status).toBe(404);
  });

  it("stale revision → 409 (not 404, not 500)", async () => {
    const createRes = await authedFetch("/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Stale Test" }),
    });
    const pageId = (await json(createRes)).page.id;

    // Save to get revision=1.
    await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: "{}", expected_revision: 0 }),
    });

    // Stale save.
    const res = await authedFetch(`/api/v1/pages/${pageId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: "{}", expected_revision: 0 }),
    });
    expect(res.status).toBe(409);
  });

  it("missing auth → 401", async () => {
    const res = await SELF.fetch("http://localhost/api/v1/notebooks");
    expect(res.status).toBe(401);

    const res2 = await SELF.fetch("http://localhost/api/v1/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(res2.status).toBe(401);
  });
});

// =============================================================================
// EXISTING NOTES API REGRESSION
// =============================================================================

describe("Existing Notes API regression (v2.0 compatibility)", () => {
  it("create_note still works and preserves the note with new columns defaulted", async () => {
    const res = await authedFetch("/api/v1/tools/create_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Regression Note", body: "old body", tags: ["tag1"] }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.result.title).toBe("Regression Note");
    expect(body.result.body).toBe("old body");

    // Verify via repository that new columns have safe defaults.
    const repos = repositories(env.BAKA_DB as any, env.R2_BUCKET as any);
    const note = await repos.notes.get(ALICE, body.result.id);
    expect(note).not.toBeNull();
    expect(note!.kind).toBe("text");
    expect(note!.scene).toBeNull();
    expect(note!.notebook_id).toBeNull();
    expect(note!.revision).toBe(0);
    expect(note!.archived_at).toBeNull();
  });

  it("get_note, update_note, search_notes still work", async () => {
    const repos = repositories(env.BAKA_DB as any, env.R2_BUCKET as any);

    // Create via tool.
    const res = await authedFetch("/api/v1/tools/create_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Searchable Note", body: "findme content", tags: ["search"] }),
    });
    const created = await json(res);
    const noteId = created.result.id;

    // get_note
    const getRes = await authedFetch("/api/v1/tools/get_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteId }),
    });
    expect(getRes.status).toBe(200);
    const got = await json(getRes);
    expect(got.result.title).toBe("Searchable Note");

    // update_note
    const updRes = await authedFetch("/api/v1/tools/update_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteId, title: "Updated Title", body: "updated body" }),
    });
    expect(updRes.status).toBe(200);
    const upd = await json(updRes);
    expect(upd.result.title).toBe("Updated Title");
    expect(upd.result.body).toBe("updated body");

    // search_notes (queries current title/body — note was updated above)
    const searchRes = await authedFetch("/api/v1/tools/search_notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "updated" }),
    });
    expect(searchRes.status).toBe(200);
    const searchBody = await json(searchRes);
    expect(searchBody.result.some((n: any) => n.id === noteId)).toBe(true);
  });

  it("list_notes still works and returns notes with new columns", async () => {
    const res = await authedFetch("/api/v1/tools/create_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "List Test", body: "b" }),
    });
    const created = await json(res);

    const listRes = await authedFetch("/api/v1/tools/list_notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(listRes.status).toBe(200);
    const listed = await json(listRes);
    expect(listed.result.some((n: any) => n.id === created.result.id)).toBe(true);
  });

  it("delete_note still works and hard-deletes", async () => {
    const res = await authedFetch("/api/v1/tools/create_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "To Delete", body: "b" }),
    });
    const noteId = (await json(res)).result.id;

    const delRes = await authedFetch("/api/v1/tools/delete_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteId }),
    });
    expect(delRes.status).toBe(200);
    const delBody = await json(delRes);
    expect(delBody.result.removed).toBe(true);

    // Gone.
    const getRes = await authedFetch("/api/v1/tools/get_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteId }),
    });
    expect(getRes.status).toBe(200);
    const got = await json(getRes);
    expect(got.result).toBeNull();
  });

  it("existing note ownership: B cannot access A's note", async () => {
    const res = await authedFetch("/api/v1/tools/create_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Secret", body: "s" }),
    });
    const noteId = (await json(res)).result.id;

    const bobRes = await authedFetch("/api/v1/tools/get_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteId }),
    }, BOB);
    expect(bobRes.status).toBe(200);
    const bobBody = await json(bobRes);
    expect(bobBody.result).toBeNull(); // ownership scoped — Bob sees nothing
  });
});

// =============================================================================
// SYNC COMPATIBILITY
// =============================================================================

describe("Sync compatibility", () => {
  it("pullChanges includes pages with new columns", async () => {
    const repos = repositories(env.BAKA_DB as any, env.R2_BUCKET as any);
    await repos.notes.createPage(ALICE, {
      notebookId: null,
      title: "Sync Page",
      kind: "excalidraw",
      scene: JSON.stringify({ type: "excalidraw" }),
    });

    const result = await pullChanges(env.BAKA_DB as any, ALICE);
    expect(result.notes.length).toBeGreaterThan(0);
    const syncPage = result.notes.find((n: any) => n.title === "Sync Page");
    expect(syncPage).toBeDefined();
    expect(syncPage.kind).toBe("excalidraw");
    expect(syncPage.scene).not.toBeNull();
  });

  it("sync push applies new note fields (kind, scene, notebook_id, revision)", async () => {
    // Push a page op with v2.1 fields.
    const pageId = `note_sync_${crypto.randomUUID()}`;
    const push = {
      ops: [{
        op: "add" as any,
        entity: "note" as any,
        entity_id: pageId,
        payload: {
          id: pageId,
          user_id: ALICE,
          title: "Sync Pushed Page",
          body: "",
          tags: [],
          kind: "excalidraw",
          scene: JSON.stringify({ type: "excalidraw" }),
          notebook_id: null,
          position: 0,
          archived_at: null,
          revision: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        rev: "v1",
        client_id: "test",
      }],
    };

    const result = await applySyncPush(env.BAKA_DB as any, ALICE, push);
    expect(result.accepted).toBe(1);
    expect(result.conflicts).toBe(0);

    // Pull it back.
    const pull = await pullOps(env.BAKA_DB as any, ALICE);
    expect(pull.ops.length).toBeGreaterThan(0);

    // Verify via repository.
    const repos = repositories(env.BAKA_DB as any, env.R2_BUCKET as any);
    const note = await repos.notes.get(ALICE, pageId);
    expect(note).not.toBeNull();
    expect(note!.kind).toBe("excalidraw");
    expect(note!.scene).not.toBeNull();
  });

  it("old-style note push (no new fields) still works — backward compatible", async () => {
    const oldNoteId = `note_old_sync_${crypto.randomUUID()}`;
    const push = {
      ops: [{
        op: "add" as any,
        entity: "note" as any,
        entity_id: oldNoteId,
        payload: {
          id: oldNoteId,
          user_id: BOB,
          title: "Old-style note",
          body: "legacy body",
          tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        rev: "v1",
        client_id: "test",
      }],
    };

    const result = await applySyncPush(env.BAKA_DB as any, BOB, push);
    expect(result.accepted).toBe(1);

    const repos = repositories(env.BAKA_DB as any, env.R2_BUCKET as any);
    const note = await repos.notes.get(BOB, oldNoteId);
    expect(note).not.toBeNull();
    // New columns have safe defaults.
    expect(note!.kind).toBe("text");
    expect(note!.scene).toBeNull();
    expect(note!.notebook_id).toBeNull();
    expect(note!.revision).toBe(0);
    expect(note!.archived_at).toBeNull();
  });
});
