/**
 * Proactive BakaSur — evaluation engine (scheduler entry point).
 *
 * Pipeline per cron tick (docs/ai/notifications.md):
 *   scheduler (WHEN) → active users → deterministic candidates (WHETHER)
 *   → policy suppression (SAFETY) → Workers AI message (HOW)
 *   → delivery (WHERE)
 *
 * Deterministic by construction: `now` is injected (tests never depend on
 * wall-clock), all data flows through repositories, and every AI failure
 * degrades to "skip this candidate" — core BakaTracker is never affected.
 */
import type { Env } from "../env";
import { AiService } from "../ai";
import { buildAiService } from "../http/notes-ai";
import { activeUserIds } from "../storage/db";
import { repositories } from "../storage/repositories";
import { collectCandidates } from "./candidates";
import { evaluateCandidatePolicy, recordSent, appendHistory, loadSettings } from "./policy";
import { generateNotificationMessage } from "./message";
import { LogDelivery, NullDelivery } from "./delivery";
import { WebPushDelivery } from "./webpush";
import type { Notification, NotificationDelivery } from "./types";
import { id, nowISO } from "../shared/util";

export interface EvaluationOptions {
  /** Injected clock — tests pass fixed dates. Defaults to `new Date()`. */
  now?: Date;
  /** Delivery transport override (tests use a recording delivery). */
  delivery?: NotificationDelivery;
  /** AI override (tests inject a fake service; no live inference). */
  ai?: AiService;
  /** When true, evaluate policy but never deliver (dry run). */
  dryRun?: boolean;
}

/**
 * Pick the delivery transport. Web Push is used only when VAPID is fully
 * configured AND a push-subscription KV is bound; otherwise we fall back to
 * `LogDelivery` so local/dev and misconfigured prod behave exactly as before
 * (no behavior change when push isn't set up).
 */
function resolveDelivery(env: Env, opts: EvaluationOptions): NotificationDelivery {
  if (opts.delivery) return opts.delivery;
  if (opts.dryRun) return new NullDelivery();
  if (env.PUSH_SUBSCRIPTIONS && WebPushDelivery.isConfigured(env)) {
    return new WebPushDelivery(
      env.PUSH_SUBSCRIPTIONS,
      { subject: env.VAPID_SUBJECT!, publicKey: env.VAPID_PUBLIC_KEY!, privateKey: env.VAPID_PRIVATE_KEY! },
    );
  }
  return new LogDelivery();
}

export interface EvaluationSummary {
  users_evaluated: number;
  candidates_found: number;
  delivered: number;
  suppressed: number;
  failed: number;
}

/** Scheduled entry: invoked by the worker's `scheduled` handler. */
export async function runNotificationEvaluation(
  env: Env,
  _ctx: ExecutionContext,
  opts: EvaluationOptions = {},
): Promise<EvaluationSummary> {
  const now = opts.now ?? new Date();
  const delivery = resolveDelivery(env, opts);
  const ai = opts.ai ?? buildAiService(env);

  const summary: EvaluationSummary = { users_evaluated: 0, candidates_found: 0, delivered: 0, suppressed: 0, failed: 0 };

  const userIds = await activeUserIds(env.BAKA_DB);
  summary.users_evaluated = userIds.length;

  for (const userId of userIds) {
    try {
      const settings = await loadSettings(env.OAUTH_KV, userId);
      if (!settings.enabled) {
        summary.suppressed += 1;
        continue;
      }

      const repos = repositories(env.BAKA_DB, env.R2_BUCKET);
      const candidates = await collectCandidates(repos, userId, now, settings);
      summary.candidates_found += candidates.length;

      for (const cand of candidates) {
        // 1) Deterministic policy — no AI call when suppressed.
        const decision = await evaluateCandidatePolicy(env.OAUTH_KV, userId, settings, cand, now);
        if (decision.action === "suppress") {
          summary.suppressed += 1;
          continue;
        }

        // 2) AI phrasing — bounded, validated; failure ⇒ skip (graceful).
        const generated = await generateNotificationMessage(ai, cand, settings.tone);
        if (!generated) {
          summary.suppressed += 1;
          continue;
        }

        const notification: Notification = {
          id: id("notif"),
          user_id: userId,
          type: cand.type,
          priority: cand.priority,
          entity_id: cand.entity_id,
          tone: generated.tone,
          message: generated.message,
          created_at: nowISO(),
          context: cand.context,
        };

        // 3) Persist BEFORE delivery: a delivery failure must not cause the
        //    same notification to be re-created every cron tick.
        await recordSent(env.OAUTH_KV, userId, cand, now, settings.timezone || "UTC");
        await appendHistory(env.OAUTH_KV, userId, {
          id: notification.id,
          type: notification.type,
          tone: notification.tone,
          message: notification.message,
          entity_id: notification.entity_id,
          created_at: notification.created_at,
        });

        // 4) Deliver.
        try {
          await delivery.deliver({ sub: userId }, notification);
          summary.delivered += 1;
        } catch {
          summary.failed += 1;
        }
      }
    } catch {
      // One user's evaluation failure never breaks the run for others.
      summary.failed += 1;
    }
  }

  return summary;
}
