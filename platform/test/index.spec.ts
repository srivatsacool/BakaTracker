import { env, SELF, applyD1Migrations } from "cloudflare:test";
import migrationSql from "../migrations/0001_init.sql?raw";
import migrationFilesSql from "../migrations/0002_files.sql?raw";
import { describe, it, expect, beforeAll } from "vitest";
import { ToolRegistry } from "../src/registry";
import { registerAll } from "../src/tools";
import { repositories } from "../src/storage/repositories";

const TEST_USER = "test-sub-123";

/** Split raw migration SQL the same way `wrangler d1 migrations apply` does. */
function splitSql(raw: string): string[] {
  return raw
    // strip full-line AND trailing comments (e.g. `-- Google \`sub\``)
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

beforeAll(async () => {
  // D1 in the test pool starts empty — apply the real schema once. (Pool
  // v0.20 dropped the `./config` subpath, so we split the raw SQL ourselves —
  // same statements the production migrations run.)
  await applyD1Migrations(env.BAKA_DB, [
    { name: "0001_init", queries: splitSql(migrationSql) },
    { name: "0002_files", queries: splitSql(migrationFilesSql) },
  ]);

  // Pre-seed the isolation test's private task.
  const repos = repositories(env.BAKA_DB);
  await repos.tasks.upsert({
    id: "task_seed_alice", user_id: TEST_USER, created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(), title: "Alice's private task", status: "todo",
  });
});

/** Local dev bypass (REST_DEV_BYPASS=1 in .dev.vars) — the production path
 * (real OAuth bearer tokens) is exercised manually / in e2e. */
function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return SELF.fetch(`http://localhost${path}`, {
    ...init,
    headers: { "X-User-Sub": TEST_USER, ...(init.headers ?? {}) },
  });
}

describe("Tool Registry (unit)", () => {
  it("registers every module with unique names", () => {
    const registry = new ToolRegistry();
    registerAll(registry);
    const tools = registry.list();
    const names = tools.map((t) => t.name);
    expect(tools.length).toBeGreaterThanOrEqual(20);
    expect(new Set(names).size).toBe(names.length);
  });

  it("rejects unknown tools with a helpful error", async () => {
    const registry = new ToolRegistry();
    registerAll(registry);
    await expect(
      registry.call("does_not_exist", {}, { env: env as any, user: { sub: TEST_USER }, cache: env.OAUTH_KV }),
    ).rejects.toThrow(/No tool named "does_not_exist"/);
  });
});

