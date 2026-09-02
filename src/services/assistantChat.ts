/**
 * Phase 2B — BakaSur chat client service.
 *
 * Server is authoritative for AI quota; this module is the thin transport that
 * respects guest/offline modes and surfaces remaining turns.
 *
 * Contracts:
 *   Guest      → hard 3 turns/session (in-memory, never hits /assistant/chat)
 *   Offline    → 0 AI calls + deterministic replies (navigator.onLine === false)
 *   Authenticated → POST /api/v1/assistant/chat (server quota min(selected, planMax, hostCap))
 *   Self-hosted → capped by host quota AI_SELFHOSTED_QUOTA (server-enforced)
 *
 * Validation is done client-side for UX (message 1-2000, history ≤10) but the
 * server re-validates fail-closed. No plan/auth/quota value is sent from the
 * client — server derives all from the bearer sub.
 *
 * Remaining turns are read from the response's `quota` envelope and displayed
 * in the chat rail.
 */
import type { ApiClient } from "../api/apiClient";

// --- Guest session quota (3 turns, hard) -----------------------------------
const GUEST_LIMIT = 3;
const GUEST_KEY = "bt_guest_ai_turns";

function getGuestUsed(): number {
  try {
    const v = sessionStorage.getItem(GUEST_KEY);
    return v ? Math.max(0, parseInt(v, 10) || 0) : 0;
  } catch { return 0; }
}
function incGuestUsed(): number {
  const next = getGuestUsed() + 1;
  try { sessionStorage.setItem(GUEST_KEY, String(next)); } catch {}
  return next;
}
export function getGuestRemaining(): number {
  return Math.max(0, GUEST_LIMIT - getGuestUsed());
}
export function isGuestQuotaExhausted(): boolean {
  return getGuestUsed() >= GUEST_LIMIT;
}

// --- Types ------------------------------------------------------------------
export interface ChatContext {
  route?: string;
  route_name?: string;
  date?: string;
}
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
export interface ChatRequest {
  message: string;
  history?: ChatTurn[];
  context?: ChatContext;
}
export interface QuotaEnvelope {
  used: number;
  remaining: number;
  effectiveQuota: number;
  planMax?: number;
  hostCap?: number;
  date?: string;
  resetAt?: string;
}
export interface ChatSuccess {
  ok: true;
  reply: string;
  model?: string;
  request_id?: string;
  quota?: QuotaEnvelope;
}
export interface ChatFailure {
  ok: false;
  error: string;
  message?: string;
  quota?: QuotaEnvelope;
  status?: number;
}
export type ChatResult = ChatSuccess | ChatFailure;

export interface AiSettingsResponse {
  ai_turns_per_day: number;
  unlimited: boolean;
  effectiveQuota: number;
  planMax: number;
  hostCap?: number;
  date: string;
}

// --- Validation (mirrors server zod) ---------------------------------------
export function validateChatMessage(message: string): string | null {
  const t = message.trim();
  if (t.length === 0) return "A message is required.";
  if (t.length > 2000) return "Message must be 1-2000 characters.";
  return null;
}
export function validateHistory(history: ChatTurn[] | undefined): string | null {
  if (!history) return null;
  if (history.length > 10) return "History is capped at 10 turns.";
  for (const turn of history) {
    if (turn.content.length < 1 || turn.content.length > 2000) return "Each history turn must be 1-2000 chars.";
  }
  return null;
}

// --- Main client ------------------------------------------------------------
/**
 * Send a BakaSur chat turn. Returns the authoritative quota when available.
 * Guest/offline short-circuit locally — no network call.
 */
