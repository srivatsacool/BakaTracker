/**
 * Track 3C — five read-only page AI actions (explain, ask, extract-tasks,
 * extract-concepts, generate-questions) end-to-end over the REST transport.
 *
 * Same conventions as ai-notes.spec.ts: deterministic FakeProvider (no live
 * inference), ownership via repos.notes.get, bounded input → 413, AiError
 * taxonomy → 503/502. Plus: for excalidraw pages the model's USER message is
 * the interpreted page representation — never the raw scene JSON.
 */
import { env, applyD1Migrations } from "cloudflare:test";
import migrationSql from "../migrations/0001_init.sql?raw";
import migrationFilesSql from "../migrations/0002_files.sql?raw";
import migrationPagesSql from "../migrations/0003_notes_pages.sql?raw";
import { splitSqlStatements } from "../scripts/sql-split.mjs";
import { describe, it, expect, beforeAll } from "vitest";
import { Hono } from "hono";
import { buildRestApp, REST_PREFIX } from "../src/http/rest";
import { repositories } from "../src/storage/repositories";
import { AiService, AI_INPUT_MAX_CHARS } from "../src/ai";
import type { AIProvider, ChatMessage, ChatOptions } from "../src/ai/provider";

const ALICE = "ai3c-alice";
const BOB = "ai3c-bob";

/** Deterministic fake transport — the ONLY kind of inference in this suite. */
class FakeProvider implements AIProvider {
  readonly name = "fake";
  readonly model = "fake-model-1";
  calls: Array<{ messages: ChatMessage[]; options?: ChatOptions }> = [];
  constructor(
    private respond: (messages: ChatMessage[], options?: ChatOptions) => string | Promise<string>,
  ) {}
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    this.calls.push({ messages, options });
    return this.respond(messages, options);
  }
  async embed(text: string): Promise<number[]> {
    return Array.from({ length: 4 }, (_, i) => text.length + i);
  }
}

function mountedApp(provider: AIProvider | undefined, opts?: { enabled?: boolean }) {
  const ai = new AiService(provider, { model: "fake-model-1", enabled: opts?.enabled });
  const api = new Hono();
  api.route(REST_PREFIX, buildRestApp({ aiService: ai }));
  return { app: api, ai };
}

