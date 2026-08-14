/**
 * Notes AI actions — RPC-style endpoints for the future v2.1 notepad.
 *
 * Implemented actions (track 3C): `summarize`, `explain`, `ask`,
 * `extract-tasks`, `extract-concepts`, `generate-questions`. Every action
 * follows the same pipeline (see docs/ai/notes-ai-actions.md):
 *
 *   authenticate (global guard) → authorize ownership (notes.get(sub, id))
 *   → bounded retrieve → AiService.generateStructured(schema) → result
 *
 * The action NEVER mutates the note. The AI service is the only place that
 * talks to the provider — routes never touch `env.AI` directly.
 *
 * Input window: for excalidraw pages the model sees the interpreted page
 * representation (metadata + text only — NEVER the raw scene JSON); for text
 * notes it sees `title\n\nbody` like summarize.
 */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Env } from "../env";
import { z } from "zod";
import type { Note } from "../domain/schemas";
import {
  AiError, AiService, SummarizeResultSchema, SUMMARIZE_SYSTEM, AI_INPUT_MAX_CHARS, makeAIProvider,
  EXPLAIN_SYSTEM, ASK_SYSTEM, EXTRACT_TASKS_SYSTEM, EXTRACT_CONCEPTS_SYSTEM, GENERATE_QUESTIONS_SYSTEM,
  ExplainResultSchema, AskInputSchema, AskResultSchema, TasksResultSchema, ConceptsResultSchema,
  QuestionsResultSchema, buildPageRepresentation,
} from "../ai";
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

// --- v2.1 track 3C: read-only page AI actions --------------------------------
// All five actions share the summarize pipeline (ownership → bounded input →
// generateStructured → envelope) via `handleNoteAiAction`. They are READ-ONLY:
// no code path mutates the note.

interface NoteAiActionConfig<T extends z.ZodType> {
  /** Fixed, app-authored system prompt (never interpolated with user data). */
  system: string;
  /** Output contract — the model's JSON is validated fail-closed against it. */
  schema: T;
  maxTokens: number;
  temperature: number;
  /**
   * Optional request-body validation (e.g. `ask`). A failed check maps to
   * 400 invalid_input BEFORE any model call. Absent → no body is read.
   */
  parseBody?: (body: unknown) => { ok: true; body: unknown } | { ok: false; message: string };
  /**
   * Optional extra user-side data appended after the page content (e.g. the
   * user's question). Goes in the USER role — never the system prompt.
   */
  extraUser?: (parsedBody: unknown) => string | null;
}

/** Shared pipeline for the track 3C read-only actions. */
async function handleNoteAiAction<T extends z.ZodType>(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
  config: NoteAiActionConfig<T>,
): Promise<Response> {
  const user = c.get("user");
  const noteId = c.req.param("id") ?? "";

  // 1. Authorize ownership (same convention as summarize: 404, no oracle).
  const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
  const note = await repos.notes.get(user.sub, noteId);
  if (!note) {
    return c.json({ ok: false, error: "not_found", message: "Note not found." }, 404);
  }

  // 2. Optional body validation → 400 invalid_input.
  let parsedBody: unknown = undefined;
  if (config.parseBody) {
    const body = await c.req.json().catch(() => null);
    const check = config.parseBody(body);
    if (!check.ok) {
      return c.json({ ok: false, error: "invalid_input", message: check.message }, 400);
    }
    parsedBody = check.body;
  }

  // 3. Bound the input BEFORE any model call. Excalidraw pages are fed the
  //    interpreted representation (never the raw scene); text notes are fed
  //    title + body like summarize.
  const content = pageContent(note);
  const extra = config.extraUser ? config.extraUser(parsedBody) : null;
  const userMessage = extra ? `${content}\n\n${extra}` : content;
  if (userMessage.length > AI_INPUT_MAX_CHARS) {
    return c.json(
      {
        ok: false,
        error: "ai_input_too_large",
        message: `Note exceeds the ${AI_INPUT_MAX_CHARS}-char AI window.`,
      },
      413,
    );
  }

  // 4. Structured generation. No note mutation anywhere in this path.
  try {
    const result = await ai.generateStructured({
      system: config.system,
      user: userMessage,
      schema: config.schema,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      context: { userId: user.sub, resourceId: noteId },
    });
    const payload = Object.assign({}, result.data, { model: result.model, request_id: result.request_id });
    return c.json({ ok: true, result: payload });
  } catch (e) {
    if (e instanceof AiError) {
      return c.json({ ok: false, error: e.code, message: e.message }, aiErrorStatus(e));
    }
    return c.json({ ok: false, error: "internal", message: (e as Error).message }, 500);
  }
}

