/**
 * AI layer — provider abstraction (v2.0 spec: `interface AIProvider`).
 *
 * The rest of the system talks ONLY to this interface, so Gemini (Workers AI
 * or REST), OpenAI, Claude, Ollama, or a local model can be swapped in without
 * touching any tool code.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  /** Returns a dense embedding vector for semantic search (v2.1). */
  embed?(text: string): Promise<number[]>;
  /** Returns a textual description of an image (v2.1 voice/vision). */
  vision?(image: ArrayBuffer, mimeType: string, prompt?: string): Promise<string>;
}

/** Provider is present but not configured (no key / no binding). */
export class AIUnavailableError extends Error {
  constructor(provider: string) {
    super(`AI provider "${provider}" is not configured. Set a binding/key to enable AI tools.`);
    this.name = "AIUnavailableError";
  }
}