async function request(
  path: string,
  sub: string | undefined,
  provider: AIProvider | undefined,
  body?: unknown,
  opts?: { enabled?: boolean },
) {
  const { app } = mountedApp(provider, opts);
  return app.request(
    `http://localhost${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(sub ? { "X-User-Sub": sub } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    env as any,
  );
}

/** Marker buried in the raw scene; must never reach the model. */
const FIXTURE_MARKER = "fixture-secret-marker";

/** Scene whose raw JSON is full of model-hostile internals. */
function drawScene(): string {
  return JSON.stringify({
    type: "excalidraw",
    version: 4,
    elements: [
      { id: "d_title", type: "text", text: "Canvas brain dump", isDeleted: false },
      { id: "d_rect", type: "rectangle", text: "The box", backgroundColor: FIXTURE_MARKER, isDeleted: false },
      {
        id: "d_arrow", type: "arrow",
        startBinding: { elementId: "d_title" }, endBinding: { elementId: "d_rect" },
        isDeleted: false,
      },
      { id: "d_img", type: "image", fileId: "draw_file", isDeleted: false },
    ],
    files: {
      draw_file: { mimeType: "image/png", dataURL: "data:image/png;base64,QQ==" },
    },
    appState: { viewBackgroundColor: FIXTURE_MARKER },
  });
}

beforeAll(async () => {
  await applyD1Migrations(env.BAKA_DB, [
    { name: "0001_init.sql", queries: splitSqlStatements(migrationSql) },
    { name: "0002_files.sql", queries: splitSqlStatements(migrationFilesSql) },
    { name: "0003_notes_pages.sql", queries: splitSqlStatements(migrationPagesSql) },
  ]);

  const repos = repositories(env.BAKA_DB);
  const now = new Date().toISOString();
  await repos.notes.upsert({
    id: "note_text_ok", user_id: ALICE, title: "Grocery run", body: "Buy milk, eggs, and bread on the way home.",
    created_at: now, updated_at: now,
  });
  await repos.notes.upsert({
    id: "note_text_big", user_id: ALICE, title: "Big", body: "x".repeat(AI_INPUT_MAX_CHARS),
    created_at: now, updated_at: now,
  });
  await repos.notes.upsert({
    id: "note_alice_priv", user_id: ALICE, title: "Alice only", body: "secret",
    created_at: now, updated_at: now,
  });
  await repos.notes.upsert({
    id: "note_draw_ok", user_id: ALICE, title: "Canvas brain dump", body: "",
    kind: "excalidraw", scene: drawScene(),
    created_at: now, updated_at: now,
  });
});

interface ActionCase {
  action: string;
  /** Request body (required by `ask`; ignored by the others). */
  body?: unknown;
  /** Deterministic model reply matching the action's result schema. */
  json: () => string;
  /** Assert the 200-envelope's `result` payload. */
  checkResult: (result: Record<string, unknown>) => void;
}

const ACTION_CASES: ActionCase[] = [
  {
    action: "explain",
    json: () => JSON.stringify({ explanation: "This note is about buying groceries." }),
    checkResult: (r) => expect(r.explanation).toBe("This note is about buying groceries."),
  },
  {
    action: "ask",
    body: { question: "What should I buy?" },
    json: () => JSON.stringify({ answer: "Milk, eggs, and bread.", confidence: "high" }),
    checkResult: (r) => {
      expect(r.answer).toBe("Milk, eggs, and bread.");
      expect(r.confidence).toBe("high");
    },
  },
  {
    action: "extract-tasks",
    json: () =>
      JSON.stringify({ tasks: [{ title: "Buy milk", due: "Friday", priority: "high" }, { title: "Buy eggs" }] }),
    checkResult: (r) => {
      expect((r.tasks as Array<{ title: string }>).length).toBe(2);
      expect((r.tasks as Array<{ title: string }>)[0].title).toBe("Buy milk");
    },
  },
  {
    action: "extract-concepts",
    json: () =>
      JSON.stringify({ concepts: [{ term: "milk", definition: "a dairy product", references: ["Buy milk"] }] }),
    checkResult: (r) => {
      expect((r.concepts as Array<{ term: string }>)[0].term).toBe("milk");
    },
  },
  {
    action: "generate-questions",
    json: () => JSON.stringify({ questions: ["What should I buy?", "Where is the store?"] }),
    checkResult: (r) => {
      expect((r.questions as string[]).length).toBe(2);
    },
  },
];

describe("POST /api/v1/notes/:id/ai/<action> (track 3C, integration)", () => {
  for (const ac of ACTION_CASES) {
    describe(`action: ${ac.action}`, () => {
      it("200: returns the deterministic result envelope for a text note", async () => {
        const provider = new FakeProvider(ac.json);
        const { app } = mountedApp(provider);
        const res = await app.request(
          `http://localhost/api/v1/notes/note_text_ok/ai/${ac.action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-User-Sub": ALICE },
            body: ac.body === undefined ? undefined : JSON.stringify(ac.body),
          },
          env as any,
        );
        expect(res.status).toBe(200);
        const body = await res.json<{ ok: boolean; result: Record<string, unknown> & { model: string; request_id: string } }>();
        expect(body.ok).toBe(true);
        ac.checkResult(body.result);
        expect(body.result.model).toBe("fake-model-1");
        expect(body.result.request_id).toMatch(/^[0-9a-f-]{36}$/i);

        // The note reached the model as USER data with the fixed system prompt.
        const [systemMsg, userMsg] = provider.calls[0].messages;
        expect(systemMsg.role).toBe("system");
        expect(systemMsg.content).toContain("BakaSur");
        expect(userMsg.content).toContain("Grocery run");
        expect(userMsg.content).toContain("Buy milk, eggs, and bread");
      });

      it("200: excalidraw page feeds the interpreted representation, never the raw scene", async () => {
        const provider = new FakeProvider(ac.json);
        const { app } = mountedApp(provider);
        const res = await app.request(
          `http://localhost/api/v1/notes/note_draw_ok/ai/${ac.action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-User-Sub": ALICE },
            body: ac.body === undefined ? undefined : JSON.stringify(ac.body),
          },
          env as any,
        );
        expect(res.status).toBe(200);

        const [systemMsg, userMsg] = provider.calls[0].messages;
        expect(systemMsg.role).toBe("system");
        // Representation fields ARE present (the model sees the interpretation).
        expect(userMsg.content).toContain("page_id");
        expect(userMsg.content).toContain("note_draw_ok");
        expect(userMsg.content).toContain("element_counts");
        expect(userMsg.content).toContain("Canvas brain dump");
        // Raw scene JSON is NEVER exposed: bindings, image payloads, markers.
        expect(userMsg.content).not.toContain("startBinding");
        expect(userMsg.content).not.toContain(FIXTURE_MARKER);
        expect(userMsg.content).not.toContain("dataURL");
        expect(userMsg.content).not.toContain("QQ==");
        expect(userMsg.content).not.toContain('"elements"');
      });

      it("401 without credentials", async () => {
        const res = await request(`/api/v1/notes/note_text_ok/ai/${ac.action}`, undefined, undefined, ac.body);
        expect(res.status).toBe(401);
      });

      it("404 for a nonexistent note", async () => {
        const res = await request(`/api/v1/notes/does_not_exist/ai/${ac.action}`, ALICE, new FakeProvider(ac.json), ac.body);
        expect(res.status).toBe(404);
        expect((await res.json<{ error: string }>()).error).toBe("not_found");
      });

      it("404 for another user's note (ownership, no existence oracle)", async () => {
        const res = await request(`/api/v1/notes/note_alice_priv/ai/${ac.action}`, BOB, new FakeProvider(ac.json), ac.body);
        expect(res.status).toBe(404);
        expect((await res.json<{ error: string }>()).error).toBe("not_found");
      });

      it("413 for an oversized text note (bounded input, before any model call)", async () => {
        const provider = new FakeProvider(ac.json);
        const res = await request(`/api/v1/notes/note_text_big/ai/${ac.action}`, ALICE, provider, ac.body);
        expect(res.status).toBe(413);
        expect((await res.json<{ error: string }>()).error).toBe("ai_input_too_large");
        expect(provider.calls.length).toBe(0); // no model call happened
      });

      it("503 ai_unavailable when AI is disabled", async () => {
        const res = await request(`/api/v1/notes/note_text_ok/ai/${ac.action}`, ALICE, new FakeProvider(ac.json), ac.body, { enabled: false });
        expect(res.status).toBe(503);
        expect((await res.json<{ error: string }>()).error).toBe("ai_unavailable");

        const noProvider = await request(`/api/v1/notes/note_text_ok/ai/${ac.action}`, ALICE, undefined, ac.body);
        expect(noProvider.status).toBe(503);
      });

      it("502 when the provider throws", async () => {
        const res = await request(
          `/api/v1/notes/note_text_ok/ai/${ac.action}`, ALICE,
          new FakeProvider(() => { throw new Error("upstream boom"); }),
          ac.body,
        );
        expect(res.status).toBe(502);
        expect((await res.json<{ error: string }>()).error).toBe("ai_upstream");
      });
    });
  }
});

describe("POST /api/v1/notes/:id/ai/ask — input validation (400 invalid_input)", () => {
  const providerJson = () => JSON.stringify({ answer: "a", confidence: "low" });

  it("rejects a missing body", async () => {
    const res = await request("/api/v1/notes/note_text_ok/ai/ask", ALICE, new FakeProvider(providerJson));
    expect(res.status).toBe(400);
    expect((await res.json<{ error: string }>()).error).toBe("invalid_input");
  });

  it("rejects a missing question", async () => {
    const res = await request("/api/v1/notes/note_text_ok/ai/ask", ALICE, new FakeProvider(providerJson), {});
    expect(res.status).toBe(400);
    expect((await res.json<{ error: string }>()).error).toBe("invalid_input");
  });

  it("rejects an empty question", async () => {
    const res = await request("/api/v1/notes/note_text_ok/ai/ask", ALICE, new FakeProvider(providerJson), { question: "" });
    expect(res.status).toBe(400);
  });

  it("rejects an oversized question (>1000 chars)", async () => {
    const res = await request(
      "/api/v1/notes/note_text_ok/ai/ask", ALICE, new FakeProvider(providerJson),
      { question: "q".repeat(1001) },
    );
    expect(res.status).toBe(400);
    expect((await res.json<{ error: string }>()).error).toBe("invalid_input");
  });

  it("passes the question through as USER data (never the system prompt)", async () => {
    const provider = new FakeProvider(providerJson);
    const { app } = mountedApp(provider);
    const res = await app.request(
      "http://localhost/api/v1/notes/note_text_ok/ai/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Sub": ALICE },
        body: JSON.stringify({ question: "What should I buy?" }),
      },
      env as any,
    );
    expect(res.status).toBe(200);
    const [systemMsg, userMsg] = provider.calls[0].messages;
    expect(systemMsg.content).not.toContain("What should I buy?");
    expect(userMsg.content).toContain("What should I buy?");
    expect(userMsg.content).toContain("Grocery run");
  });

  it("still 404s before body validation when the note is not owned", async () => {
    const res = await request(
      "/api/v1/notes/note_alice_priv/ai/ask", BOB, new FakeProvider(providerJson),
      { question: "anything" },
    );
    expect(res.status).toBe(404);
  });
});

describe("extract-tasks — read-only guarantee in the system prompt", () => {
  it("instructs the model that tasks are candidates only and never created", async () => {
    const provider = new FakeProvider(() => JSON.stringify({ tasks: [] }));
    const { app } = mountedApp(provider);
    const res = await app.request(
      "http://localhost/api/v1/notes/note_text_ok/ai/extract-tasks",
      { method: "POST", headers: { "X-User-Sub": ALICE } },
      env as any,
    );
    expect(res.status).toBe(200);
    const [systemMsg] = provider.calls[0].messages;
    expect(systemMsg.content).toContain("READ-ONLY");
    expect(systemMsg.content).toContain("NOT creating tasks");
  });
});
