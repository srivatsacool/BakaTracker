# BakaTracker v2.1B — Excalidraw UI Integration Plan

> Status: **PROPOSED — awaiting approval** · Base: v2.1A (must be committed first — see §0)
> Scope: frontend-only visual notes workspace. Backend contract (v2.1A) is immutable.
> Verified against: real repo at `D:\Portfilo_build.srivatsa\BakaTracker`, HEAD `06b885e`, inspected 2026-08-12.

---

## 0. BASELINE REALITY CHECK (read before anything else)

The prompt assumes "v2.1A has just been verified, gated, and shipped." **That premise is currently false.**

| Fact | Evidence (inspected this session) |
|---|---|
| v2.1A is **not committed** | `git status`: 8 modified + 4 untracked (incl. `0003_notes_pages.sql`, `notebooks.ts`, `pages.ts`, `pages.spec.ts`); HEAD still `06b885e` |
| Gate was **red** at last run | `npm test` in `platform/`: **19 failures** (pages.spec 13 + ai-notes.spec 6); migrations.spec restored to 7/7 by a splitter fix |
| Failure root causes mapped, fixes **not yet applied** | (a) ai-notes.spec setup lacks `0003` migration → `kind` column missing; (b) pages.spec "idempotent" test contradicts the tracked-migration design and Miniflare `exec()` multiline limitation; (c) contract mismatches (`GET /pages` list route missing; GET page response shape; D1 `undefined` binding in sparse PATCH) |

**Hard prerequisite for v2.1B:** finish the v2.1A gate (apply the 3 mapped fixes → vitest green → tsc → build → db-verify) and **commit v2.1A as the baseline**. All v2.1B work must sit on top of that commit. This plan is written to that contract, which is confirmed present in `platform/src/http/rest.ts`.

---

## 1. Current frontend architecture (audited from code)

**Stack (root `package.json`):** React `19.2` · Vite `8` · TypeScript `~6.0` · `react-router-dom` `7.18` · `zustand` `5` · Tailwind CSS `4` (`@tailwindcss/vite`) · `lucide-react` icons · `vite-plugin-pwa` · Auth0-style OAuth is **not** used by the SPA — auth is a **custom PKCE flow against the Cloudflare Worker** (`workers-oauth-provider`). `@` alias → `src/`.

**Entry & routing:** `src/main.tsx` → `<AuthProvider><App/></AuthProvider>`. `src/App.tsx` — `BrowserRouter`; public `/` (Landing); protected group via `<ProtectedRoute><Layout/></ProtectedRoute>`: `/journey /habits /tasks /eisenhower /today /journal`; `*` → `/`. **No notes/pages routes exist yet.**

**State management:** `src/store/useStore.ts` — single zustand store, **localStorage-first** with a remote sync seam (`init(apiClient)` → `stateService.fetchData` → merge → `localStorage`). `syncStatus: idle|loading|success|error` + `syncError`. Legacy local-first; pages/notes are server-first territory.

**API client:** `src/api/apiClient.ts` — `ApiClient.request/get/post/put/delete`, Bearer token, **401 → silent refresh retry**, error envelope parsing (`{ok:false, message}`), typed errors (`AuthError/SessionExpiredError/ForbiddenError/NetworkError/BackendUnavailableError`). Bound via `useApiClient()` (`src/api/authFetch.ts`) using `config.api.baseUrl` (`src/config/env.ts`: `VITE_API_BASE_URL`, dev default `http://localhost:8787`).

**Auth:** `src/features/auth/` — `AuthProvider` (PKCE + DCR against worker `/authorize` `/token`, token in localStorage keys `bt_oauth_token`…), `useAuth()` → `{ isAuthenticated, isLoading, user, getAccessToken, login, logout }`, `ProtectedRoute` (loading → error card → redirect), guest/demo mode (`provider === 'guest'`), `LoadingScreen`.

**Layout system:** `src/components/shared/Layout.tsx` — desktop sidebar (`w-64`/collapsed `w-20`, `navItems[]` array, level/XP card, sync/theme/settings buttons, PWA install prompt), mobile top header + **fixed bottom nav** + offline banner (`isOffline` via `online/offline` events). Content via `<Outlet/>` inside `<main>` with `p-8` (desktop) / `p-4 pb-24` (mobile).

