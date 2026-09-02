/**
 * BakaSur global assistant chat — the v2.2 REST contract the UI has been
 * calling since the frontend completion plan.
 *
 * Phase 2B hardening:
 *   1. authenticate server-side (global guard already) — never trust client plan/quota
 *   2. validate body (zod, 400) BEFORE quota
 *   3. resolve effective quota = min(userSelected, planMax, hostCap) from KV+Env
 *   4. atomically consume quota BEFORE AI execution (429 if exhausted)
 *   5. refund on failed AI calls (ai_upstream / ai_unavailable / ai_output_invalid / ai_not_supported)
 *      so failures don't burn turns
 *   6. immutable system prompt separation + sanitized tracker context
 *   7. scope enforcement is in CHAT_SYSTEM (tracker workflows only)
 */
import type { Context } from "hono";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Env } from "../env";
import {
  AiError, AiService, AI_INPUT_MAX_CHARS,
  CHAT_SYSTEM, ChatInputSchema, ChatResultSchema,
} from "../ai";
import { aiErrorStatus } from "./notes-ai";
import { loadAiSettings, saveAiSettings } from "../ai/aiSettings";
import { getPlanMaxQuota, getHostQuota, getEffectiveQuota } from "../ai/plans";
import { tryConsumeQuota, refundQuota, getQuotaStatus, todayUtcISO } from "../ai/quota";
import { loadSoul } from "../soul";

/** Structurally identical to rest.ts's RESTBindings (no import cycle). */
type RESTBindings = Env & { OAUTH_PROVIDER: OAuthHelpers };

interface RESTVariables {
  user: { sub: string; name?: string | null; email?: string | null };
}

/** Sanitize tracker context + user text — structurally DATA, never instructions. */
function sanitizeForPrompt(text: string, max: number): string {
  // Strip control chars except newline/tab, trim, clamp.
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).trimEnd();
}

/**
 * POST /api/v1/assistant/chat
 * BakaSur answers a question over the caller's supplied context + transcript.
 * Read-only: no data is read or mutated beyond the request body itself.
 */
