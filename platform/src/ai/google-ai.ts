import { AIProvider, ChatMessage, ChatOptions, AIUnavailableError } from "./provider";

/**
 * Gemini via the Google Generative Language REST API (Gemini API key).
 * Alternative to the Cloudflare `AI` binding — pick whichever you prefer.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini-rest";
  readonly model = "gemini-2.0-flash";

  constructor(private apiKey: string) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    if (!this.apiKey) throw new AIUnavailableError("gemini-rest");
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role === "system" ? "user" : m.role,
      parts: [{ text: m.content }],
    }));

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: options.temperature ?? 0.7, maxOutputTokens: options.maxTokens ?? 1024 },
        }),
      },
    );
    if (!resp.ok) throw new AIError(`Gemini API error ${resp.status}: ${await resp.text()}`);
    const data = (await resp.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
    if (!text) throw new AIError("Gemini returned empty content");
    return text;
  }
}

class AIError extends Error {
  constructor(message: string) { super(message); this.name = "AIError"; }
}