**Design system:** Tailwind 4 theme in `src/index.css` — tokens `--bg-primary --surface --text-primary --border-primary --accent-pink --success --warning --danger --shadow-color`; dark mode via `html.dark`; Gumroad-style `neo-card`, `neo-input`, `shadow-gumroad(-sm|-lg)`, heavy `border-2 border-black`, hard shadows, `font-black`, mono accents.

**Modals:** hand-rolled pattern — `fixed inset-0 z-[999] bg-black/60` overlay, `neo-card` panel, bottom-sheet on mobile (`max-sm:items-end max-sm:rounded-t-2xl`). See Layout settings modal, `ExportLifeModal`.

**Keyboard shortcuts:** only inline `onKeyDown` (Enter in forms). **No global shortcut system.**

**Autosave:** **none exists.** Only `setTimeout` one-shots (copy-toast, tour). No debounce utility in the codebase.

**PWA:** `vite-plugin-pwa` `registerType: 'autoUpdate'`, manifest `standalone` portrait. No runtime offline data sync — offline = local-only + banner.

**Tests:** root `test:pages` = `node --test scripts/pages-check.test.mjs` (infra check). **No frontend unit-test runner** (no vitest in root). E2E: Playwright (`e2e/playwright.config.ts`) drives real worker (`platform/scripts/e2e-worker.mjs` on 8787, fake Google via `outboundService`) + real Vite SPA (5173) — `e2e/auth.e2e.spec.ts` does the full real OAuth chain. Platform tests: vitest (`platform/test/*.spec.ts`).

**Backend contract (v2.1A, verified in `platform/src/http/rest.ts`):**

| Endpoint | Response |
|---|---|
| `GET /api/v1/notebooks` · `POST /api/v1/notebooks` · `DELETE /api/v1/notebooks/:id` | `{ok, notebooks[]}` / `{ok, notebook}` 201 / `{ok, removed}` |
| `GET /api/v1/notebooks/:id/pages` | `{ok, pages[]}` (active pages of that notebook) |
| `POST /api/v1/pages` `{title, kind?, notebook_id?}` | `{ok, page}` 201 |
| `GET /api/v1/pages/:id` | `{ok, page}` — `page` = `toPageResponse(note)` incl. `scene`, `revision`, `kind`, `notebook_id`, `position`, `archived_at` |
| `PATCH /api/v1/pages/:id` `{title?, notebook_id?, position?}` | `{ok, page}` |
| `DELETE /api/v1/pages/:id` (archive) · `POST /pages/:id/archive` · `POST /pages/:id/restore` | `{ok, archived/restored}` |
| `POST /api/v1/pages/:id/duplicate` | `{ok, page}` 201 (fresh `revision: 0`, copied scene) |
| `POST /api/v1/pages/reorder?notebook_id=` `{order: string[]}` | `{ok, reordered}` |
| `PUT /api/v1/pages/:id/scene` `{scene, expected_revision}` | `200 {ok, revision}` · **`409 {ok:false, error:"conflict", currentRevision}`** · `413` too_large · `400` invalid_input |

Scene cap = `PAGE_SCENE_MAX_BYTES` = **2 MiB (2,097,152 bytes)**. Cross-user access → `404` (no existence oracle). All routes behind the worker auth guard (`401` unauthenticated). **Note:** `GET /api/v1/pages` (list-all) does not exist in v2.1A — the list surface is per-notebook; the Notes shell will use `GET /notebooks/:id/pages`.

---

## 2. Existing components that can be reused

| Asset | Reuse for v2.1B |
|---|---|
| `Layout` + `navItems[]` | Add a Notes nav item; flush mode for editor route |
| `ProtectedRoute` / `useAuth` / `LoadingScreen` | Editor + list routes inherit auth gate and loading pattern |
| `ApiClient` + `useApiClient` | All page/notebook/scene calls — no new client |
| zustand `useStore` pattern (NOT the store itself) | Notebook/page list state via lightweight local stores or component state |
| `neo-card`, `neo-input`, modal pattern, `shadow-gumroad-*` | Notebook list, page actions, conflict dialog, save indicator chrome |
| `syncStatus` visual language (cloud/spin/error) | Save indicator states |
| Offline banner + `isOffline` pattern | Autosave failure banner |
| `OnboardingBanner`, first-run gating | Notes entry discoverability (optional) |
| Playwright harness (`e2e-worker.mjs` + real SPA) | Notes E2E spec |