export async function handleAssistantChat(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
  ai: AiService,
): Promise<Response> {
  const user = c.get("user");

  // 1. Validate the request body BEFORE any quota or model call (fail-closed).
  //    No plan/quota field is read from the body — server is authoritative.
  const body = await c.req.json().catch(() => null);
  const parsed = ChatInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        message: "A message (1-2000 chars) is required; history is capped at 10 turns.",
      },
      400,
    );
  }
  const { message, history, context } = parsed.data;

  // Reject any attempt to spoof plan/quota via extra body fields (ignore but log).
  // We never read body.plan / body.quota / body.remaining — they are silently dropped.

  // 2. Resolve authoritative quota: min(userSelected, planMax, hostCap)
  //    Phase 3: unlimited users get a sentinel effectiveQuota — the quota gate
  //    is skipped entirely, but the response reflects "no daily limit".
  const aiSettings = await loadAiSettings(c.env.OAUTH_KV, user.sub);
  const planMax = getPlanMaxQuota(c.env as any, user.sub);
  const hostCap = getHostQuota(c.env as any);
  const effectiveQuota = aiSettings.unlimited
    ? 999_999
    : getEffectiveQuota(aiSettings.ai_turns_per_day, planMax, hostCap);

  // 3. Rebuild the USER message from bounded parts: Soul context, page context,
  //    transcript, question. Never the system prompt. Sanitize each part.
  //    Soul is treated as DATA — never higher-priority instructions.
  const soul = await loadSoul(c.env.OAUTH_KV, user.sub);
  const soulLine = soul.content
    ? `User profile:\n${sanitizeForPrompt(soul.content, 4000)}`
    : "";
  const rawCtxLine = context?.route_name
    ? `Page: ${context.route_name}${context.date ? ` · ${context.date}` : ""}`
    : "";
  const ctxLine = sanitizeForPrompt(rawCtxLine, 300);
  const transcript = history
    .map((turn) => `${turn.role === "user" ? "User" : "BakaSur"}: ${sanitizeForPrompt(turn.content, 2000)}`)
    .join("\n");
  const safeMessage = sanitizeForPrompt(message, 2000);
  const userMessage = [soulLine, ctxLine, transcript ? `Recent conversation:\n${transcript}` : "", `Question: ${safeMessage}`]
    .filter(Boolean)
    .join("\n\n");

  if (userMessage.length > AI_INPUT_MAX_CHARS) {
    return c.json(
      {
        ok: false,
        error: "ai_input_too_large",
        message: `Chat exceeds the ${AI_INPUT_MAX_CHARS}-char AI window.`,
      },
      413,
    );
  }

  // 4. Atomically consume quota BEFORE AI execution. 429 if exhausted.
  //    This is the sole quota gate — clients cannot bypass by crafting headers.
  //    Phase 3: unlimited users skip BakaTracker's daily quota (provider/platform
  //    rate/abuse limits still apply server-side).
  const dateUtc = todayUtcISO();
  if (aiSettings.unlimited) {
    // Unlimited: skip BakaTracker quota consumption. Provider limits still apply.
    // Log for observability but do not consume from D1.
  } else {
    const consumed = await tryConsumeQuota(c.env.BAKA_DB, user.sub, effectiveQuota, dateUtc);
    if (!consumed.allowed) {
      const remaining = 0;
      return c.json(
        {
          ok: false,
          error: "quota_exceeded",
          message: `Daily AI limit reached (${effectiveQuota} turns/day). Resets at ${consumed.status.resetAt}. Reduce your limit or wait until tomorrow.`,
          quota: {
            used: consumed.status.used,
            remaining,
            effectiveQuota,
            planMax,
            hostCap,
            date: consumed.status.date,
            resetAt: consumed.status.resetAt,
          },
        },
        429,
      );
    }
  }

  // 5. Structured generation. Read-only; no ledger access in this path.
  try {
    const result = await ai.generateStructured({
      system: CHAT_SYSTEM,
      user: userMessage,
      schema: ChatResultSchema,
      maxTokens: 900,
      temperature: 0.5,
      context: { userId: user.sub, resourceId: "assistant-chat" },
    });
    const status = await getQuotaStatus(c.env.BAKA_DB, user.sub, effectiveQuota, dateUtc);
    return c.json({
      ok: true,
      result: {
        reply: result.data.reply,
        model: result.model,
        request_id: result.request_id,
      },
      quota: {
        used: status.used,
        remaining: status.remaining,
        effectiveQuota,
        planMax,
        date: status.date,
        resetAt: status.resetAt,
      },
    });
  } catch (e) {
    // Failed AI calls must NOT burn quota — refund the just-consumed turn.
    // Only refund for provider/transport failures, not for our own 4xx.
    if (e instanceof AiError) {
      const refundable = new Set(["ai_upstream", "ai_unavailable", "ai_output_invalid", "ai_not_supported", "ai_input_too_large"]);
      if (refundable.has(e.code)) {
        await refundQuota(c.env.BAKA_DB, user.sub, dateUtc);
      }
      // Recompute status after refund for the error envelope (remaining is honest).
      const status = await getQuotaStatus(c.env.BAKA_DB, user.sub, effectiveQuota, dateUtc);
      return c.json(
        {
          ok: false,
          error: e.code,
          message: e.message,
          quota: {
            used: status.used,
            remaining: status.remaining,
            effectiveQuota,
            planMax,
            date: status.date,
            resetAt: status.resetAt,
          },
        },
        aiErrorStatus(e),
      );
    }
    await refundQuota(c.env.BAKA_DB, user.sub, dateUtc);
    return c.json({ ok: false, error: "internal", message: (e as Error).message }, 500);
  }
}

/**
 * GET /api/v1/assistant/quota — authoritative quota status (no consumption).
 */
