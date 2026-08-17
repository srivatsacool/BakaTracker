import { AIProvider, ChatMessage, ChatOptions, AIUnavailableError } from "./provider";

/**
 * Works against Cloudflare Workers AI (`env.AI` binding). Zero external keys;
 * you just enable the binding in wrangler.jsonc. Uses a fast instruction-
 * following LLM model suitable for BakaSur.
 */
export class WorkersAIProvider implements AIProvider {
  readonly name = "workers-ai";
  readonly model: string;

  /**
   * @param ai     the `env.AI` binding
   * @param model  text-generation model override (default verified on the
   *               account: `@cf/meta/llama-3.2-1b-instruct`)
   * @param embedModel  embedding model for the future Vectorize pipeline
   *                    (default `@cf/baai/bge-base-en-v1.5`, 768-d)
   */
  constructor(
    private ai: Ai,
    options: { model?: string; embedModel?: string } = {},
  ) {
    this.model = options.model ?? "@cf/meta/llama-3.2-1b-instruct";
    this.embedModel = options.embedModel ?? "@cf/baai/bge-base-en-v1.5";
  }

  private embedModel: string;

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const out = await this.ai.run(this.model, {
      messages: messages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    } as any);
    // Response shape varies by model; handle `response` / `content` defensively.
    const res =
      (out as { response?: string }).response
      ?? (out as any).content
      ?? "";
    if (typeof res !== "string" || res.length === 0) {
      throw new AIUnavailableError("workers-ai");
    }
    return res;
  }

  /** Dense embedding via Workers AI (used by the future Vectorize pipeline). */
  async embed(text: string): Promise<number[]> {
    const out = await this.ai.run(this.embedModel, { text } as any);
    const data = (out as { data?: Array<{ embedding?: number[] }> }).data;
    const first = Array.isArray(data) ? data[0] : undefined;
    const embedding = first?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new AIUnavailableError("workers-ai");
    }
    return embedding;
  }
}

export class AIError extends Error {
  constructor(msg: string) { super(msg); this.name = "AIError"; }
}