---

## 3. Excalidraw integration architecture

**Package:** `@excalidraw/excalidraw@^0.18.1` (verified current; peer deps `react ^17||^18||^19` → React 19.2 ✓). ~151 KiB gzip JS. **Must be lazy-loaded** (`React.lazy` + `Suspense`) — never in the main bundle. Import `@excalidraw/excalidraw/index.css`; parent container needs explicit height.

**Architecture (editor = presentation layer, backend = source of truth):**

```text
PageWorkspace (route /notes/:pageId)
  ├─ header: back · inline title (PATCH debounced) · SaveIndicator · PageActions
  └─ EditorCanvas (lazy <Excalidraw/>)
        ├─ initialData = restore(parse(scene))        ← hydrate from GET /pages/:id
        ├─ onChange(elements, appState, files)        ← debounced → serializeAsJSON → dirty
        └─ excalidrawAPI ref                          ← scrollToContent, resetScene on reload
                │
                ▼
        useSceneAutosave (state machine, §6)
                │
                ▼
        PUT /api/v1/pages/:id/scene {scene, expected_revision}
```

- **Serialize:** `serializeAsJSON(elements, appState, files, "local")` → string stored verbatim in `notes.scene` (D1 TEXT, v2.1A contract — zero backend change).
- **Hydrate:** `restore(scene, appState, files)` on load (built-in schema migration; always run through it). Empty scene (`scene: null`/`""`) → fresh canvas + WelcomeScreen.
- **Change handling:** `onChange(elements, appState, files)` — mark DIRTY, debounce. **Ignore the initial post-hydration onChange** (compare against hydrated snapshot / `isHydrated` flag) to avoid saving an untouched scene.
- **Images — explicit boundary (do NOT build in v2.1B):** Excalidraw puts image `dataURL`s in the scene `files{}` map. Embedding those in D1 violates the storage rule (D1 never stores binary) and explodes past the 2 MiB cap. **v2.1B blocks image insertion client-side** (intercept via `onImageInsert`/file-paste handling; show a small "Images coming in a later phase" toast) so scenes stay shapes/text/drawings only. The proper boundary — worker-side extraction of `files` → R2 (`pages/{userId}/{pageId}/{fileId}`) with reference tokens in the stored scene, per `docs/phases/phase8-notes-excalidraw.md` §1.4 — is a **deferred backend-track item** (v2.1C+), requiring a deliberate backend change; it is out of scope here.
- **Export (cheap win, optional):** `exportToBlob` PNG/SVG client-side download button in PageActions. No persistence.
- **NOT used:** collaboration features (`collaboration` API, live cursors), library sync, `useHandleLibrary`, multi-window sync.

---

## 4. User experience flow

**Open page (`/notes/:pageId`):**
1. Auth gate passes → `GET /pages/:id` (route param id; 404 → friendly "Page not found" card with back link).
2. While loading: `LoadingScreen`-style card ("Opening page…").
3. Hydrate: `restore(parse(scene))` → `initialData` → `scrollToContent: true`. Empty page → clean canvas with WelcomeScreen hint.
4. Error: network → error card with Retry (existing pattern).

**Edit:** normal Excalidraw editing. Local scene in a ref; `onChange` → DIRTY (debounced serialize). Save indicator flips to "Unsaved changes…".

**Save (autosave):** 2 s after last change (debounce) → SAVING → CLEAN. Indicator: "Saving…" → "All changes saved" (green dot) / "Save failed — retrying" (red, retry w/ backoff) / "Conflict — review required" (actionable).

**Manual save:** Ctrl/Cmd+S handler + visible "Save now" affordance in header (flushes debounce immediately).

**Navigate away with pending save:** flush synchronously (`navigator.sendBeacon`-style not possible for JSON PUT — use `fetch(..., {keepalive:true})` one-shot); if it fails, the draft stays in localStorage (`baka:page:{id}:draft`) and is offered on next open. Simpler first pass: `beforeunload` warning only when dirty + keepalive flush attempt. No silent loss.

