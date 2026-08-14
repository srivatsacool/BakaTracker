/**
 * AI Service — the application-level AI contract (v2.1).
 *
 * Business logic (routes, tools, the notification engine) talks ONLY to this
 * service; it never calls `env.AI` or a provider directly. The provider
 * (`src/ai/provider.ts`) remains a pure transport.
 *
 * Guarantees:
 *   - authenticated user context (passed via `context` for scoping + logging)
 *   - bounded input  (`AI_INPUT_MAX_CHARS`)
 *   - bounded output (maxTokens + hard char caps + zod output schemas)
 *   - deterministic error taxonomy (`AiError.code`)
 *   - structured JSON results, validated by zod (fail-closed)
 *   - secret-safe logging: request_id / user / resource / char counts / model
 *     — never note content, tokens, or emails.
 */
import { z } from "zod";
import { AIProvider, AIUnavailableError } from "./provider";

/** Maximum prompt input accepted by any AI call (title + body window). */
export const AI_INPUT_MAX_CHARS = 24_000;
/** Hard cap on raw model output before JSON extraction (safety net). */
export const AI_OUTPUT_MAX_CHARS = 8_000;
/** Default max tokens for structured generation. */
export const AI_DEFAULT_MAX_TOKENS = 800;
/** Default embedding text window (bge models tokenize ~512 tokens). */
export const AI_EMBED_MAX_CHARS = 8_000;

export type AiErrorCode =
  | "ai_unavailable" // no provider / disabled / flag off
  | "ai_input_too_large" // bounded-input violation (413)
  | "ai_upstream" // provider/model call failed (502)
  | "ai_output_invalid" // output failed JSON/char/zod validation (502)
  | "ai_not_supported"; // capability not offered by the provider (501)

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

/** Structured result of the notes `summarize` action (v2.1 contract). */
export const SummarizeResultSchema = z.object({
  summary: z.string().min(1).max(2_000),
  key_points: z.array(z.string().min(1).max(200)).min(1).max(8),
});
export type SummarizeResult = z.infer<typeof SummarizeResultSchema>;

// --- v2.1 track 3C: read-only page AI actions -------------------------------
// Every result schema below is zod-validated fail-closed (exact bounds from
// the phase8 design). All five actions are READ-ONLY: they never mutate notes.

/** Structured result of the notes `explain` action (ELI5 breakdown). */
export const ExplainResultSchema = z.object({
  explanation: z.string().min(1).max(2_000),
});
export type ExplainResult = z.infer<typeof ExplainResultSchema>;

/** Input contract for the notes `ask` action. */
export const AskInputSchema = z.object({
  question: z.string().min(1).max(1_000),
});
export type AskInput = z.infer<typeof AskInputSchema>;

/** Structured result of the notes `ask` action. */
export const AskResultSchema = z.object({
  answer: z.string().min(1).max(2_000),
  confidence: z.string().max(100).optional(),
});
export type AskResult = z.infer<typeof AskResultSchema>;

/** Structured result of the notes `extract-tasks` action — READ-ONLY candidate
 * suggestions only; the AI never creates tasks. Empty arrays are valid (a note
 * may contain no task-like items). */
export const TasksResultSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string().min(1).max(200),
      due: z.string().max(50).optional(),
      priority: z.string().max(50).optional(),
    }),
  ).max(20),
});
export type TasksResult = z.infer<typeof TasksResultSchema>;

/** Structured result of the notes `extract-concepts` action. */
export const ConceptsResultSchema = z.object({
  concepts: z.array(
    z.object({
      term: z.string().min(1).max(100),
      definition: z.string().min(1).max(400),
      references: z.array(z.string().min(1).max(200)).max(10),
    }),
  ).max(15),
});
export type ConceptsResult = z.infer<typeof ConceptsResultSchema>;

/** Structured result of the notes `generate-questions` action. */
export const QuestionsResultSchema = z.object({
  questions: z.array(z.string().min(1).max(200)).max(10),
});
export type QuestionsResult = z.infer<typeof QuestionsResultSchema>;

export interface StructuredOptions<T extends z.ZodType> {
  /** Fixed, app-authored system prompt. Never contains user/model text. */
  system: string;
  /** User data — treated as DATA by the model, never as instructions. */
  user: string;
  /** Output contract; the model's best-effort JSON is validated against it. */
  schema: T;
  maxTokens?: number;
  temperature?: number;
  /** Logging/scoping context (ids only — never content). */
  context?: { userId?: string; resourceId?: string };
}

export interface TextOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  context?: { userId?: string; resourceId?: string };
}

export interface AiServiceResult<T> {
  data: T;
  model: string;
  request_id: string;
}

/**
 * Thin application service over `AIProvider`.
 *
 * Construct per request: `new AiService(makeAIProvider(env), { model: env.AI_MODEL })`.
 * Tests inject a fake service (or a fake provider) at this boundary — no live
 * model inference anywhere in the test suite.
 */
export class AiService {
  constructor(
    private readonly provider: AIProvider | undefined,
    private readonly opts: { model?: string; enabled?: boolean } = {},
  ) {}

  /** True when inference can run (provider present and not flag-disabled). */
  get available(): boolean {
    return !!this.provider && this.opts.enabled !== false;
  }

  /** Resolved model name for reporting (never a secret). */
  get model(): string {
    return this.opts.model ?? this.provider?.model ?? this.provider?.name ?? "unknown";
  }

