# 📜 Changelog

All notable changes to the BakaTracker project are documented in this file.

---

## [2.1.0-beta] — 2026-08-14 (Visual Notes + Web Push Backend)

### Added
* **Excalidraw Visual Notes** — lazy-loaded Excalidraw canvas for drawing/diagramming inside pages. `@excalidraw/excalidraw` v0.18 (MIT) code-split into a separate chunk (~1.8 MB) via `React.lazy` on the `/notes/:pageId` route.
* **Notebook/Page Chrome** — full CRUD lifecycle: create notebooks, create/rename/archive/restore/duplicate pages, inline title rename, archived toggle, lazy page loading per notebook.
* **Debounced Autosave** — 1500ms idle debounce; serialized scene saved via `PUT /pages/:id/scene` with optimistic concurrency (`expected_revision`). 409 conflict surfaced as a non-destructive "Load latest" / "Keep my version" banner.
* **Scene Persistence Gate (E2E)** — Playwright E2E: create notebook → create page → draw rectangle → autosave → API readback (rectangle verified in scene JSON) → reload → canvas re-renders → back-to-list verifies persistence. Auth E2E refactored to share helpers.
* **Web Push Backend** — `WebPushDelivery` behind the existing `NotificationDelivery` seam. `@block65/webcrypto-web-push` (Workers-compatible ECDH + VAPID). Per-device KV subscriptions, `POST`/`DELETE /push/subscription` REST. `LogDelivery` default when VAPID absent (no dev behavior change).
* **ApiClient PATCH method** — added to handle `PATCH /pages/:id` for title rename.
* **ApiClient error envelope** — `BackendUnavailableError.body` now carries the parsed `{ ok:false, ... }` JSON envelope (additive; needed for 409 conflict `currentRevision`).

### Fixed
* **Autosave race** — overlapping flushes reused the same `expected_revision` causing spurious 409s. Fixed with an in-flight serialization guard (`inFlightRef`).
* **Mount-save race** — Excalidraw mount `onChange` bursts triggered an empty-scene save that raced the first real draw save. Fixed with a hydrated-scene id-set comparison that disarms after the first real edit.
* **Archive state bug** — `handleArchivePage` removed pages from state entirely, preventing archived pages from appearing under "Show archived". Fixed to update `archived_at` in place.
* **E2E CORS harness gap** — `e2e-worker.mjs` defaulted CORS allowlist to `http://localhost:5173` but the SPA ran at `http://127.0.0.1:5173`, blocking the browser's own `whoami` fetch. Fixed via `E2E_CORS_ORIGINS` env in `playwright.config.ts`.

### Changed
* **Layout double-mount** — Layout renders the routed page into two `<main>` elements (hidden mobile + visible desktop). Excalidraw renders in both; canvas locators now scope to `main.hidden.md\:block` (desktop) for deterministic targeting.

### Deferred from 2.1.0-beta
* Custom service worker (vite-plugin-pwa `injectManifest`) + browser Push subscription.
* Push settings UI + end-to-end delivery test.
* v2.0 released notes UI (deferred to v2.3 UI rehaul).

---

## [2.0.0] — 2026-08 (Production Foundation)

### Added
* **Cloud Run Backend Deployment:** Containerized FastMCP Python server to run as an online gateway on Google Cloud Run.
* **FastAPI Router Wrapper:** Exposes health probes (`/health`, `/version`) and metadata monitoring endpoints (`/info`, `/metrics`, `/ready`).
* **Bearer Token Security:** Added `AuthAndLoggingMiddleware` checking for `Authorization: Bearer <token>` on all protected endpoints.
* **Fail-Fast Startup checklist:** Added checks for environment variables, URL formatting, and MCP tool counts before uvicorn boots.
* **Resilient Client Connections:** Configured sheets client with a 10s request timeout limit and a 3-retry exponential backoff policy (0.5s, 1s, 2s).
* **V1.0 Documentation Suite:** Generated complete guides for installation, API endpoints, database schemas, and developer standards.

### Changed
* **Repository Folder Restructuring:** Moved all FastMCP server scripts out of `bakatracker-mcp/` directly to `backend/` and removed the old folder.
* **Environment Configuration:** Refactored env loading inside Python to use a single centralized module (`backend/config.py`).
