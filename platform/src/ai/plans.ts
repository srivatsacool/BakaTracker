/**
 * Phase 2B — PLAN entitlements for AI quota.
 *
 * Server is authoritative: the client can send any `ai_turns_per_day` it
 * wants, but the server returns `min(userSelected, planMax)` and enforces it.
 * No plan/auth/quota value from the request is trusted — plan is resolved
 * server-side from `Env` + the authenticated `sub`.
 *
 * Plans (v2.1):
 *   guest        → 3  turns/session (client-only, never hits /assistant/chat)
 *   free         → 30 turns/day UTC (authenticated default)
 *   pro          → 100 turns/day
 *   enterprise   → 300 turns/day
 *
 * Self-hosted host cap: env `AI_SELFHOSTED_QUOTA` (if defined) further caps
 * the effective quota — min(planMax, hostCap). Offline → 0 (client short-circuits).
 *
 * Choosing a plan:
 *   - The default for cloud users is `free` (30). A real billing integration
 *     would map `sub → planId`; until then `AI_PLAN_MAX` env var can override
 *     the ceiling for testing, and `AI_PLAN` can force a named tier.
 *   - Self-hosted deployments set `AI_SELFHOSTED_QUOTA` on the host to cap
 *     all users (even `pro` cannot exceed the host quota).
 */

export type PlanId = "free" | "pro" | "enterprise";

export const PLAN_MAX: Record<PlanId, number> = {
  free: 30,
  pro: 100,
  enterprise: 300,
};

export const GUEST_HARD_LIMIT = 3;
export const DEFAULT_AUTHENTICATED_QUOTA = 30;

/** Resolve the plan ceiling for the caller strictly from server Env. */
export function getPlanMaxQuota(env: Record<string, string | undefined>, _sub?: string): number {
  // Allow the deployment to force a ceiling via env for tests / self-host.
  const forcedMax = parseInt((env as any).AI_PLAN_MAX ?? "", 10);
  if (Number.isFinite(forcedMax) && forcedMax > 0) return forcedMax;

  const planRaw = ((env as any).AI_PLAN as string | undefined)?.trim().toLowerCase();
  if (planRaw && planRaw in PLAN_MAX) return PLAN_MAX[planRaw as PlanId];

  // Real billing lookup would branch on `sub` here. Until then: free tier.
  return PLAN_MAX.free;
}

/** Host quota for self-hosted deployments (optional env cap). */
export function getHostQuota(env: Record<string, string | undefined>): number | undefined {
  const raw = (env as any).AI_SELFHOSTED_QUOTA;
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Effective quota = min(userSelectedQuota, planMax, hostCap?) .
 * userSelected is authoritative but cannot exceed the ceiling.
 */
export function getEffectiveQuota(
  userSelected: number,
  planMax: number,
  hostCap?: number,
): number {
  const clampedSelected = Math.max(1, Math.min(Math.floor(userSelected), 500));
  const afterPlan = Math.min(clampedSelected, planMax);
  if (hostCap === undefined) return afterPlan;
  return Math.min(afterPlan, hostCap);
}

/** Display helper: what the Settings UI should show as the ceiling. */
export function getDisplayCeiling(env: Record<string, string | undefined>, sub?: string): number {
  const planMax = getPlanMaxQuota(env, sub);
  const host = getHostQuota(env);
  return host !== undefined ? Math.min(planMax, host) : planMax;
}
