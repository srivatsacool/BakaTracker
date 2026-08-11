# BakaTracker — Development Plan (v2.x)

> **Status:** v2.0 **RELEASED** (production) · v2.1 **NEXT** (BakaSur + Visual Notes) · v2.2 **PLANNED** (BakaSur Memory) · v2.3 **PLANNED** (UI/UX Rehaul)
>
> This document is the authoritative plan. Phase docs under `docs/phases/` carry the per-phase detail; `docs/ROADMAP.md` is the version-level view; `docs/ai/` carries the AI architecture.
>
> Roadmap reset: **2026-08-11** — the old assumption (v2.1 = generic AI, v2.2 = Notes, v2.3 = UI) is superseded by the product roadmap below. Revisions never rewrite history: 8026266 (Phase 7) stays as-is.

---

## 1. Product & platform mental model

- **BakaTracker (this repo) = THE PRODUCT.** React 19 PWA (`src/`) + Cloudflare-native platform (`platform/`), one repo, one source of truth.
- **One business-logic layer, many thin transports.** A single Tool Registry powers REST + MCP + scheduled cron; every transport passes through the same auth → registry → repository → D1/R2 path. The AI layer adds no parallel data path.
- **Storage rules (locked):**
  - **D1** = structured data: entities, metadata, tags, searchable text, embeddings (future), and serialized scene documents.
  - **R2** = binaries only: images, PDFs, voice, drawings, exports, attachments.
  - **KV** = user-scoped session/notification state (`baka:notif:*:{sub}`), OAuth state.
- **Gamification (Journey/XP) stays in the product** — the platform exposes the APIs the product needs; platform adapts to product, not the reverse.
- **Freeze zones:** `src/pages/`, `src/components/`, `src/store/`, `src/lib/`, `src/assets/`, `src/types/` are touched only when a backend contract changes or a version explicitly calls for UI work (v2.3). The seam is `src/api/`, `src/services/`, `src/features/auth/`, `config/env.ts`.

## 2. Release roadmap

| Version | Scope | Status |
|---|---|---|
| **v2.0** | Cloudflare-native production foundation (OAuth, D1, R2, KV, DO, MCP, REST, Tool Registry, Workers AI foundation, proactive engine) | ✅ **RELEASED** — `bakatracker.buildsrivatsa.qzz.io` + `bakatracker-platform.srivatsagorti.workers.dev` |
| **v2.1** | **BakaSur + Visual Notes** — Excalidraw notebook pages, notes data model, BakaSur page interpretation, proactive BakaSur production pipeline + real Web Push delivery, personalities | 🟨 **NEXT** (defined in §3, `docs/phases/phase8-notes-excalidraw.md`, `docs/phases/phase9-proactive-notifications.md`) |
| **v2.2** | **BakaSur Memory** — Vectorize semantic memory over pages (design in `docs/phases/phase10-bakasur-memory.md`) | 🟦 PLANNED |
| **v2.3** | **Complete UI/UX rehaul** — landing, design system, glassmorphism, Notes notebook UI, notification center, onboarding, PWA polish (design in `docs/phases/phase11-ui-rehaul.md`) | 🟦 PLANNED |

Releases are not mixed: v2.1 ships functional backend + minimal functional surfaces; v2.3 owns the final visual design and consumes stable v2.1/v2.2 capabilities.

## 3. v2.1 — BakaSur + Visual Notes (NEXT)

### 3A. Excalidraw Notes
The Notes feature is an Excalidraw workspace, not a conventional text editor. Product shape: **Notebook → Pages**, each page an Excalidraw scene. Users can create/rename/reorder/duplicate/delete/restore pages, draw/write/diagram, use libraries, add images, autosave.

