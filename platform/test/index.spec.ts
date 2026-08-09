import { env, SELF, applyD1Migrations } from "cloudflare:test";
import migrationSql from "../migrations/0001_init.sql?raw";
import { describe, it, expect, beforeAll } from "vitest";
import { ToolRegistry } from "../src/registry";
import { registerAll } from "../src/tools";
import { repositories } from "../src/storage/repositories";

const TEST_USER = "test-sub-123";

beforeAll(async () => {
  // D1 in the test pool starts empty — apply the real schema once. (Pool
  // v0.20 dropped the `./config` subpath, so we split the raw SQL ourselves —
  // same statements the production migrations run.)
  const queries = migrationSql
    // strip full-line AND trailing comments (e.g. `-- Google \`sub\``)
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  await applyD1Migrations(env.BAKA_DB, [{ name: "0001_init", queries }]);

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
