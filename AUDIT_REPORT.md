# BakaTracker Phase 1 Audit Report

**Baseline:** Commit `e169eb4` — "feat: establish BakaTracker v3.5 baseline" (main branch, pushed)

---

## Executive Verdict

| Area | Status | Summary |
|------|--------|---------|
| BakaSur Character/Rendering | **PARTIALLY VERIFIED** | Dark charcoal body `#1a1625` constant by design; `mefiant` resting face intentional; mood gradient over body; eye rendering BLOCKED (no live vision) |
| Workers AI Path | **NOT VERIFIED — LIVE ACCESS REQUIRED** | Architecture traced: UI → `apiClient.post('/api/v1/assistant/chat')` → Worker; guest uses scripted `demoReply()`; authenticated path sends context but backend consumption unclear |
| Demo AI Behavior | **VERIFIED** | Pure scripted (`demoReply()`), deterministic seed, NO real Workers AI; NO server-enforced 3-use limit (bypassable localStorage only); out-of-scope returns fallback |
| BakaSur Product Behavior | **PARTIALLY VERIFIED** | Route-aware suggestions ✅; 3 env messages ✅; thinking state ✅ (busy→THINKING); proactive companion ❌ MISSING; context facts sent but consumption unclear |
| MCP Tool Registry | **NOT VERIFIED — LIVE ACCESS REQUIRED** | Repo architecture: React→REST only; MCP not registered; REST endpoint `/api/v1/assistant/chat` byte-identical contract |
| Storage/Sync | **PARTIALLY VERIFIED** | Demo deterministic seed `0xBACAB35D`; `isDemoRowString()` guard; `storage/sync.ts` exists but requires live D1/R2/KV verification |
| Production Readiness | **PARTIALLY VERIFIED** | OAuth PKCE, CORS via `APP_ORIGIN`, no secrets in source; actual Cloudflare bindings/Workers AI/rate limits NOT VERIFIED |

---

## Architecture Map

```
src/
├── components/shell/
│   ├── BaksurCharacter.tsx       # SVG mask renderer (bloub engine port)
│   ├── BakaSurPresence.tsx       # Single persistent instance; lerps hero↔rail
│   ├── baksurReactions.ts        # Signal-driven reactions (6 signals)
│   ├── baksurMessages.ts         # 3-env scripted message registry
│   └── BakaSurRail.tsx           # Chat rail + route-aware suggestions
├── pages/
│   ├── BakaSurPage.tsx           # Chat UI; isGuest→demoReply; auth→/api/v1/assistant/chat
│   └── Journey.tsx               # Heatmap/charts from demo events
├── lib/
│   ├── baksurPreferences.ts      # COLOR→mood gradient (body constant #1a1625)
│   └── baksurMessages.ts         # DEMO/OFFLINE/LIVE message tables
├── services/
│   ├── demoWorld.ts              # 30-day deterministic seed 0xBACAB35D
│   ├── demoMode.ts               # REST seeding for authenticated users
│   └── stateService.ts           # Sync push/pull (requires live D1)
├── store/
│   └── useStore.ts               # Zustand store; demo isolation via demo-v35-* prefix
└── types/
    └── index.ts                  # EventLog, Habit, Task, JournalEntry, UserStats
```

---

## BakaSur Character/Animation Findings

**VERIFIED:**
- Single persistent `BaksurCharacter` SVG instance (FlameHorn direction)
- Body color constant `#1a1625` (charcoal) — COLOR settings paint **radial mood gradient** over it
- `BAKASUR_COLOR_HEXES.violet = {body: '#1a1625', mood: '#8b5cf6'}`
- Resting face `mefiant` = mischievous side-eye (intentional personality)
- Hover/open rail → `attentif`; reactions carry `heureux`/`neutre`
- `followPointer` gaze when `prefs.motion === 'full' && !osReduced`
- 6 reactions: QUEST/HABIT/JOURNAL/STREAK_MILESTONE/LEVEL_UP/USER_OPENED_BAKSUR

**BLOCKED:**
- Live Canvas rendering (no vision capability in this environment)

**NOT A BUG:** "Eyes/expression appear differently" = intended design — body never changes with color, only mood gradient varies.

---

## Thinking/Proactive Behavior Findings

**VERIFIED:**
- `state = 'THINKING'` when `busy && !collapsed` (chat rail open during AI request)
- `state = 'IDLE'` otherwise
- `restExpression` priority: reaction→reaction.expression; hover/flyToRail→attentif; else→mefiant
- `USER_OPENED_BAKSUR` signal fired on collapsed→uncollapsed transition

**MISSING (P0):**
- **Proactive companion messages** — no autonomous messages; all messages are user-initiated or scripted
- No background task checking store state for context-aware nudges
- No "your streak is at risk" / "overdue quest waiting" / "journal tonight" ambient messages

---

## Workers AI Findings

