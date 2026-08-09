/**
 * BakaTracker v2 — Worker environment bindings.
 *
 * Secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, COOKIE_ENCRYPTION_KEY, …)
 * are NOT typed here: they are injected via `wrangler secret put` in prod and
 * `.dev.vars` locally, and read with `env` from `cloudflare:workers`.
 */

export interface Env {
  // --- Storage -------------------------------------------------------------
  BAKA_DB: D1Database;
  OAUTH_KV: KVNamespace;
  R2_BUCKET?: R2Bucket; // optional for now — images/voice/attachments (v2.1)

  // --- Durable Objects -----------------------------------------------------
  MCP_OBJECT: DurableObjectNamespace<import("./mcp/server").MyMCP>;

  // --- AI (Workers AI binding — Gemini/llama models via Cloudflare) --------
  AI?: Ai;

  // --- App config ----------------------------------------------------------
  APP_ORIGIN: string;
  /** Comma-separated extra CORS origins beyond APP_ORIGIN (e.g. the Pages/UI origin). */
  CORS_ALLOWED_ORIGINS?: string;
  SYNC_LOCK_TTL_SECONDS?: number;
  /** Google OAuth — as a secret in prod. Injected at runtime, not typed here. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  COOKIE_ENCRYPTION_KEY?: string;
  /** Optional: Gemini REST key (alternative to the `AI` binding). */
  GEMINI_API_KEY?: string;
  /** Local dev only: "1" lets REST trust an `X-User-Sub` header. Never set in prod. */
  REST_DEV_BYPASS?: string;
}

export type { Env as WorkerEnv };