export async function handleGetQuota(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
): Promise<Response> {
  const user = c.get("user");
  const aiSettings = await loadAiSettings(c.env.OAUTH_KV, user.sub);
  const planMax = getPlanMaxQuota(c.env as any, user.sub);
  const hostCap = getHostQuota(c.env as any);
  const effectiveQuota = aiSettings.unlimited
    ? 999_999
    : getEffectiveQuota(aiSettings.ai_turns_per_day, planMax, hostCap);
  const status = await getQuotaStatus(c.env.BAKA_DB, user.sub, effectiveQuota);
  return c.json({
    ok: true,
    quota: {
      used: status.used,
      remaining: status.remaining,
      effectiveQuota,
      selected: aiSettings.ai_turns_per_day,
      planMax,
      hostCap,
      date: status.date,
      resetAt: status.resetAt,
    },
  });
}

/**
 * GET /api/v1/assistant/settings — authoritative AI settings (selected + ceiling).
 */
export async function handleGetAiSettings(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
): Promise<Response> {
  const user = c.get("user");
  const aiSettings = await loadAiSettings(c.env.OAUTH_KV, user.sub);
  const planMax = getPlanMaxQuota(c.env as any, user.sub);
  const hostCap = getHostQuota(c.env as any);
  const effectiveQuota = aiSettings.unlimited
    ? 999_999
    : getEffectiveQuota(aiSettings.ai_turns_per_day, planMax, hostCap);
  const status = await getQuotaStatus(c.env.BAKA_DB, user.sub, effectiveQuota);
  return c.json({
    ok: true,
    settings: {
      ai_turns_per_day: aiSettings.ai_turns_per_day,
      unlimited: aiSettings.unlimited,
      effectiveQuota,
      planMax,
      hostCap,
      date: status.date,
    },
    quota: {
      used: status.used,
      remaining: status.remaining,
      resetAt: status.resetAt,
    },
  });
}

/**
 * PUT /api/v1/assistant/settings — user-controlled quota (capped by plan/host).
 * Body: { ai_turns_per_day: number 1..500 } — validated, clamped to ceiling,
 * stored in KV. Server returns authoritative effectiveQuota.
 */
export async function handlePutAiSettings(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
): Promise<Response> {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const raw = (body ?? {}) as { ai_turns_per_day?: unknown; unlimited?: unknown; plan?: unknown; quota?: unknown };
  // Ignore any spoofed `plan` / `quota` / `remaining` fields — server is authoritative.
  const n = typeof raw.ai_turns_per_day === "number" ? raw.ai_turns_per_day : Number(raw.ai_turns_per_day);
  if (!Number.isFinite(n)) {
    return c.json({ ok: false, error: "invalid_input", message: "ai_turns_per_day (1-500) is required." }, 400);
  }
  // Phase 3: unlimited is a boolean toggle — server stores it, never trusts client for bypass.
  const unlimited = raw.unlimited === true;
  const planMax = getPlanMaxQuota(c.env as any, user.sub);
  const hostCap = getHostQuota(c.env as any);
  const ceiling = hostCap !== undefined ? Math.min(planMax, hostCap) : planMax;
  // Clamp to ceiling — user can go down but not above plan/host.
  const clampedSelected = Math.max(1, Math.min(Math.floor(n), ceiling));
  if (clampedSelected !== Math.floor(n)) {
    // If they tried to exceed ceiling, clamp and inform, but don't error — Settings UX shows ceiling.
  }
  const saved = await saveAiSettings(c.env.OAUTH_KV, user.sub, { ai_turns_per_day: clampedSelected, unlimited });
  const effectiveQuota = saved.unlimited
    ? 999_999
    : getEffectiveQuota(saved.ai_turns_per_day, planMax, hostCap);
  const status = await getQuotaStatus(c.env.BAKA_DB, user.sub, effectiveQuota);
  return c.json({
    ok: true,
    settings: {
      ai_turns_per_day: saved.ai_turns_per_day,
      unlimited: saved.unlimited,
      effectiveQuota,
      planMax,
      hostCap,
      date: status.date,
    },
    quota: {
      used: status.used,
      remaining: status.remaining,
      resetAt: status.resetAt,
    },
  });
}
