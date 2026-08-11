/**
 * AI message generation — the ONLY place proactive notifications touch the
 * model. Given a deterministic candidate + the user's configured personality,
 * produce ONE short personalized message.
 *
 * Rules:
 *   - Never called when the policy engine suppressed the candidate.
 *   - Only the bounded `candidate.context` reaches the model (no ids, no
 *     emails, no raw bodies). The prompt forces "use ONLY the supplied facts".
 *   - Output is zod-validated (message ≤ 280 chars, tone ∈ enum) — anything
 *     ill-formed fails closed → the candidate is skipped, no crash.
 *   - AI unavailable/failure → deterministic `null` (graceful degradation);
 *     the engine counts it as suppressed and moves on.
 */
import { z } from "zod";
import { AiService, notificationMessageSystem } from "../ai";
import { NOTIF_TONES } from "./types";
import type { NotificationCandidate, NotifTone } from "./types";

const MessageSchema = z.object({
  message: z.string().min(1).max(280),
  tone: z.enum(NOTIF_TONES),
});

export interface GeneratedMessage {
  message: string;
  tone: NotifTone;
  request_id: string;
  model: string;
}

const MAX_CONTEXT_CHARS = 2_000;

export async function generateNotificationMessage(
  ai: AiService,
  cand: NotificationCandidate,
  tone: NotifTone,
): Promise<GeneratedMessage | null> {
  if (!ai.available) return null;

  let contextJson: string;
  try {
    contextJson = JSON.stringify(cand.context);
  } catch {
    return null;
  }
  if (contextJson.length > MAX_CONTEXT_CHARS) return null;

  try {
    const result = await ai.generateStructured({
      system: notificationMessageSystem(tone),
      user: `Event type: ${cand.type}\nFacts: ${contextJson}\n\nWrite the notification message.`,
      schema: MessageSchema,
      maxTokens: 160,
      temperature: 0.7,
      context: { userId: cand.user_id, resourceId: cand.entity_id },
    });
    // Personality is app-controlled: the record always carries the configured
    // tone even if the model echoed a different one (wording only).
    return {
      message: result.data.message,
      tone,
      request_id: result.request_id,
      model: result.model,
    };
  } catch {
    return null;
  }
}