- Package: `@excalidraw/excalidraw` v0.18.x (**MIT**, React 19 peer-compatible, client-only). Lazy-loaded route (`React.lazy`) — ~151 KiB gzip, kept out of the main bundle.
- Serialization: `serializeAsJSON(elements, appState, files, type)`; load with `restore()` (schema-migrates old scenes). Scene = `{ type:"excalidraw", version, elements[], appState, files{} }`.
- Libraries: `mergeLibraryItems` / `serializeLibraryAsJSON` / `parseLibraryTokensFromUrl` / `useHandleLibrary`.
- Import/export: `loadSceneOrLibraryFromBlob` (`.excalidraw` files), `exportToBlob`/`exportToSvg` (PNG/SVG).
- Mobile: touch-first canvas by default; `useDevice` for responsive chrome.
- Autosave: debounced/coalesced (no per-mouse-event persistence), offline queue in localStorage, flush on blur/unload, versioned conflict strategy (409 → reload/overwrite), exponential-backoff retry. See `docs/phases/phase8-notes-excalidraw.md` §Autosave.
- v2.3 owns the final visual design. v2.1 builds the functional foundation only.

### 3B. Notes data model
- **Decision: existing text notes become pages, with a migration-friendly extension — not a replacement table.** Existing REST/tools/MCP keep working.
- `notes` gains: `kind` (`'text'` default | `'excalidraw'`), `scene` (TEXT, serialized Excalidraw JSON; NULL for text notes), `notebook_id`, `position` (ordering), `archived_at` (soft delete / restore). `title`/`body` stay: for excalidraw pages, `body` holds a bounded plain-text projection of the scene (powers LIKE search + the AI window + backward compat).
- New `notebooks` table: `id, user_id, name, position, created_at, updated_at`; default "Personal" notebook.
- Scene images (dataURLs) are extracted to **R2** on save and referenced by file id; fetched back on page open (parallel, cached). D1 never stores binary.
- Migration `0003_notes_pages.sql` (v2.1). Soft-delete retention/trash purge is a scheduled-handler concern (documented, not built).
- Detail: `docs/phases/phase8-notes-excalidraw.md` §Data model.

### 3C. BakaSur + Notes
AI never sees raw Excalidraw JSON. A worker-side **page interpretation layer** builds a bounded `PageRepresentation`:

```
scene → getTextFromElements (text/labels) + element-type counts + frames as
        sections + arrow connections (binding graph) + image METADATA (mime,
        size — never dataURL) + link URLs + counts + version
        → truncate to bounds (text ≤ 8K chars, element caps)
        → BakaSur (AiService.generateStructured, fixed app-authored prompts)
```

- v1 actions (read-only, minimal safe subset): `summarize` (exists), `explain`, `ask` (Q&A over representation), `extract_tasks`, `extract_concepts`, `generate_questions`.
- Every action: same guard → ownership → bounded retrieve → interpretation → zod-validated output. **AI never mutates a page without an explicit user action.**
- Existing summarize infrastructure (`src/http/notes-ai.ts`, `AiService`) is reused; per-action schemas + prompts added to `src/ai/`.
- Detail: `docs/phases/phase8-notes-excalidraw.md` §BakaSur page interpretation.

### 3D. Proactive BakaSur — production pipeline
Current pipeline is already production-shaped: **scheduler → candidates → policy → AI message → delivery**. Rules decide WHETHER; AI phrases HOW; AI never decides frequency, policy bypass, quiet hours, daily cap, or authorization. v2.1 keeps the existing high-value candidates (overdue, deadline, streak-at-risk, streak-milestone) — **no rule-engine explosion**. Candidate sources (notes/journal/activity) are future work, documented only.

### 3E. Real notification delivery (Web Push)
Feasibility: **clean, no new infrastructure, no external providers.**
- VAPID keypair (worker secrets), `PushManager.subscribe` in a custom service worker (`vite-plugin-pwa` **injectManifest** — the current `generateSW` config cannot host a `push` handler), subscriptions per device stored in KV (`baka:push:subs:{sub}`), worker-side send via **`@block65/webcrypto-web-push`** (MIT, pure WebCrypto, verified Cloudflare-Workers-compatible; RFC 8291 VAPID + AES-128-GCM).
- `WebPushDelivery implements NotificationDelivery` sits beside `LogDelivery`; no subscription → falls back to log.
- Mobile: iOS 16.4+ requires the PWA installed to home screen; permission prompts are per-browser.
- The four interfaces stay separated: `NotificationCandidate` · `NotificationPolicy` · `AIMessageGenerator` · `NotificationDelivery`.
- Detail: `docs/phases/phase9-proactive-notifications.md` §Web Push.