/**
 * Model-facing page content. Excalidraw pages are interpreted into a bounded,
 * metadata-only representation (raw scene JSON — coordinates, bindings, image
 * dataURLs — is never exposed to the model). Text notes keep the summarize
 * window (title + body).
 */
function pageContent(note: Note): string {
  if (note.kind === "excalidraw") {
    const rep = buildPageRepresentation({
      pageId: note.id,
      title: note.title,
      kind: note.kind,
      scene: note.scene ?? null,
      body: note.body ?? "",
    });
    return JSON.stringify(rep);
  }
  return `${note.title}\n\n${note.body ?? ""}`;
}

/**
 * POST /api/v1/notes/:id/ai/explain
 * ELI5-level breakdown of ONE of the caller's own notes/pages. Read-only.
 */
export function handleNoteExplain(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
): Promise<Response> {
  return handleNoteAiAction(c, ai, {
    system: EXPLAIN_SYSTEM,
    schema: ExplainResultSchema,
    maxTokens: 800,
    temperature: 0.3,
  });
}

/**
 * POST /api/v1/notes/:id/ai/ask
 * Answer a question from ONE of the caller's own notes/pages — answerable only
 * from the supplied content. Read-only. 400 invalid_input on a missing,
 * empty, or oversized question.
 */
export function handleNoteAsk(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
): Promise<Response> {
  return handleNoteAiAction(c, ai, {
    system: ASK_SYSTEM,
    schema: AskResultSchema,
    maxTokens: 800,
    temperature: 0.2,
    parseBody: (body) => {
      const parsed = AskInputSchema.safeParse(body ?? null);
      if (!parsed.success) {
        return { ok: false, message: "A question (1-1000 chars) is required." };
      }
      return { ok: true, body: parsed.data };
    },
    extraUser: (parsed) => `Question: ${(parsed as z.infer<typeof AskInputSchema>).question}`,
  });
}

/**
 * POST /api/v1/notes/:id/ai/extract-tasks
 * Extract task-like READ-ONLY CANDIDATES from ONE of the caller's own
 * notes/pages. Suggestions only — nothing is ever created. Read-only.
 */
export function handleNoteExtractTasks(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
): Promise<Response> {
  return handleNoteAiAction(c, ai, {
    system: EXTRACT_TASKS_SYSTEM,
    schema: TasksResultSchema,
    maxTokens: 800,
    temperature: 0.2,
  });
}

/**
 * POST /api/v1/notes/:id/ai/extract-concepts
 * Extract key concepts/terms from ONE of the caller's own notes/pages.
 * Read-only.
 */
export function handleNoteExtractConcepts(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
): Promise<Response> {
  return handleNoteAiAction(c, ai, {
    system: EXTRACT_CONCEPTS_SYSTEM,
    schema: ConceptsResultSchema,
    maxTokens: 1000,
    temperature: 0.2,
  });
}

/**
 * POST /api/v1/notes/:id/ai/generate-questions
 * Generate review/study questions from ONE of the caller's own notes/pages.
 * Read-only.
 */
export function handleNoteGenerateQuestions(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
): Promise<Response> {
  return handleNoteAiAction(c, ai, {
    system: GENERATE_QUESTIONS_SYSTEM,
    schema: QuestionsResultSchema,
    maxTokens: 800,
    temperature: 0.4,
  });
}
