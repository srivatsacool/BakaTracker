import type { Env } from "../env";
import { AIProvider } from "./provider";
import { WorkersAIProvider } from "./workers-ai";
import { GeminiProvider } from "./google-ai";

/**
 * Resolve an AI provider from the environment.
 * Priority: Cloudflare `AI` binding → Gemini REST key → none (AI disabled).
 *
 * `AI_ENABLED=0` is a kill switch: with the flag off, no provider is
 * resolved even when a binding/key exists (deterministic `503 ai_unavailable`
 * everywhere AI is required).
 */
export function makeAIProvider(env: Env): AIProvider | undefined {
  if (env.AI_ENABLED === "0") return undefined;
  if (env.AI) return new WorkersAIProvider(env.AI, { model: env.AI_MODEL, embedModel: env.AI_EMBED_MODEL });
  if (env.GEMINI_API_KEY) return new GeminiProvider(env.GEMINI_API_KEY);
  return undefined;
}
export type { AIProvider, ChatMessage, ChatOptions } from "./provider";
export { AIUnavailableError } from "./provider";
export { AiService, AiError, AI_INPUT_MAX_CHARS, AI_OUTPUT_MAX_CHARS, AI_EMBED_MAX_CHARS } from "./service";
export type { StructuredOptions, TextOptions, AiServiceResult } from "./service";
export { SummarizeResultSchema } from "./service";
export type { SummarizeResult } from "./service";
export { BAKASUR_ALLOWED_TOOLS, BAKASUR_DENIED_TOOLS, assertBakasurAllowed } from "./bakasur";
export { BAKASUR_CORE_SYSTEM, SUMMARIZE_SYSTEM, notificationMessageSystem } from "./prompts";