describe("REST API (integration via SELF)", () => {
  it("exposes registry introspection with the tool catalog", async () => {
    const res = await authedFetch("/api/v1/registry");
    expect(res.status).toBe(200);
    const body = await res.json<{ tools: Array<{ name: string }> }>();
    expect(body.tools.length).toBeGreaterThanOrEqual(20);
    const names = body.tools.map((t) => t.name);
    expect(names).toContain("create_task");
    expect(names).toContain("log_habit");
    expect(names).toContain("search_notes");
  });

  it("runs a full task CRUD roundtrip through the generic tool endpoint", async () => {
    // create
    const createRes = await authedFetch("/api/v1/tools/create_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test task from vitest", tags: ["test"] }),
    });
    expect(createRes.status).toBe(200);
    const created = (await createRes.json<{ ok: boolean; result: { id: string; user_id: string; title: string } }>()).result;
    expect(created.id).toMatch(/^task_/);
    expect(created.user_id).toBe(TEST_USER);
    expect(created.title).toBe("Test task from vitest");

    // list (filtered by the same user)
    const listRes = await authedFetch("/api/v1/tools/list_tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const listed = await listRes.json<{ ok: boolean; result: Array<{ id: string }> }>();
    expect(listed.result.some((t) => t.id === created.id)).toBe(true);

    // update → done
    const updateRes = await authedFetch("/api/v1/tools/update_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: created.id, status: "done" }),
    });
    const updated = await updateRes.json<{ ok: boolean; result: { status: string } }>();
    expect(updated.result.status).toBe("done");

    // delete
    const delRes = await authedFetch("/api/v1/tools/delete_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: created.id }),
    });
    const del = await delRes.json<{ ok: boolean; result: { removed: boolean } }>();
    expect(del.result.removed).toBe(true);
  });

  it("scopes data per user (isolation)", async () => {
    await authedFetch("/api/v1/tools/create_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Alice's private task" }),
    });
    // Bob must not see Alice's task.
    const bobList = await SELF.fetch("http://localhost/api/v1/tools/list_tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Sub": "bob-sub-456" },
      body: JSON.stringify({}),
    });
    const listed = await bobList.json<{ ok: boolean; result: Array<{ title: string }> }>();
    expect(listed.result.some((t) => t.title === "Alice's private task")).toBe(false);
  });

  it("reset_account refuses without explicit DELETE confirm", async () => {
    const noConfirm = await authedFetch("/api/v1/tools/reset_account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(noConfirm.status).toBe(400);

    const wrongConfirm = await authedFetch("/api/v1/tools/reset_account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "yes" }),
    });
    expect(wrongConfirm.status).toBe(400);
  });

  it("reset_account deletes only the calling user's data (scoped reset)", async () => {
    // Seed data for two users.
    await authedFetch("/api/v1/tools/create_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "alice-to-keep", priority: 1 }),
    });
    await SELF.fetch("http://localhost/api/v1/tools/create_task", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Sub": "bob-retains-789" },
      body: JSON.stringify({ title: "bob-must-survive", priority: 1 }),
    });

    // Alice resets her account.
    const reset = await authedFetch("/api/v1/tools/reset_account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    expect(reset.status).toBe(200);
    const resetBody = await reset.json<{ result: { deleted: Record<string, number>; note: string } }>();
    expect(resetBody.result.deleted.tasks).toBeGreaterThanOrEqual(1);
    expect(resetBody.result.note).toContain("preserved");

    // Alice's data is gone...
    const aliceList = await authedFetch("/api/v1/tools/list_tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const aliceTasks = await aliceList.json<{ result: Array<{ title: string }> }>();
    expect(aliceTasks.result.some((t) => t.title === "alice-to-keep")).toBe(false);

    // ...but Bob's data is untouched (isolation preserved by the reset).
    const bobList = await SELF.fetch("http://localhost/api/v1/tools/list_tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Sub": "bob-retains-789" },
      body: JSON.stringify({}),
    });
    const bobTasks = await bobList.json<{ result: Array<{ title: string }> }>();
    expect(bobTasks.result.some((t) => t.title === "bob-must-survive")).toBe(true);
  });

  it("rejects requests without an identity (401)", async () => {
    const res = await SELF.fetch("http://localhost/api/v1/registry");
    expect(res.status).toBe(401);
  });

  it("whoami echoes the authenticated identity", async () => {
    const res = await authedFetch("/api/v1/whoami");
    expect(res.status).toBe(200);
    const body = await res.json<{ sub: string }>();
    expect(body.sub).toBe(TEST_USER);
  });
});

