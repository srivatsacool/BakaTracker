import { AIProvider, ChatMessage, ChatOptions, AIUnavailableError } from "./provider";

/**
 * Works against Cloudflare Workers AI (`env.AI` binding). Zero external keys;
 * you just enable the binding in wrangler.jsonc. Uses a fast LLM model.
 */
export class WorkersAIProvider implements AIProvider {
  readonly name = "workders-ai";
  private baseModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

  constructor(private ai: Ai) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const out = await this.ai.run(this.baseModel, {
      messages: messages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    } as any);
    // Transcriber responses shape varies by model; handle both `response` and
    // `content` keys defensively.
    const res = (out as { response?: string; content?: string }).response
      ?? (out as { response?: string }).response
      ?? (out as any).content
      ?? "";
    if (typeof res !== "string" || res.length === 0) {
      throw new AIUnavailableError("workders-ai");
    }
    return res;
  }
}

export class AIError extends Error {
  constructor(msg: string) { super(msg); this.name = "AIError"; }
}