# 🗺️ Roadmap and Version Releases

Version-level view. The authoritative development plan is `Plan.md` (root); per-phase detail lives in `docs/phases/`.

---

## ✅ Released: Version 2.0 — Production Foundation (2026-08)
Cloudflare-native replatform, live in production.

- **Frontend (PWA):** React 19 SPA on Cloudflare Pages — `https://bakatracker.buildsrivatsa.qzz.io`
- **Platform (Worker):** REST + MCP + Tool Registry on `https://bakatracker-platform.srivatsagorti.workers.dev`
- **Auth:** real Google OAuth (DCR + PKCE) via `@cloudflare/workers-oauth-provider`; bearer-token REST guard; loopback-gated dev bridge
- **Data:** D1 (tasks, habits, journal, notes, files metadata) · R2 (user-scoped attachments) · KV (OAuth + notification state) · Durable Object (MCP)
- **Sync:** per-entity REST + `/sync` push/pull with lock TTL
- **Workers AI foundation (Phase 7, `8026266`):** `AiService` (bounded input/output, zod-validated structured results, deterministic error taxonomy, secret-safe logs), `env.AI` provider with `AI_MODEL`/`AI_EMBED_MODEL` overrides + `AI_ENABLED` kill switch, Gemini REST fallback, BakaSur read-first tool allowlist, notes `summarize` endpoint, `scheduled()` handler + 15-min cron running the deterministic proactive engine (candidates → policy → AI message → log-stub delivery), notification settings REST (GET/PUT)
- **Verification:** 81/81 vitest · 7/7 db-verify · 10/10 Pages · tsc clean · wrangler dry-run green · browser E2E green (known cold-start retry)
- **Deferred from 2.0:** production AI deployment (approval gate), real notification delivery (log stub), Notes UI

---

## 🟧 In Progress: Version 2.1 — BakaSur + Visual Notes

Four implementation tracks (detail: `docs/phases/phase8-notes-excalidraw.md`, `docs/phases/phase9-proactive-notifications.md`):

1. **Excalidraw Notes** — Notebook → Pages, each page an Excalidraw workspace (`@excalidraw/excalidraw` v0.18, MIT, lazy-loaded ~151 KiB gz); create/rename/reorder/duplicate/delete/restore pages; draw/write/diagram; libraries; images via R2; debounced autosave with offline queue, versioned conflicts, retry.
2. **Notes data model** — `notes` extended (`kind`, `scene`, `notebook_id`, `position`, `archived_at`) + `notebooks` table; existing text notes become pages; scene images extracted to R2; migration `0003_notes_pages.sql`; backward-compatible.
3. **BakaSur + Notes** — worker-side page interpretation layer (bounded `PageRepresentation`, never raw scene JSON); read-only actions: summarize / explain / ask / extract_tasks / extract_concepts / generate_questions; AI never mutates a page without an explicit user action.
4. **Proactive BakaSur → real delivery** — production pipeline (rules decide WHETHER, AI phrases HOW); **Web Push** (VAPID + injectManifest SW + per-device KV subscriptions + `@block65/webcrypto-web-push` on the worker; no external providers); personalities (`gentle | motivational | funny | tsundere | savage | celebratory`, wording only); minimal functional settings surface (opt-out, quiet hours, tone).

### v2.1B Checkpoints (Visual Notes + Web Push)

| Commit | Checkpoint | Status |
|--------|-----------|--------|
| `2e3558a` | B-1 Excalidraw editor shell + lazy route | ✅ |
| `355c261` | B-2 Page load + scene hydration from v2.1A REST | ✅ |
| `5a1de3b` | WS2-backend Web Push delivery (VAPID, KV subs, REST) | ✅ |
| `79ce345` | B-3 Debounced autosave + conflict/quota/dataURL | ✅ |
| `26fedaa` | B-4 Notebook/page chrome (full lifecycle) | ✅ |
| `24a64f9` | B-5 Theme + mobile responsiveness | ✅ |
| `d87ddee` | B-6 Playwright E2E persistence gate + 3 prod bug fixes | ✅ |
| — | B-7 Documentation + roadmap bump | ⬜ |
| — | WS2-3 Custom service worker + browser push subscription | ⬜ |
| — | WS2-4 Push settings UI + end-to-end delivery test | ⬜ |

### Production Bugs Found by B-6 E2E Gate
1. **Autosave race:** overlapping flushes reused same `expected_revision` → spurious 409. Fixed with in-flight serialization guard.
2. **Mount-save race:** Excalidraw mount `onChange` bursts saved empty scene, racing the first real draw save. Fixed with hydrated-scene id-set comparison.
3. **Archive state bug:** `handleArchivePage` removed pages from state, preventing them from reappearing under "Show archived". Fixed to update `archived_at` in place.

---

## 🟦 Planned: Version 2.2 — BakaSur Memory

Vectorize semantic memory over pages: pages → chunking → Workers AI embeddings (`AI_EMBED_MODEL`) → Vectorize (user-scoped) → bounded retrieval → BakaSur. Design in `docs/phases/phase10-bakasur-memory.md`. No implementation until v2.2.

---

## 🟦 Planned: Version 2.3 — Complete UI/UX Rehaul

Landing page, design system, glassmorphism, typography, surfaces, navigation, dashboard, tasks, habits, journal, Notes (notebook sidebar + Excalidraw workspace + BakaSur contextual actions), notification center, animations, responsive mobile, PWA, accessibility, empty/loading/error states, onboarding. Consumes stable v2.1/v2.2 capabilities. Design in `docs/phases/phase11-ui-rehaul.md`.

---

## ⚠️ Known Limitations & Accepted Debt

- **Root eslint baseline** (~55 errors, frontend `src/`) — accepted, documented state; not reopened unless it becomes a deployment blocker.
- **>500 KiB chunk warning** in the frontend build — accepted for now; v2.1 adds code-splitting for the Excalidraw route.
- **iOS Web Push** requires the PWA installed to the home screen (iOS 16.4+); permission prompts are per-browser.
- **AI latency/cost** — the 15-min cron engine calls the model only for policy-approved candidates; `AI_ENABLED=0` is the global kill switch.
- **KV eventual consistency** — notification state is KV-backed; concurrent ticks are de-duplicated by cooldown keys (single-user scale).