describe("Files (R2 attachments)", () => {
  const PAYLOAD = new TextEncoder().encode("BakaTracker v2 file payload — hello R2!");

  it("uploads a file via multipart and returns metadata (201)", async () => {
    const form = new FormData();
    form.append("file", new File([PAYLOAD], "readme.txt", { type: "text/plain" }));
    const res = await authedFetch("/api/v1/files", { method: "POST", body: form });
    expect(res.status).toBe(201);
    const body = await res.json<{ ok: boolean; file: { id: string; user_id: string; filename: string; mime_type: string; size: number } }>();
    expect(body.ok).toBe(true);
    expect(body.file.id).toMatch(/^file_/);
    expect(body.file.user_id).toBe(TEST_USER);
    expect(body.file.filename).toBe("readme.txt");
    expect(body.file.mime_type).toBe("text/plain");
    expect(body.file.size).toBe(PAYLOAD.byteLength);
  });

  it("lists, downloads, and deletes a file (full roundtrip)", async () => {
    const form = new FormData();
    form.append("file", new File([PAYLOAD], "photo.png", { type: "image/png" }));
    const up = await authedFetch("/api/v1/files", { method: "POST", body: form });
    const { file } = await up.json<{ file: { id: string } }>();

    // list
    const list = await authedFetch("/api/v1/files");
    expect(list.status).toBe(200);
    const listed = await list.json<{ files: Array<{ id: string }> }>();
    expect(listed.files.some((f) => f.id === file.id)).toBe(true);

    // download — exact bytes roundtrip
    const dl = await authedFetch(`/api/v1/files/${file.id}`);
    expect(dl.status).toBe(200);
    expect(dl.headers.get("Content-Type")).toBe("image/png");
    expect(dl.headers.get("Content-Disposition")).toContain('attachment; filename="photo.png"');
    expect(dl.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await dl.arrayBuffer())).toEqual(PAYLOAD);

    // delete
    const del = await authedFetch(`/api/v1/files/${file.id}`, { method: "DELETE" });
    expect(del.status).toBe(200);
    expect((await del.json<{ removed: boolean }>()).removed).toBe(true);

    // gone → 404
    const after = await authedFetch(`/api/v1/files/${file.id}`);
    expect(after.status).toBe(404);
  });

  it("enforces user isolation on file access (B cannot read A's file)", async () => {
    const form = new FormData();
    form.append("file", new File([PAYLOAD], "alice-secret.png", { type: "image/png" }));
    const up = await authedFetch("/api/v1/files", { method: "POST", body: form });
    const { file: aliceFile } = await up.json<{ file: { id: string } }>();

    // Bob's list must not contain Alice's file…
    const bobList = await SELF.fetch("http://localhost/api/v1/files", {
      headers: { "X-User-Sub": "bob-files-999" },
    });
    const listed = await bobList.json<{ files: Array<{ id: string }> }>();
    expect(listed.files.some((f) => f.id === aliceFile.id)).toBe(false);

    // …and Bob's direct GET / DELETE must 404 (no existence oracle).
    const bobGet = await SELF.fetch(`http://localhost/api/v1/files/${aliceFile.id}`, {
      headers: { "X-User-Sub": "bob-files-999" },
    });
    expect(bobGet.status).toBe(404);
    const bobDel = await SELF.fetch(`http://localhost/api/v1/files/${aliceFile.id}`, {
      method: "DELETE",
      headers: { "X-User-Sub": "bob-files-999" },
    });
    expect(bobDel.status).toBe(404);

    // Alice can still read her own file (isolation was not destructive).
    const aliceGet = await authedFetch(`/api/v1/files/${aliceFile.id}`);
    expect(aliceGet.status).toBe(200);
  });

  it("rejects disallowed MIME types (400) and oversized uploads (413)", async () => {
    // Executable/unknown MIME → 400
    const badForm = new FormData();
    badForm.append("file", new File([PAYLOAD], "virus.exe", { type: "application/x-msdownload" }));
    const bad = await authedFetch("/api/v1/files", { method: "POST", body: badForm });
    expect(bad.status).toBe(400);

    // > 25 MiB → 413 (payload rejected before touching R2)
    const big = new Uint8Array(26 * 1024 * 1024);
    big.fill(7);
    const bigForm = new FormData();
    bigForm.append("file", new File([big], "huge.zip", { type: "application/zip" }));
    const exceeded = await authedFetch("/api/v1/files", { method: "POST", body: bigForm });
    expect(exceeded.status).toBe(413);
  });

  it("exposes files through the Tool Registry (MCP path) with base64 content", async () => {
    // Upload through the registry (same business logic as REST).
    const b64 = btoa(String.fromCharCode(...PAYLOAD));
    const up = await authedFetch("/api/v1/tools/file_upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "note.md", mime_type: "text/markdown", data_base64: b64 }),
    });
    expect(up.status).toBe(200);
    const uploaded = await up.json<{ result: { id: string } }>();
    expect(uploaded.result.id).toMatch(/^file_/);

    // Get with content (agent use case).
    const got = await authedFetch("/api/v1/tools/file_get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: uploaded.result.id, include_data: true }),
    });
    expect(got.status).toBe(200);
    const withData = await got.json<{ result: { data_base64: string } }>();
    expect(withData.result.data_base64).toBe(b64);
  });

  it("reset_account purges the user's files too (R2 + metadata)", async () => {
    const form = new FormData();
    form.append("file", new File([PAYLOAD], "to-wipe.txt", { type: "text/plain" }));
    const up = await authedFetch("/api/v1/files", { method: "POST", body: form });
    const { file } = await up.json<{ file: { id: string } }>();

    const reset = await authedFetch("/api/v1/tools/reset_account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    expect(reset.status).toBe(200);
    const body = await reset.json<{ result: { deleted: Record<string, number> } }>();
    expect(body.result.deleted.files).toBeGreaterThanOrEqual(1);

    const after = await authedFetch(`/api/v1/files/${file.id}`);
    expect(after.status).toBe(404);
  });
});

describe("MCP endpoint", () => {
  it("requires OAuth (401) for unauthenticated MCP requests", async () => {
    // The MCP server is gated behind the OAuth provider; an unauthenticated
    // request MUST be rejected — this is the production auth in action.
    const res = await SELF.fetch("http://localhost/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    });
    expect(res.status).toBe(401);
  });
});