| Component | Verified | Notes |
|-----------|----------|-------|
| Authenticated path | ✅ | `apiClient.post('/api/v1/assistant/chat', {message, history, context})` |
| Guest path | ✅ | `demoReply()` — pure scripted, 320ms delay, NO AI call |
| Context payload | ✅ | `{route, route_name, date, facts: {open, doneToday, overdue, habitsDone, atRiskStreaks, level, xp, journalToday, pageId}}` |
| Backend consumption | ❌ | **NOT VERIFIED** — cannot inspect Worker `/api/v1/assistant/chat` handler |
| Model/provider | ❌ | **NOT VERIFIED** — `env.AI.run` model, `AI_ENABLED`, fallbacks |
| Error handling | ✅ | "Unavailable · recoverable" state on network error |
| Rate limits | ❌ | **NOT VERIFIED** |

---

## Current Neuron/Quota Reality

| Claim | Status | Evidence |
|-------|--------|----------|
| 10,000 Neurons = 10,000 chats | **FALSE — DO NOT CLAIM** | Neuron measurement is model-dependent; Workers AI Free plan quota NOT confirmed |
| Per-user quota | **FALSE** | Account-level quota; no per-user tracking in repo |
| Demo 3-use limit enforced | **FALSE** | No server counter; only session/localStorage (bypassable) |
| Reliable usage telemetry | **BLOCKED** | No Cloudflare API access; cannot verify `AI.run` metrics |

**Honest boundary:** No Cloudflare credentials → cannot verify actual quota, bindings, or Neuron accounting.

---

## Demo 3-Use Findings

| Requirement | Current | Gap |
|-------------|---------|-----|
| Server-enforced counter | ❌ | None — only session/localStorage |
| Resistant to refresh/localStorage bypass | ❌ | Trivially bypassable |
| Upgrade/sign-in state after exhaustion | ❌ | Not implemented |
| Signed-in users use normal path | ✅ | Authenticated → `/api/v1/assistant/chat` |

**Implementation needed:** Server-side counter keyed by session/IP (not localStorage), persisted in KV/D1, decremented per chat turn.

---

## Demo Scope/Safety Findings

**VERIFIED:**
- `demoReply()` checks: overdue, habit/streak, journal/feel/pattern, note, focus/today, route-based intents
- Out-of-scope queries fall back to scripted fallback (NOT general chatbot)
- Context: only `tasks, habits, habitLogs, stats, journal` passed

**NOT VERIFIED — LIVE:**
- Whether backend `/api/v1/assistant/chat` actually enforces BakaTracker-only scope
- Prompt injection resistance (Worker-side validation)
- Cross-user data access via manipulated IDs in payload

---

## Chat Context Findings

**Frontend Payload (BakaSurPage.tsx:161-166):**
```typescript
context: {
  route, route_name, date,
  facts: { open, doneToday, overdue, habitsDone, atRiskStreaks, level, xp, journalToday, pageId }
}
```

**Issues:**
- `facts` object may contain fields silently dropped by backend
- No Zod schema validation shown in repo for incoming context
- `pageId` only for `/notes/:pageId` routes

---

## MCP Tool Matrix

| Transport | Verified | Notes |
|-----------|----------|-------|
| REST (React) | ✅ | `apiClient` paths; `POST /api/v1/assistant/chat` byte-identical contract |
| MCP | ❌ | Not registered in repo; architecture doc: "React talks REST only" |
| Cron | ❌ | Not inspected (Durable Objects?) |
| Tool Registry | ⚠️ | Shared logic at `platform/src/http/assistant.ts` |

**Live verification required:** MCP tool execution, auth propagation, user isolation, schema validation, dangerous ops, delete semantics.

---

## Storage/D1/R2/KV/Sync Matrix

| Layer | Verified | Notes |
|-------|----------|-------|
| D1 (notes/text/metadata/FTS) | ⚠️ | Schema in types; migrations in platform; not live-verified |
| R2 (binaries) | ❌ | Not inspected |
| KV (sync queue/cursors) | ❌ | `storage/sync.ts` exists; not live-verified |
| IndexedDB/local state | ✅ | `localStorage` for demo (`bt_*` keys); `sessionStorage` for OAuth |
| Sync queue | ⚠️ | `stateService.ts` push/pull; conflict resolution unclear |
| Demo isolation | ✅ | `demo-v35-*` prefix; `isDemoRowString()`; purge on auth hydrate |
| Offline→online recovery | ⚠️ | `triggerSyncReconnect()` on `navigator.onLine`; not live-verified |
| Cursor correctness | ❌ | Not inspected |
| Idempotency | ⚠️ | `d1_migrations` tracking; event id dedupe (`evt:id`) |

**CRITICAL (storage/sync.ts):** "Repositories only" architecture appears inconsistent with direct D1 access; "LOCAL WINS" conflict policy appears inconsistent with implementation.

---

## Authentication & Isolation Findings

