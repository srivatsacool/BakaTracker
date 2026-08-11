/**
 * Notes AI actions — RPC-style endpoints for the future v2.1 notepad.
 *
 * Only `summarize` is implemented this phase. Every action follows the same
 * pipeline (see docs/ai/notes-ai-actions.md):
 *
 *   authenticate (global guard) → authorize ownership (notes.get(sub, id))
 *   → bounded retrieve → AiService.generateStructured(schema) → result
 *
 * The action NEVER mutates the note. The AI service is the only place that
 * talks to the provider — routes never touch `env.AI` directly.
 */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Env } from "../env";
import { AiError, AiService, SummarizeResultSchema, SUMMARIZE_SYSTEM, AI_INPUT_MAX_CHARS, makeAIProvider } from "../ai";
import { repositories } from "../storage/repositories";

/** Build the request-scoped AI service from the environment (no live binding
 * in local dev → deterministic `ai_unavailable`). Tests inject a fake service
 * via `buildRestApp({ aiService })` instead. */
export function buildAiService(env: Env): AiService {
  return new AiService(makeAIProvider(env), { model: env.AI_MODEL, enabled: env.AI_ENABLED !== "0" });
}

/** Map the deterministic AiError taxonomy onto HTTP statuses. */
export function aiErrorStatus(e: AiError): ContentfulStatusCode {
  switch (e.code) {
    case "ai_unavailable": return 503;
    case "ai_input_too_large": return 413;
    case "ai_upstream": return 502;
    case "ai_output_invalid": return 502;
    case "ai_not_supported": return 501;
    default: return 500;
  }
}

/** Structurally identical to rest.ts's RESTBindings (no import cycle). */
type RESTBindings = Env & { OAUTH_PROVIDER: OAuthHelpers };

interface RESTVariables {
  user: { sub: string; name?: string | null; email?: string | null };
}

/**
 * POST /api/v1/notes/:id/ai/summarize
 * Summarizes ONE of the caller's own notes. Read-only.
 */
export async function handleNoteSummarize(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
): Promise<Response> {
  const user = c.get("user");
  const noteId = c.req.param("id") ?? "";

  // 1. Authorize ownership through the existing notes repository. Non-owned
  //    ids return null → 404 (existing convention; no existence oracle).
  const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
  const note = await repos.notes.get(user.sub, noteId);
  if (!note) {
    return c.json({ ok: false, error: "not_found", message: "Note not found." }, 404);
  }

  // 2. Bound the input BEFORE any model call.
  const content = `${note.title}\n\n${note.body}`;
  if (content.length > AI_INPUT_MAX_CHARS) {
    return c.json(
      {
        ok: false,
        error: "ai_input_too_large",
        message: `Note exceeds the ${AI_INPUT_MAX_CHARS}-char AI window.`,
      },
      413,
    );
  }

  // 3. Structured generation. No note mutation anywhere in this path.
  try {
    const result = await ai.generateStructured({
      system: SUMMARIZE_SYSTEM,
      user: content,
      schema: SummarizeResultSchema,
      maxTokens: 800,
      temperature: 0.3,
      context: { userId: user.sub, resourceId: noteId },
    });
    return c.json({
      ok: true,
      result: {
        summary: result.data.summary,
        key_points: result.data.key_points,
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
