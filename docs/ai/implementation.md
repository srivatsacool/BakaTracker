# Phase 7 Implementation Record — Workers AI + BakaSur Foundation

Status: **implemented, gated, committed** (2026-08-11). Production deploy of
the AI-enabled Worker requires **explicit approval** (deploy gate).

## What shipped

### AI service layer (`src/ai/`)
- `service.ts` — `AiService`: the application's only AI entry point.
  `generateStructured` (schema + JSON extraction + fail-closed validation),
  `generateText`, `generateEmbedding`. Bounded input (`AI_INPUT_MAX_CHARS`
  = 24,000), bounded output, request ids, deterministic error taxonomy
  (`ai_unavailable | ai_input_too_large | ai_upstream | ai_output_invalid |
  ai_not_supported`), secret-safe error sanitization.
- `prompts.ts` — fixed app-authored system prompts; user/model text never
  interpolates (prompt-injection defense).
- `workers-ai.ts` — `env.AI` binding provider (`AI_MODEL` / `AI_EMBED_MODEL`
  overrides).
- `google-ai.ts` / `provider.ts` — existing Gemini REST fallback; provider
  interface extended with optional `model` + `embed()`.
- `bakasur.ts` — BakaSur v1 tool allowlist (read-first) + assertion gate.
- `index.ts` — `makeAIProvider` resolver (Workers AI → Gemini → undefined).

### Notes summarize vertical slice
- `src/http/notes-ai.ts` — `POST /api/v1/notes/:id/ai/summarize` under the
  existing auth guard: ownership via repository (404, no existence oracle),
  bounded input (413), deterministic error mapping (502/503), never mutates
  the note.
- Contract: `docs/ai/notes-ai-actions.md` (this action + 8 future).

### Proactive BakaSur notification foundation
- `src/notifications/` — `types.ts`, `settings.ts` (KV
  `baka:notif:settings:{sub}`, zod schema), `candidates.ts` (deterministic
  rules + time helpers), `policy.ts` (cap/quiet/dedup/cooldown + local-day
  rollover), `message.ts` (only model-touching step), `delivery.ts`
  (replaceable transport; `LogDelivery` this phase), `engine.ts`
  (`runNotificationEvaluation`).
- `src/index.ts` — OAuthProvider wrapped in `{ fetch, scheduled }`;
  scheduled handler runs the engine. Cron `*/15 * * * *` in `wrangler.jsonc`
  + generated prod config.
- `src/storage/db.ts` — `activeUserIds` (per-user reset semantics kept).
- REST: `GET/PUT /api/v1/notifications/settings`.
- Design: `docs/ai/notifications.md`.

## Deliberately NOT built (future phases)

Final Notes UI · delivery transport (Web Push/email) · Vectorize prod index
· AI Gateway · voice · image gen · PDF intelligence · autonomous task/habit
mutation · custom API domain · OAuth/DNS/Pages changes.

## Config

| Knob | Default | Purpose |
|---|---|---|
| `AI` binding | absent in dev | enables Workers AI provider (prod via `npm run setup -- --with-ai`) |
| `AI_MODEL` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | text model override |
| `AI_EMBED_MODEL` | `@cf/baai/bge-base-en-v1.5` | embedding override (Vectorize future) |
| `AI_ENABLED` | `"1"` | kill switch (`"0"` → deterministic 503) |
| `GEMINI_API_KEY` | — | documented alternative provider |

## Gates

- `vitest run` — **81/81** (baseline 45 + 36 new: `ai-notes.spec.ts`,
  `notifications.spec.ts`; zero live inference — fake providers only)
- `tsc --noEmit` — clean
- Repository gate checklist (lint / build / pages checks / migration tests /
  e2e / wrangler dry-run) — run before every commit; this phase's run is
  recorded in the commit message.

## Deploy sequence (requires approval)

1. `npm run setup -- --with-ai` (regenerates prod config: AI binding + cron).
2. `wrangler deploy` → deploy gate requires explicit user approval
   (no production AI deployment without it).
3. Verify scheduled engine: trigger with
   `curl -X POST "<worker>/__scheduled?cron=*/15+*+*+*+*"` and watch logs.