### 3F. Personality & notification controls
- Personality enum → `gentle | motivational | funny | tsundere | savage | celebratory` (replaces the Phase-7 4-tone set; stored legacy values are normalized on load). Personality affects **wording only** — never authorization, policy, business logic, or data access (architecturally enforced: the record always carries the configured tone).
- Controls (already implemented in Phase 7): opt-in/out, per-category toggles, quiet hours, timezone, daily cap, cooldown, dedup, history ring buffer. v2.1 adds a **minimal functional settings surface** (opt-out + quiet hours + tone) — a requirement, not final design.
- AI is never called when deterministic policy suppresses (cost + spam protection) — covered by tests.

### 3G. v2.1 definition of done
- Excalidraw page CRUD + autosave + ordering + duplicate + soft-delete/restore, images via R2, user isolation.
- Page interpretation + 6 AI actions, read-only, prompt-injection-as-data, deterministic errors.
- Web Push delivery live (subscription lifecycle + send), personalities selectable, settings surface functional.
- Gates: existing suite preserved + new specs (serialization, ownership, autosave, CRUD, ordering, duplication, deletion, interpretation, AI actions, injection, policy, personality, delivery abstraction) — no live inference in unit tests.
- Production AI deploy still behind the explicit approval gate (§6).

## 4. v2.2 — BakaSur Memory (PLANNED)

Vectorize semantic memory over pages: **pages → chunking → Workers AI embeddings (`AI_EMBED_MODEL`, bge-base 768-d) → Vectorize (user-scoped) → bounded retrieval → BakaSur**. Documented in `docs/phases/phase10-bakasur-memory.md` (embedding lifecycle, page-update reindexing, deletion, stale-embedding versioning, user isolation, retrieval limits, privacy). **No Vectorize implementation before v2.2.**

## 5. v2.3 — Complete UI/UX Rehaul (PLANNED)

Landing, design system, glassmorphism, typography, surfaces, navigation, dashboard, tasks, habits, journal, Notes (notebook sidebar + Excalidraw workspace + BakaSur contextual actions), notification center, animations, responsive mobile, PWA, accessibility, empty/loading/error states, onboarding. Consumes stable v2.1/v2.2 capabilities; does not drive architecture. See `docs/phases/phase11-ui-rehaul.md`.

## 6. Production gate (AI + scheduled)

**No production AI deployment without explicit approval.** Sequence:
1. local tests → 2. staging/local AI validation → 3. production config generation (`npm run setup -- --with-ai`) → 4. dry-run → 5. **explicit approval** → 6. production deploy → 7. scheduled-trigger test → 8. authenticated AI smoke test → 9. notification delivery test.

External notification providers and any new infra require explicit approval too.

## 7. Constraints & guardrails

- Single source of truth: this repo. No multi-tenancy; personal single-user app.
- No Google Sheets / Apps Script runtime dependency (portable exports instead).
- D1/R2 remain the source of truth; AI performs inference only; BakaSur never receives direct DB access; no model-generated SQL; no model-generated arbitrary Worker execution; all tool args zod-validated; AI failures degrade gracefully.
- Do NOT modify: OAuth architecture, APP_ORIGIN, CORS, Pages deployment, DNS, D1/R2 architecture, MCP architecture, custom API domain (future decision only).
- Accepted known debt (do not reopen): root eslint baseline (~55 errors, frontend `src/`), >500 KiB chunk warning. See `docs/ROADMAP.md` §Known limitations.
- Git: focused commits; never rewrite 8026266; no force push; no squash unless requested.

## 8. Phase docs index

| Doc | Contents |
|---|---|
| `docs/phases/phase7-bakasur.md` | Phase 7 (8026266) audit — strengths, debt, hardening, provider strategy, prod gate |
| `docs/phases/phase8-notes-excalidraw.md` | v2.1 — Excalidraw integration, data model, autosave, page interpretation, AI actions |
| `docs/phases/phase9-proactive-notifications.md` | v2.1 — pipeline, Web Push, personality, controls |
| `docs/phases/phase10-bakasur-memory.md` | v2.2 — Vectorize design (no implementation) |
| `docs/phases/phase11-ui-rehaul.md` | v2.3 — UI/UX rehaul design (no implementation) |
| `docs/ai/*` | AI architecture (service, security, actions, memory design, notifications) |
