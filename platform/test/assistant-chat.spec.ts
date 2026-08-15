/**
 * v2.2 — BakaSur global chat (`POST /api/v1/assistant/chat`) end-to-end over
 * the REST transport.
 *
 * Same conventions as notes-ai-actions.spec.ts: deterministic FakeProvider
 * (no live inference), bounded input → 413, AiError taxonomy → 503/502,
 * 400 invalid_input before any model call. Read-only by construction: the
 * handler never touches repositories.
 */
import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { buildRestApp, REST_PREFIX } from "../src/http/rest";
import { AiService, AI_INPUT_MAX_CHARS, CHAT_SYSTEM } from "../src/ai";
import type { AIProvider, ChatMessage, ChatOptions } from "../src/ai/provider";

const ALICE = "chat-alice";

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

const jsonReply = (reply: string) => JSON.stringify({ reply });

describe("POST /api/v1/assistant/chat", () => {
  it("returns a structured reply and feeds the model the CHAT_SYSTEM prompt", async () => {
    const provider = new FakeProvider((messages) => {
      expect(messages[0].content).toContain("You are BakaSur");
      expect(messages[1].content).toContain("Question: What should I focus on?");
      return jsonReply("Start with the operations report.");
    });
    const res = await request("/api/v1/assistant/chat", ALICE, provider, {
      message: "What should I focus on?",
      context: { route_name: "Today focus", date: "2026-08-16" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.result.reply).toBe("Start with the operations report.");
    expect(data.result.model).toBe("fake-model-1");
    expect(data.result.request_id).toBeTruthy();
  });

  it("replays the bounded transcript into the USER message", async () => {
    const provider = new FakeProvider((messages) => {
      const user = messages[1].content;
      expect(user).toContain("User: hello");
      expect(user).toContain("BakaSur: hi there");
      expect(user).toContain("Question: what now");
      return jsonReply("Keep going.");
    });
    const res = await request("/api/v1/assistant/chat", ALICE, provider, {
      message: "what now",
      history: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi there" },
      ],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).result.reply).toBe("Keep going.");
  });

  it("rejects an empty or oversized message with 400 before any model call", async () => {
    const provider = new FakeProvider(() => jsonReply("unreachable"));
    const empty = await request("/api/v1/assistant/chat", ALICE, provider, { message: "" });
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toBe("invalid_input");

    const huge = await request("/api/v1/assistant/chat", ALICE, provider, {
      message: "x".repeat(2_001),
    });
    expect(huge.status).toBe(400);
    expect(provider.calls.length).toBe(0);
  });

  it("returns 401 without an authenticated user", async () => {
    const res = await request("/api/v1/assistant/chat", undefined, new FakeProvider(() => jsonReply("nope")), {
      message: "hello",
    });
    expect(res.status).toBe(401);
  });

  it("keeps a maximum-size valid request under the AI window (413 unreachable by design)", async () => {
    // Max valid transcript: 10 turns × 2000 + question 2000 + context ≈ 22.5k
    // chars < AI_INPUT_MAX_CHARS (24k) — the zod bounds prevent the window cap
    // ever being hit, so the 413 branch is defense-in-depth, not reachable.
    const provider = new FakeProvider(() => jsonReply("ok"));
    const res = await request("/api/v1/assistant/chat", ALICE, provider, {
      message: "q".repeat(2_000),
      history: Array.from({ length: 10 }, () => ({
        role: "user" as const,
        content: "y".repeat(2_000),
      })),
    });
    expect(res.status).toBe(200);
    const userMsg = provider.calls[0].messages[1].content;
    expect(userMsg.length).toBeLessThanOrEqual(AI_INPUT_MAX_CHARS);
  });

  it("returns 503 ai_unavailable when AI is disabled (kill switch)", async () => {
    const res = await request("/api/v1/assistant/chat", ALICE, new FakeProvider(() => jsonReply("nope")), {
      message: "hello",
    }, { enabled: false });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("ai_unavailable");
  });

  it("returns 502 ai_upstream when the provider fails, secrets redacted", async () => {
    const provider = new FakeProvider(() => {
      throw new Error("upstream exploded with api_key=SECRET123 and Bearer TOKEN9");
    });
    const res = await request("/api/v1/assistant/chat", ALICE, provider, { message: "hello" });
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe("ai_upstream");
    expect(data.message).not.toContain("SECRET123"); // redacted
    expect(data.message).not.toContain("TOKEN9"); // redacted
  });
});