export async function sendAssistantChat(
  apiClient: ApiClient | null,
  req: ChatRequest,
  opts: { isGuest: boolean; isOffline: boolean },
): Promise<ChatResult> {
  const msgErr = validateChatMessage(req.message);
  if (msgErr) return { ok: false, error: "invalid_input", message: msgErr, status: 400 };
  const histErr = validateHistory(req.history);
  if (histErr) return { ok: false, error: "invalid_input", message: histErr, status: 400 };

  // Guest: hard 3 turns/session — local deterministic failure, no server call.
  if (opts.isGuest) {
    if (isGuestQuotaExhausted()) {
      return {
        ok: false,
        error: "quota_exceeded",
        message: `Demo limit reached (3 turns per session). Sign in for ${30} turns/day.`,
        quota: { used: GUEST_LIMIT, remaining: 0, effectiveQuota: GUEST_LIMIT },
        status: 429,
      };
    }
    // Caller will render guest deterministic reply locally; we just track.
    // But if they still want to call server, we block — guest never hits server.
    incGuestUsed();
    return {
      ok: false,
      error: "guest_mode",
      message: "Guest mode — deterministic reply only. Sign in for AI chat.",
      quota: { used: getGuestUsed(), remaining: getGuestRemaining(), effectiveQuota: GUEST_LIMIT },
      status: 200,
    };
  }

  // Offline: 0 AI calls — deterministic replies only, never call server.
  if (opts.isOffline || !apiClient) {
    return {
      ok: false,
      error: "offline",
      message: "Offline — AI is unavailable. Local guidance only.",
      quota: { used: 0, remaining: 0, effectiveQuota: 0 },
      status: 503,
    };
  }

  // Authenticated live: server is authoritative.
  try {
    const res = await apiClient.post<{
      ok: boolean;
      result?: { reply?: string; model?: string; request_id?: string };
      error?: string;
      message?: string;
      quota?: QuotaEnvelope;
    }>("/api/v1/assistant/chat", {
      message: req.message,
      history: (req.history ?? []).slice(-10),
      context: req.context,
      // Note: never send plan/quota — server ignores them.
    });
    if (res.ok && res.result?.reply) {
      return {
        ok: true,
        reply: res.result.reply,
        model: res.result.model,
        request_id: res.result.request_id,
        quota: res.quota,
      };
    }
    // Server signaled quota_exceeded or other error inside 200? (should be 4xx, but handle)
    return {
      ok: false,
      error: (res as any).error ?? "unknown",
      message: (res as any).message,
      quota: (res as any).quota,
      status: 200,
    };
  } catch (e: unknown) {
    const err = e as { status?: number; body?: unknown; message?: string };
    const status = err.status;
    const body = err.body as { error?: string; message?: string; quota?: QuotaEnvelope } | undefined;
    if (status === 429 || body?.error === "quota_exceeded") {
      return {
        ok: false,
        error: "quota_exceeded",
        message: body?.message ?? "Daily AI limit reached.",
        quota: body?.quota,
        status: 429,
      };
    }
    if (status === 400) return { ok: false, error: body?.error ?? "invalid_input", message: body?.message, quota: body?.quota, status };
    if (status === 503 || body?.error === "ai_unavailable") return { ok: false, error: "ai_unavailable", message: body?.message, quota: body?.quota, status: 503 };
    if (status === 502) return { ok: false, error: body?.error ?? "ai_upstream", message: body?.message, quota: body?.quota, status: 502 };
    return { ok: false, error: body?.error ?? "internal", message: err.message ?? "Chat failed.", quota: body?.quota, status };
  }
}

/** Fetch authoritative quota status (no consumption). */
export async function fetchAiQuota(apiClient: ApiClient): Promise<{ quota: QuotaEnvelope; settings: AiSettingsResponse } | null> {
  try {
    const res = await apiClient.get<{ ok: boolean; quota: QuotaEnvelope; settings?: AiSettingsResponse; } >("/api/v1/assistant/settings");
    if (res.ok) {
      return { quota: (res as any).quota, settings: (res as any).settings };
    }
    return null;
  } catch { return null; }
}

/** Fetch authoritative AI settings (selected + ceiling). */
export async function fetchAiSettings(apiClient: ApiClient): Promise<AiSettingsResponse & { quota: QuotaEnvelope } | null> {
  try {
    const res = await apiClient.get<{ ok: boolean; settings: AiSettingsResponse; quota: QuotaEnvelope }>("/api/v1/assistant/settings");
    if (res.ok) return { ...(res as any).settings, quota: (res as any).quota };
    return null;
  } catch { return null; }
}

/** Persist user-selected daily turns + unlimited toggle (server validates and caps by plan/host). */
export async function saveAiSettings(apiClient: ApiClient, ai_turns_per_day: number, unlimited: boolean = false): Promise<AiSettingsResponse & { quota: QuotaEnvelope } | null> {
  try {
    const res = await apiClient.put<{ ok: boolean; settings: AiSettingsResponse; quota: QuotaEnvelope }>("/api/v1/assistant/settings", { ai_turns_per_day, unlimited });
    if (res.ok) return { ...(res as any).settings, quota: (res as any).quota };
    return null;
  } catch { return null; }
}

/** Convenience: remaining turns display helper (guest 3/session vs authenticated daily). */
export function formatRemainingLabel(kind: "guest" | "offline" | "live", remaining: number, effective: number): string {
  if (kind === "offline") return "Offline · 0 AI turns";
  if (kind === "guest") return `${remaining}/${effective} demo turns left`;
  return `${remaining}/${effective} turns left today`;
}
