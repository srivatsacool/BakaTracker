import type { Env } from "../env";
import { AIProvider } from "./provider";
import { WorkersAIProvider } from "./workers-ai";
import { GeminiProvider } from "./google-ai";

/**
 * Resolve an AI provider from the environment.
 * Priority: Cloudflare `AI` binding → Gemini REST key → none (AI tools disabled).
 */
export function makeAIProvider(env: Env): AIProvider | undefined {
  if (env.AI) return new WorkersAIProvider(env.AI);
  if (env.GEMINI_API_KEY) return new GeminiProvider(env.GEMINI_API_KEY);
  return undefined;
}
export type { AIProvider, ChatMessage, ChatOptions } from "./provider";
export { AIUnavailableError } from "./provider";