  async generateStructured<T extends z.ZodType>(
    options: StructuredOptions<T>,
  ): Promise<AiServiceResult<z.infer<T>>> {
    const rid = crypto.randomUUID();
    this.assertAvailable();

    const user = options.user ?? "";
    if (user.length > AI_INPUT_MAX_CHARS) {
      this.log(rid, options, `err=ai_input_too_large in=${user.length}`);
      throw new AiError("ai_input_too_large", `Input exceeds the ${AI_INPUT_MAX_CHARS}-char AI window.`);
    }

    const started = Date.now();
    let raw: string;
    try {
      raw = await this.provider!.chat(
        [
          { role: "system", content: options.system },
          { role: "user", content: user },
        ],
        {
          maxTokens: options.maxTokens ?? AI_DEFAULT_MAX_TOKENS,
          temperature: options.temperature ?? 0.3,
        },
      );
    } catch (e) {
      const code = e instanceof AIUnavailableError ? "ai_unavailable" : "ai_upstream";
      this.log(rid, options, `err=${code} ms=${Date.now() - started}`);
      throw e instanceof AiError ? e : new AiError(code, sanitizeProviderError(e));
    }

    if (raw.length > AI_OUTPUT_MAX_CHARS) {
      this.log(rid, options, `err=ai_output_invalid out=${raw.length}`);
      throw new AiError("ai_output_invalid", `Model output exceeded the ${AI_OUTPUT_MAX_CHARS}-char cap.`);
    }

    const parsed = extractJson(raw);
    if (!parsed.ok) {
      this.log(rid, options, "err=ai_output_invalid json=unparseable");
      throw new AiError("ai_output_invalid", "Model output was not valid JSON.");
    }
    const result = options.schema.safeParse(parsed.value);
    if (!result.success) {
      this.log(rid, options, "err=ai_output_invalid schema=zod");
      throw new AiError("ai_output_invalid", `Model output failed schema validation: ${result.error.message}`);
    }

    this.log(rid, options, `ok ms=${Date.now() - started} out=${raw.length}`);
    return { data: result.data, model: this.model, request_id: rid };
  }

  /** Unstructured, bounded text generation (future actions: rewrite, expand…). */
  async generateText(options: TextOptions): Promise<AiServiceResult<string>> {
    const rid = crypto.randomUUID();
    this.assertAvailable();

    const user = options.user ?? "";
    if (user.length > AI_INPUT_MAX_CHARS) {
      this.log(rid, options, `err=ai_input_too_large in=${user.length}`);
      throw new AiError("ai_input_too_large", `Input exceeds the ${AI_INPUT_MAX_CHARS}-char AI window.`);
    }

    const started = Date.now();
    let raw: string;
    try {
      raw = await this.provider!.chat(
        [
          { role: "system", content: options.system },
          { role: "user", content: user },
        ],
        {
          maxTokens: options.maxTokens ?? AI_DEFAULT_MAX_TOKENS,
          temperature: options.temperature ?? 0.5,
        },
      );
    } catch (e) {
      const code = e instanceof AIUnavailableError ? "ai_unavailable" : "ai_upstream";
      this.log(rid, options, `err=${code} ms=${Date.now() - started}`);
      throw e instanceof AiError ? e : new AiError(code, sanitizeProviderError(e));
    }

    if (raw.length > AI_OUTPUT_MAX_CHARS) {
      this.log(rid, options, `err=ai_output_invalid out=${raw.length}`);
      throw new AiError("ai_output_invalid", `Model output exceeded the ${AI_OUTPUT_MAX_CHARS}-char cap.`);
    }

    this.log(rid, options, `ok ms=${Date.now() - started} out=${raw.length}`);
    return { data: raw.trim(), model: this.model, request_id: rid };
  }

  /** Embedding contract for the future Vectorize pipeline (not wired yet). */
  async generateEmbedding(text: string): Promise<{ embedding: number[]; model: string; request_id: string }> {
    const rid = crypto.randomUUID();
    this.assertAvailable();
    if (text.length > AI_EMBED_MAX_CHARS) {
      throw new AiError("ai_input_too_large", `Embedding input exceeds the ${AI_EMBED_MAX_CHARS}-char window.`);
    }
    if (!this.provider!.embed) {
      throw new AiError("ai_not_supported", "The active AI provider does not offer embeddings.");
    }
    try {
      const embedding = await this.provider!.embed(text);
      return { embedding, model: this.model, request_id: rid };
    } catch (e) {
      throw e instanceof AiError ? e : new AiError("ai_upstream", sanitizeProviderError(e));
    }
  }

  private assertAvailable(): void {
    if (!this.available) {
      throw new AiError("ai_unavailable", "Workers AI is not configured or is disabled.");
    }
  }

  private log(rid: string, ctx: { context?: { userId?: string; resourceId?: string } }, detail: string): void {
    // Sanitized by construction: ids + counts + outcome only. Never content.
    console.log(
      `[ai] request_id=${rid} user=${ctx.context?.userId ?? "-"} resource=${ctx.context?.resourceId ?? "-"} model=${this.model} ${detail}`,
    );
  }
}

/** Best-effort JSON extraction: direct parse, fenced block, or first {...} span. */
function extractJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  const text = raw.trim();
  if (!text) return { ok: false };

  const candidates: string[] = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.unshift(fence[1].trim());
  const span = text.match(/\{[\s\S]*\}/);
  if (span) candidates.push(span[0]);

  for (const candidate of candidates) {
    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch {
      // try the next candidate
    }
  }
  return { ok: false };
}

/** Never propagate raw provider error bodies into logs/responses. */
function sanitizeProviderError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const truncated = msg.length > 200 ? `${msg.slice(0, 200)}…` : msg;
  return truncated
    .replace(/(api[_-]?key|secret|token|password|authorization)\s*[:=]\s*\S+/gi, "<redacted>")
    .replace(/Bearer\s+\S+/gi, "Bearer <redacted>");
}
