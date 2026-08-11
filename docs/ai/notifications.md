# Proactive BakaSur — Notifications Design (v2.1 foundation)

## Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│ scheduler (WHEN)                                                       │
│   Cron */15 * * * *  →  exported `scheduled` handler (src/index.ts)   │
└──────────────────────────────┬─────────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│ deterministic candidates (WHETHER)                                     │
│   src/notifications/candidates.ts — pure rules over D1:               │
│   • overdue_task          (due date < today | instant < now)           │
│   • deadline_approaching (due within 24h | 24–72h date range)          │
│   • streak_at_risk        (no log today AND last log ≥1 day ago)       │
│   • streak_milestone      (streak > 0 AND streak % 7 === 0)            │
│   No model involved. Per-user cap of 5 candidates per run.             │
└──────────────────────────────┬─────────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│ policy suppression (SAFETY)                                            │
│   src/notifications/policy.ts — KV state (baka:notif:settings:{sub} +  │
│   baka:notif:state:{sub}), pure cost-free reads:                       │
│   • user opt-out (settings.enabled=false)                              │
│   • per-category opt-out                                               │
│   • quiet hours (user's timezone, overnight-wrap aware)                │
│   • daily cap (max_per_day, rolls over on the user's LOCAL day)        │
│   • cooldown dedup (12h per entity; milestone dedup by streak VALUE)   │
│   If suppressed → never calls the model.                               │
└──────────────────────────────┬─────────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AI message (HOW) — the ONLY model-touching step                        │
│   src/notifications/message.ts                                         │
│   • bounded context: candidate facts ONLY (no other user's data)       │
│   • fixed app-authored system prompt (constant string)                 │
│   • output envelope zod-validated: { message ≤280 chars, tone }        │
│   • AI failure → candidate suppressed, engine continues                │
└──────────────────────────────┬─────────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│ delivery (WHERE) — replaceable transport abstraction                   │
│   src/notifications/delivery.ts                                        │
│   • NotificationDelivery interface; `LogDelivery` logs to the Worker   │
│     console (this phase). Web Push / email / mobile: FUTURE.           │
│   • delivery failure → counted in summary, never thrown                │
└────────────────────────────────────────────────────────────────────────┘
```

## Non-negotiable rules

1. **The model decides nothing about *whether* or *when*.** Candidates and
   policy are 100% deterministic. AI is reached only to phrase the message —
   that is the cost/spam protection (no AI call = no billable token = no
   spam risk when suppressed).
2. **User-scoped, always.** Candidates are built from the user's own D1
   rows; the message context contains that user's facts only; history and
   settings live under `baka:notif:*:{sub}`. Cross-user leakage is a test
   failure.
3. **No new infrastructure.** Settings + state live in the existing
   `OAUTH_KV`. No D1 migration, no new binding, no Vectorize.
4. **Graceful degradation.** AI down → candidates suppressed (never
   delivered unpersonalized, never fatal). Delivery down → counted in
   `summary.failed`. The engine itself never throws.
5. **Bounded everything.** ≤5 candidates/user/run, ≤280-char message,
   ≤10 history entries (ring buffer), maxTokens-capped model call.

## Settings schema (REST: GET/PUT /api/v1/notifications/settings)

```ts
{
  enabled:      boolean,           // default true
  categories:   Record<Category, boolean>, // default all on
  quiet_hours:  { enabled: false, start: "22:00", end: "07:00" },
  max_per_day:  number,            // default 3
  timezone:     string,            // default "UTC" (IANA)
  tone:         "gentle" | "funny" | "tsundere" | "professional",
}
```

Partial PUTs merge onto defaults/current. Malformed values → 400.

## Deterministic candidate rules (src/notifications/candidates.ts)

All comparisons use the user's configured timezone via
`todayInTz(now, tz)` / `daysBetween` / `inQuietWindow` (exported from
`src/notifications/candidates.ts`):

| Candidate | Priority | Rule |
|---|---|---|
| `overdue_task` | 3 | task `todo`/`in_progress`, `due` < today (date form) or < now (instant form) |
| `deadline_approaching` | 2 | due today/tomorrow (date) or within 24h (instant), not overdue |
| `streak_at_risk` | 2 | habit streak > 0, last log date ≥ 1 day before today |
| `streak_milestone` | 1 | streak > 0 and streak % 7 === 0 |

## Policy state (src/notifications/policy.ts)

- KV `baka:notif:state:{sub}`: `{ date, sent_today, history: [{type, entity_id, sent_at, streak?}] }`
- `recordSent` rolls `sent_today` to 0 when `state.date !== userLocalToday`.
- Dedup keys: `{type}:{entity_id}` with a 12h cooldown; milestone dedups by
  streak value (a 21-day milestone must re-fire at 28, never at 21 twice).

## Operational notes

- The cron trigger exists in the dev `wrangler.jsonc`; the generated prod
  config (`npm run setup -- --with-ai`) emits it alongside the AI binding.
- `npm run trigger` (wrangler deploy) is NOT run automatically; deploying
  the scheduled engine to production requires explicit approval (deploy
  gate).
- The engine runs under `wrangler dev` — invoke with
  `curl -X POST http://localhost:8787/__scheduled?cron=*/15+*+*+*+*` or
  `wrangler dev --test-scheduled`.

## Tests

`test/notifications.spec.ts` (in-process, fake provider — zero live
inference): candidate detection, daily cap, quiet hours, cooldown dedup,
milestone value-dedup, local-day rollover, tone on record, AI failure
degradation, delivery failure counting, cross-user isolation, per-run cap,
settings REST merge + validation, and an AI-side-effect counter proving the
model is never called when policy suppresses.