**Conflict (§7):** modal — never silent overwrite.

---

## 5. Scene lifecycle

```text
OPEN:  GET /pages/:id → scene JSON → restore() → hydrated canvas        [revision = R0]
EDIT:  onChange → DIRTY (local draft also written to localStorage, throttled)
SAVE:  debounce 2s → PUT {scene, expected_revision: R0}
        200 → revision = R1, CLEAN
        409 → CONFLICT (local draft preserved; server scene untouched)
        413 → TOO_LARGE (client pre-checks length ≤ 2MiB to prevent)
        network error → SAVE_FAILED → retry w/ backoff (2s→30s) → banner
NAV:   keepalive flush + beforeunload guard if dirty
RELOAD: hydrate from server; if a draft exists AND server revision ≠ draft.revision → conflict prompt
```

Draft record: `{ scene, revision, savedAt, pageId }` under `baka:page:{id}:draft`. Three tiers of truth: server scene (authoritative), in-memory editor state, localStorage draft (crash/offline safety). Nothing overwrites without revision agreement.

---

## 6. Autosave state machine (deterministic, no library)

```text
        edit                    debounce 2s               PUT starts
CLEAN ────────▶ DIRTY ──────────────────▶ SAVE_PENDING ──────────▶ SAVING
 ▲              ▲                           │                        │
 │              │            new edit during │ (reset timer)         │ 200 → revision = resp.revision → CLEAN
 │              └────────── (coalesce: stay DIRTY)                  │ 409 → CONFLICT (blocked: user decides)
 │                                                                  │ network → SAVE_FAILED → backoff retry
 └──────────────────────────────────────────────────────────────────┘
```

