/**
 * BakaSur global assistant chat — the v2.2 REST contract the UI has been
 * calling since the frontend completion plan.
 *
 * Pipeline (mirrors notes-ai.ts):
 *
 *   authenticate (global guard) → validate body (zod, 400) → bound input
 *   (AI_INPUT_MAX_CHARS, 413) → AiService.generateStructured(CHAT_SYSTEM)
 *   → envelope { ok, result: { reply, model, request_id } }
 *
 * The AI service is the only place that talks to the provider — routes never
 * touch `env.AI` directly. Everything in the USER message is DATA: page
 * context, transcript, and the question are rebuilt server-side, never
 * interpolated into the constant system prompt.
 */
import type { Context } from "hono";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Env } from "../env";
import {
  AiError, AiService, AI_INPUT_MAX_CHARS,
  CHAT_SYSTEM, ChatInputSchema, ChatResultSchema,
} from "../ai";
import { aiErrorStatus } from "./notes-ai";

/** Structurally identical to rest.ts's RESTBindings (no import cycle). */
type RESTBindings = Env & { OAUTH_PROVIDER: OAuthHelpers };

interface RESTVariables {
  user: { sub: string; name?: string | null; email?: string | null };
}

/**
 * POST /api/v1/assistant/chat
 * BakaSur answers a question over the caller's supplied context + transcript.
 * Read-only: no data is read or mutated beyond the request body itself.
 */
export async function handleAssistantChat(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
): Promise<Response> {
  const user = c.get("user");

  // 1. Validate the request body BEFORE any model call (fail-closed).
  const body = await c.req.json().catch(() => null);
  const parsed = ChatInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        message: "A message (1-2000 chars) is required; history is capped at 10 turns.",
      },
      400,
    );
  }
  const { message, history, context } = parsed.data;

  // 2. Rebuild the USER message from bounded parts: page context, transcript,
  //    question. Never the system prompt.
  const ctxLine = context?.route_name
    ? `Page: ${context.route_name}${context.date ? ` · ${context.date}` : ""}`
    : "";
  const transcript = history
    .map((turn) => `${turn.role === "user" ? "User" : "BakaSur"}: ${turn.content}`)
    .join("\n");
  const userMessage = [ctxLine, transcript ? `Recent conversation:\n${transcript}` : "", `Question: ${message}`]
    .filter(Boolean)
    .join("\n\n");

  if (userMessage.length > AI_INPUT_MAX_CHARS) {
    return c.json(
      {
        ok: false,
        error: "ai_input_too_large",
        message: `Chat exceeds the ${AI_INPUT_MAX_CHARS}-char AI window.`,
      },
      413,
    );
  }

  // 3. Structured generation. Read-only; no ledger access in this path.
  try {
    const result = await ai.generateStructured({
      system: CHAT_SYSTEM,
      user: userMessage,
      schema: ChatResultSchema,
      maxTokens: 900,
      temperature: 0.5,
      context: { userId: user.sub, resourceId: "assistant-chat" },
    });
    return c.json({
      ok: true,
      result: {
        reply: result.data.reply,
        model: result.model,
        request_id: result.request_id,
      },
    });
  } catch (e) {
    if (e instanceof AiError) {
      return c.json({ ok: false, error: e.code, message: e.message }, aiErrorStatus(e));
    }
    return c.json({ ok: false, error: "internal", message: (e as Error).message }, 500);
  }
}