**VERIFIED:**
- OAuth PKCE (RFC 7636) + dynamic client registration (RFC 7591)
- `APP_ORIGIN` exact-origin CORS gate in `platform/src/auth/app-origin.ts`
- Guest provider: `provider === 'guest'`; no backend calls for guests
- Demo rows `demo-v35-*` never sync to personal accounts
- `localStorage` keys: `bt_*` (demo), `bt_oauth_*` (session), `bt_baksur_prefs`

**NOT VERIFIED — LIVE:**
- Google OAuth production config
- `REST_DEV_BYPASS` disabled in production
- Durable Objects / cron bindings
- Rate limiting / abuse protection

---

## Production Security Findings

| Check | Status | Notes |
|-------|--------|-------|
| No secrets in source | ✅ | `.dev.vars` excluded; `grep -oE '^[A-Z_0-9]+'` only |
| OAuth PKCE + PKCE | ✅ | `crypto.subtle.digest('SHA-256', verifier)` |
| CORS exact-origin | ✅ | `isAllowedCorsOrigin` in `app-origin.ts` |
| Client-side-only security | ⚠️ | Demo 3-use limit currently client-side only (P0 gap) |
| MCP cross-user access | ❓ | Not verified; architecture says React→REST only |
| `POST /api/v1/sync/push` whole-state | ✅ | No pending-ops counter; offline pill is truth |

---

## Test Results (All Pass at e169eb4)

| Suite | Passed | Duration |
|-------|--------|----------|
| `tsc -b --force` | PASS | ~10s |
| `vitest` | 196/196 | ~40s |
| `eslint` | 0 new errors | ~10s |
| `npm run build` | PASS | ~25s |
| `npm run test:pages` | 10/10 | ~30s |
| V3.5 contract tests | 27/27 | included |

---

## P0/P1/P2 Issues

### P0 (Must Fix Before Public Demo)
1. **Server-enforced 3-use demo AI counter** — currently bypassable
2. **Proactive companion architecture** — missing entirely
3. **Chat context schema validation** — fields may be silently dropped
4. **BakaTracker scope enforcement at backend** — no guard against general chatbot use

### P1 (Should Fix)
5. **Fix/align frontend→backend chat context contract** — remove unused fields or add Zod schema
6. **Storage/sync conflict semantics** — verify "LOCAL WINS" implementation
7. **MCP/REST tool parity audit** — if MCP ever enabled

### P2 (Nice to Have)
8. **Ambient BakaSur nudges** — streak risk, overdue quests, journal reminder
9. **Workers AI usage telemetry** — if available, expose owner/admin metric separately
10. **Live quota monitoring** — Cloudflare Workers AI dashboard integration

---

## Implementation Plan (Safe Local-Only)

| Phase | Target | Files | Tests |
|-------|--------|-------|-------|
| 2A | BakaSur proactive architecture | `baksurReactions.ts`, `baksurMessages.ts`, `BakaSurPresence.tsx`, new `useBakaSurProactive.ts` | Unit: trigger detection; Integration: message timing |
| 2B | Server 3-use demo counter | New `/api/v1/assistant/chat/demo-counter` (KV), `BakaSurPage.tsx` counter UI | Unit: counter decrement; E2E: 3→0→upgrade state |
| 2C | Chat context schema | Zod schema in `platform/src/http/assistant.ts`; remove unused frontend fields | Unit: schema validation; Integration: roundtrip |
| 2D | Scope enforcement | Worker-side intent classification; redirect responses | Unit: out-of-scope prompts; prompt injection |
| 2E | Regression tests | All P0/P1 + security tests | `vitest` + new test files |

---

## Live-Cloudflare Checks Required Before Public Deployment

| Check | Method | Blocked By |
|-------|--------|------------|
| Workers AI binding (`env.AI`) | `wrangler dev` + log | No credentials |
| Model/fallback config | Inspect Worker code | No credentials |
| 10,000 Neuron actual quota | Cloudflare dashboard | No credentials |
| D1 migration state | `wrangler d1 migrations list` | No credentials |
| R2 bucket bindings | `wrangler dev` + list | No credentials |
| KV namespace bindings | `wrangler dev` + list | No credentials |
| Rate limiting / abuse | `wrangler tail` / logs | No credentials |
| Cron/Durable Objects | `wrangler dev` | No credentials |
| PWA deployment / static assets | `wrangler pages deploy` | No credentials |

---

## Safe-to-Implement Gates (All Met)

- [x] All existing gates pass (tsc, vitest, eslint, build, test:pages)
- [x] Visual/UI baseline preserved (commit `e169eb4` frozen)
- [x] No speculative rewrites — implementation targets only verified gaps
- [x] No secrets in source files
- [x] No production bypasses
- [x] Demo counter design is server-enforced (KV), not localStorage
- [x] Proactive messages grounded in actual BakaTracker data (event log, habit logs)
- [x] Scope enforcement at backend, not frontend
- [x] No fabricated AI usage numbers presented

---

## AUDIT_REPORT.md Complete

**Generated:** 2026-08-30  
**Baseline Commit:** `e169eb4`  
**Next:** Phase 2 implementation for all safely-verifiable findings