Implementation: `useSceneAutosave(pageId, getScene, opts)` hook returning `{ status, revision, retryNow, resolveConflict(action) }`:
- **Debounce:** 2 s, timer reset on every edit. **Flush triggers:** timer fire, Ctrl/Cmd+S, `visibilitychange→hidden`, `pagehide` (keepalive), blur of editor.
- **Coalescing:** if SAVING when a new save is due → re-enter SAVE_PENDING with the latest scene, save immediately after the in-flight one resolves (single in-flight PUT max; chain, don't stack).
- **Revision:** `expected_revision` always = last server-confirmed revision. On 200, adopt `resp.revision`. On 409, adopt `currentRevision` into the conflict dialog (not into autosave).
- **Failure/retry:** exponential backoff 2 s → 30 s cap while dirty; manual Retry; offline banner while `!navigator.onLine`.
- **Lifecycle:** unmount / route change → flush attempt + `beforeunload` guard if still dirty. StrictMode-safe (effects idempotent; in-flight promise shared).
- **Tests:** pure hook + fake timers (no React DOM needed for the core machine; separate small component tests for the indicator/modal).

---

## 7. Revision conflict strategy (never silent)

Trigger: PUT returns `409 {currentRevision}` while local draft exists.

Dialog (reuse modal pattern): "This page was updated on another device."
1. **Reload server version** → discard editor state, `restore(serverScene)`, revision = currentRevision. Local draft kept in localStorage until user dismisses a "keep draft?" follow-up (simple: keep draft, offer restore link).
2. **Keep my version (overwrite)** → explicit destructive choice; PUT with `expected_revision: currentRevision` (from the 409), not the stale one.
3. **Cancel** → stay in CONFLICT; autosave paused (no further PUTs until resolved); banner "Not saving — conflict".

Default highlight: **Reload server version** (safest). First implementation: exactly these three actions; no merge UI (single-user app, rare path).

---

## 8. Page workspace design (visual language: existing neo-brutalist)

- **Route `/notes`:** two-pane shell — left `neo-card` list: "Notebooks" (Personal default + created ones, "+ New notebook"), clicking a notebook shows its pages below ("+ New page"); archived pages shown in a muted "Archived" section when present. Empty states with CTAs. Uses `GET /notebooks`, `GET /notebooks/:id/pages`, `POST /pages`, `POST /notebooks`.
- **Route `/notes/:pageId`:** full-height editor. Header row (sticky, `bg-surface border-b-2 border-black`): ← back to `/notes`, inline editable title (`neo-input`-style, PATCH debounced 800 ms), **SaveIndicator** (dot + label: `All changes saved` green / `Unsaved changes…` amber / `Saving…` spinner / `Save failed — retrying` red / `Conflict` red actionable), actions: Duplicate, Archive (or Restore when archived), Export PNG/SVG (optional). Canvas fills remaining height (`h-[calc(100vh-...)]` or flex-1 min-h-0).
- **Mobile:** same header condensed (icon-only actions); canvas touch-first (Excalidraw default); bottom nav stays (Layout). No special editor shell — Excalidraw's mobile chrome + our compact header.
- **Layout flush:** when `location.pathname` starts with `/notes/` and matches the editor, render `<Outlet/>` inside a `p-0 overflow-hidden h-screen` main so the canvas owns the viewport (small, contained Layout change; list page keeps normal padding).

---

## 9. Mobile/responsive strategy

- Canvas: Excalidraw is touch-first out of the box (`useDevice` internally). We do **not** wrap its chrome.
- Shell: `/notes` two-pane collapses to stacked cards on `<md`; editor header condenses; bottom nav remains the primary navigation (existing pattern).
- Scene size: pre-check `JSON.stringify(scene).length ≤ PAGE_SCENE_MAX_BYTES` client-side before PUT — mobile payloads are identical; the cap is the guard, not device.
- Performance: lazy Excalidraw keeps mobile JS parse small; no per-keystroke persistence; draft writes throttled.

---

## 10. Performance considerations (no premature optimization)

- **Bundle:** Excalidraw only on the editor route via `React.lazy` + Suspense (~151 KiB gzip). App shell unchanged.
- **Serialization:** `serializeAsJSON` only inside the debounced save path (2 s), not per onChange tick — `onChange` just flips DIRTY.
- **Re-renders:** editor canvas is uncontrolled (`excalidrawAPI` ref); our React state holds only `status/revision/title` — canvas data never round-trips through React state. SaveIndicator re-renders are cheap.
- **Payload:** scene JSON ≤ 2 MiB (server cap); typical hand-drawn scenes are tens of KB. No images in v2.1B (boundary in §3).
- **Memory:** single page in memory; scene string kept in ref (not state); drafts throttled to localStorage (e.g., every 1 s while dirty).
- Measure only if a real bottleneck appears; expected dominant cost is the debounced serialize+PUT of very large scenes — the 2 MiB cap bounds it.

---

## 11. Security considerations

- The UI **never** constructs page/notebook ids — only from route params (validated `page_…`-style prefix) and server responses. Cross-user ids → server `404` (existing contract); UI surfaces the generic "Page not found" (no existence oracle leak).
- `expected_revision` comes only from the last server response; conflict path requires explicit user action; **no path silently overwrites**.
- Scene size enforced client-side pre-flight (friendly 413 UX) AND server-side (contract).
- Auth: everything rides the existing Bearer/PKCE flow + `ProtectedRoute`; no new auth surface.
- No scene data in URLs/history; nothing sensitive logged. Backend remains authoritative for ownership — UI treats `404`/`409` as gospel.

---

## 12. Testing strategy

**Unit (NEW — root vitest):** the root frontend has **no unit-test runner**; add `vitest` + `@testing-library/react` + `jsdom` (root devDeps, `test:unit` script — platform already uses vitest 4, same major).
- `sceneSerialization`: round-trip `restore(parse(serialize()))`, empty-scene handling, size pre-check, draft envelope.
- `useSceneAutosave` (fake timers): debounce reset, 200 → revision adopt, 409 → CONFLICT + no retry until resolved, network error → backoff schedule, coalescing during SAVING, flush on visibilitychange/beforeunload, StrictMode double-mount safety.
- Conflict reducer: the 3 actions transition correctly.

**Integration (frontend, mocked ApiClient):** load → hydrate; edit → dirty → save 200 → clean; 409 → dialog; duplicate resets revision; archive/restore flips state; navigation flush.

**E2E (Playwright, existing harness — worker 8787 + SPA 5173, real OAuth):** `e2e/notes.e2e.spec.ts`
1. Login → open Notebooks → open page → add element(s) (type text via toolbar or drag a shape) → wait for autosave indicator "All changes saved" → **reload** → verify scene persisted (element count/text).
2. Empty page → hint; navigation back/forward; duplicate → new page with same content; archive → gone from list, restore → back.
3. Save failure → abort the PUT route via Playwright `page.route` → banner + retry → success after unroute.
4. Conflict → seed a second PUT via direct API between hydrate and save → dialog appears; reload-server path restores server scene.
5. Mobile viewport (iPhone-ish project) smoke: canvas opens, element added, saved.

Platform tests (v2.1A) already cover the API contract; no platform test changes in v2.1B.

---

## 13. File-by-file change plan

### New files (frontend)

| FILE | Purpose | What changes | Why | Dependencies | Risk |
|---|---|---|---|---|---|
| `src/types/page.ts` | `Notebook`, `Page` types mirroring `toPageResponse` | new | typed contract for services/UI | none | low |
| `src/services/pages/notebooks.ts` | list/create/delete notebooks | new | API calls via `ApiClient` | `apiClient`, types | low |
| `src/services/pages/pages.ts` | page CRUD + scene save + reorder | new | API calls; conflict error surfacing | `apiClient`, types | low |
| `src/services/pages/sceneSerialization.ts` | `serializeScene/parseScene/restoreScene/sizeOk/draftEnvelope` | new | pure, unit-testable scene boundary | `@excalidraw/excalidraw` (types only for helpers that need it) | low |
| `src/hooks/useSceneAutosave.ts` | autosave state machine (§6) | new | core persistence logic | `pages.ts`, serialization | **medium — revision correctness** |
| `src/pages/Notes.tsx` | notebook + page list shell (`/notes`) | new | list UX | services, Layout | low |
| `src/pages/PageWorkspace.tsx` | editor route (`/notes/:pageId`) | new | workspace assembly, title, actions, conflict | everything below | **medium** |
| `src/components/pages/EditorCanvas.tsx` | lazy `<Excalidraw/>` wrapper | new | isolate lazy boundary + sizing | excalidraw | medium (CSS/sizing) |
| `src/components/pages/SaveIndicator.tsx` | status dot/label | new | save UX | none | low |
| `src/components/pages/ConflictDialog.tsx` | 3-action conflict modal | new | conflict UX | modal pattern | low |
| `src/components/pages/PageActions.tsx` | duplicate/archive/restore/export | new | page actions | services | low |
| `src/services/pages/__tests__/…` + `src/hooks/__tests__/useSceneAutosave.test.ts` | unit tests | new | §12 | vitest | low |
| `e2e/notes.e2e.spec.ts` | E2E suite | new | §12 | Playwright harness | medium (flakiness) |
| `vitest.config.ts` (root) + `src/test/setup.ts` | unit runner | new | root has no runner | vitest/jsdom | low |

### Modified files

| FILE | Purpose | What changes | Why | Risk |
|---|---|---|---|---|
| `package.json` (root) | deps/scripts | add `@excalidraw/excalidraw@^0.18.1`; add vitest/jsdom/RTL devDeps; `test:unit` script | new editor + test runner | low |
| `src/App.tsx` | routes | add `/notes` and `/notes/:pageId` under the protected Layout group | workspace entry | low |
| `src/components/shared/Layout.tsx` | nav + flush | add "Notes" navItem (lucide `NotebookPen`); editor-route flush mode (`p-0 overflow-hidden h-screen`) | discoverability + canvas viewport | low-medium |

### Files intentionally untouched

- **All of `platform/`** — v2.1A persistence contract, REST, MCP tools, sync, migrations: immutable in v2.1B (the `GET /pages` list route gap is a v2.1A matter fixed before the baseline commit, not a v2.1B change).
- `src/store/useStore.ts` — legacy local-first store; notes are server-first by design.
- `src/api/*`, `src/features/auth/*` — reused as-is.
- `vite.config.ts` PWA — no SW changes; drafts are localStorage-only.
- `src/index.css` — tokens reused; zero changes planned.
- Existing pages/components outside Layout/App — untouched.

---

## 14. Checkpoint breakdown

### v2.1B-1 — Dependency + editor shell
- **Objective:** Excalidraw renders in a route, lazy-loaded.
- **Files:** `package.json`, `EditorCanvas.tsx`, `PageWorkspace.tsx` (stub canvas), `App.tsx`, `Layout.tsx` (nav+flush).
- **Scope:** install, lazy wrapper, sized container, dark-mode aware theme prop, empty canvas.
- **Tests:** component smoke (renders, WelcomeScreen), e2e stub open.
- **Acceptance:** `/notes/:id` shows an interactive canvas; main bundle size unchanged (+~151 KiB gzip only on route).
- **Rollback:** revert 4 files; route removed — no persistence touched.

### v2.1B-2 — Page loading + scene hydration
- **Objective:** open page → fetch → hydrate.
- **Files:** `types/page.ts`, `services/pages/*`, `sceneSerialization.ts`, `PageWorkspace.tsx`.
- **Scope:** GET page, restore(), scrollToContent, loading/error/not-found states, empty-scene path.
- **Tests:** unit (serialization round-trip), integration (mock client hydrate), e2e open+verify.
- **Acceptance:** seeded scene renders identically after reload.
- **Rollback:** editor can still open empty canvas; no writes yet.

### v2.1B-3 — Scene persistence + autosave
- **Objective:** edits persist via the state machine.
- **Files:** `useSceneAutosave.ts`, `SaveIndicator.tsx`, `pages.ts` (saveScene), editor wiring.
- **Scope:** debounce 2 s, flush triggers, revision tracking, draft to localStorage, backoff retry.
- **Tests:** hook unit tests (fake timers), integration save-200, e2e edit→autosave→reload→verify.
- **Acceptance:** edit → "All changes saved" → reload shows content; page refresh during SAVING loses nothing (draft).
- **Rollback:** disable autosave → read-only editor; draft key isolated.

### v2.1B-4 — Revision conflict handling
- **Objective:** 409 UX, no silent overwrite.
- **Files:** `ConflictDialog.tsx`, `useSceneAutosave.ts` (CONFLICT state + resolve actions), `pages.ts` (surface currentRevision).
- **Scope:** dialog, 3 actions, autosave pause during CONFLICT.
- **Tests:** hook conflict transitions, integration 409, e2e seeded conflict.
- **Acceptance:** stale save never overwrites server scene without explicit user choice.
- **Rollback:** conflict path returns to SAVE_FAILED+manual retry (no data-loss risk either way).

### v2.1B-5 — Page navigation/actions
- **Objective:** Notes shell + actions.
- **Files:** `Notes.tsx`, `PageActions.tsx`, `pages.ts`/`notebooks.ts` (archive/restore/duplicate/reorder/create), title inline edit.
- **Scope:** notebooks+pages list, create, rename, duplicate, archive/restore, nav-flush guard.
- **Tests:** integration actions, e2e full flow.
- **Acceptance:** full list↔editor round-trip; archive/restore/duplicate correct; pending save flushed on nav.
- **Rollback:** actions removed; editor + autosave unaffected.

### v2.1B-6 — Responsive/mobile UX
- **Objective:** mobile canvas + shell polish.
- **Files:** `Notes.tsx`, `PageWorkspace.tsx` (condensed header), minor CSS (no token changes).
- **Scope:** stacked list, icon-only header, touch smoke, viewport checks.
- **Tests:** e2e mobile project smoke.
- **Acceptance:** add element + save on mobile viewport; no layout breakage.
- **Rollback:** cosmetic-only.

### v2.1B-7 — Testing + production validation
- **Objective:** green gates + prod sanity.
- **Files:** full test suite, `db-verify` (unchanged), build.
- **Scope:** `npm run lint && npm run build && npm test` (root+platform), e2e full run, manual smoke on deploy preview.
- **Acceptance:** all gates green; v2.1B commit(s) on top of v2.1A baseline.
- **Rollback:** none needed — additive frontend-only feature.

---

## 15. Acceptance criteria (overall)

1. All v2.1A platform tests green and committed **before** v2.1B work starts.
2. `/notes` shell lists notebooks + pages; create/rename/duplicate/archive/restore all work through the real API.
3. Page opens → hydrates → edits → autosave → reload → scene persisted (E2E-verified).
4. 409 conflict shows the dialog; server scene is never silently overwritten; draft recoverable.
5. Scene > 2 MiB never reaches the server (client pre-check) and server 413 renders gracefully.
6. Cross-user/404 handling shows generic not-found; no existence-oracle leaks in UI.
7. Main bundle size unchanged (Excalidraw lazy); mobile smoke passes.
8. All gates: `npm run lint`, `npm run build`, platform `npm test` (+ `db-verify`), root `test:unit`, Playwright e2e.

---

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **v2.1A baseline not committed / gate red** | Hard prerequisite — §0. Commit v2.1A before any v2.1B branch. |
| Revision bugs silently losing or duplicating scenes | Revision only ever set from server responses; CONFLICT blocks autosave; unit tests on machine; draft tier. |
| Excalidraw sizing/scroll quirks (container height) | Explicit-height container pattern from phase8; early spike in B-1. |
| Lazy-load flash / Suspense UX | LoadingScreen-style fallback; CSS preload of excalidraw CSS on route. |
| 2 MiB cap on complex scenes | Client pre-flight + graceful 413 message + guidance to simplify/split pages. |
| Image paste accidentally embedding dataURLs | Blocked at insertion point in v2.1B (§3); R2 extraction deferred, documented. |
| StrictMode double-effects corrupting save/revision | Idempotent effects, shared in-flight promise (pattern already proven in AuthProvider OAuth boot guard). |
| E2E flakiness (autosave timing) | Deterministic waits on SaveIndicator state, generous timeouts, `retries: 1` already configured. |
| Dark-mode mismatch with Excalidraw theme | Pass `theme` from app state into `appState.theme`; verify both modes in B-1/B-6. |

---

## 17. Explicitly NOT building (v2.1B)

- Real-time collaboration / WebSockets / multiplayer / CRDTs — **no**.
- Offline sync engine / service-worker data sync — **no**; drafts are localStorage-only, PWA config untouched.
- Image/binary persistence (R2 extraction) — **deferred** to a backend-track phase (v2.1C+), boundary documented in phase8 §1.4.
- New DB tables, schema changes, or any `platform/` modification — **none**.
- New state-management library, new modal library, new debounce library — **none** (zustand patterns + hand-rolled modal + tiny debounce inside the hook).
- Excalidraw library sync, collaboration API, embeddable-iframe features — **no**.
- Redesign of existing app pages, routing overhaul, auth changes — **no**.
- Premature abstractions (generic "scene store", plugin systems) — **no**.

---

## 18. Recommended implementation order

1. **Finish v2.1A:** apply the 3 mapped fixes → `npm test` green (platform) → `tsc` → build → `db-verify` → commit v2.1A baseline. Delete scratch `platform/test/debug-exec.spec.ts`.
2. `v2.1B-1` dependency + editor shell (spike sizing/theme early).
3. `v2.1B-2` loading + hydration.
4. `v2.1B-3` autosave (core risk — land early, unit-test hard).
5. `v2.1B-4` conflicts.
6. `v2.1B-5` Notes shell + actions.
7. `v2.1B-6` mobile polish.
8. `v2.1B-7` full gates + e2e + commit per checkpoint (each checkpoint is its own commit/rollback boundary).

---

## Verdict

Architecture is **compatible** with the audited codebase: the v2.1A REST contract fully covers the workspace needs with zero backend changes; the frontend provides every required pattern (auth gate, API client, layout, modal, design tokens, PWA shell, Playwright harness). The only missing piece — a frontend unit-test runner — is a small, justified devDependency addition.

**Blockers (explicit):**
1. **v2.1A is not committed and its gate is red** (19 mapped failures, fixes pending). v2.1B must not start until the v2.1A baseline commit exists. This is a sequencing blocker, not a design blocker.
2. Image assets require a backend (R2) change — deliberately deferred; v2.1B ships without image insertion rather than violating the D1-no-binary rule.

```text
V2.1B READY TO IMPLEMENT — pending the v2.1A baseline commit (Blockers §0/§16)
```
