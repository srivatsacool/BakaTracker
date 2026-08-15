# BakaTracker Changelog

All notable changes to BakaTracker will be documented in this file.

---

## [2.0.0] — 2026-08-15 — v2 Release

### Added
* **Cloudflare-native v2 release.** The React PWA now talks REST-only to a
  Cloudflare Worker (`platform/`); Google Sheets / Apps Script / Cloud Run /
  Auth0 are gone (archived under `extra/`).
* **Tool Registry:** single business-logic layer in `platform/src/tools/`
  shared by REST, MCP, and cron — no duplicated logic per transport.
* **Google OAuth** via `workers-oauth-provider` (authorization code + PKCE),
  replacing Auth0 JWT / static bearer auth. Owner-scoped data by `sub`.
* **D1 storage** (SQLite + FTS) for notes/habits/tasks/journal/stats, **R2**
  for binaries, **KV** for OAuth + notification state; op-log sync
  (`/sync/push`, `/sync/pull`) replaces whole-state Sheets sync.
* **Dark glassmorphism design system** (LightTunnel WebGL background, glass
  primitives, ContextBar, BakaSurRail) — see `DESIGN.md`.
* **BakaSur AI** in-app assistant + notes AI actions (summarize/explain/ask/
  extract-tasks/extract-concepts/generate-questions) via Workers AI with
  Gemini fallback.
* **Web Push notifications** with opt-out, personality, and quiet hours.
* **Visual Notes** notebooks with Excalidraw-style pages (duplicate, archive,
  reorder, scene save).
* **Production gates:** `test:pages` asserts SPA fallback, no-localhost, and
  PWA artifacts in `dist/`; `setup.mjs` one-command provisioning.

### Removed
* Legacy Python `backend/`, `google-apps-script.js`, `docs/`, and `Plan.md`
  archived to gitignored `extra/` (kept on disk, out of the v2 build).

---

## [2.1.0] — 2026-08-11

### Added
* **Workers AI foundation:** application-level `AiService` (bounded input/output, zod-validated structured results, deterministic error taxonomy, secret-safe logging); Workers AI provider via `env.AI` (`AI_MODEL` / `AI_EMBED_MODEL` overrides, `AI_ENABLED` kill switch); Gemini REST fallback preserved.
* **BakaSur tool contract:** read-first tool allowlist + assertion gate; no direct DB access for the agent; all tool calls pass through the existing registry/auth/business-logic path.
* **Notes AI action:** `POST /api/v1/notes/:id/ai/summarize` (ownership-scoped, bounded input, graceful 502/503 on AI failure; note never mutated). UI deferred to v2.1.
* **Proactive BakaSur foundation:** `scheduled` handler + cron `*/15 * * * *` running the deterministic candidates → policy → AI message → delivery pipeline; user-scoped settings/state in existing `OAUTH_KV` (`baka:notif:*:{sub}`); REST `GET/PUT /api/v1/notifications/settings`; delivery transport intentionally stubbed (log only).
* **Tests:** 36 new tests (`ai-notes.spec.ts`, `notifications.spec.ts`) — zero live inference, fake providers only. Suite: 81/81.
* **Docs:** `docs/ai/notifications.md`, `docs/ai/implementation.md` (now archived under `extra/docs/ai/`); `architecture.md` updated to shipped reality.

### Notes
* Production deployment of the AI-enabled Worker requires explicit approval (deploy gate). No Vectorize, no AI Gateway, no delivery transport, no OAuth/DNS/Pages changes in this phase.

---

## [1.0.1] — 2026-07-03

### Fixed
* **Cloudflare Build**: Fixed `package-lock.json` dependency sync issue for clean install by regenerating the lockfile.

## [1.0.0] — 2026-07-02

### Added
* **Google Cloud Run Deployment:** Created containerization configuration allowing the FastMCP server to be deployed as an online service.
* **FastAPI Gateway:** Exposes health checks (`/health`, `/ready`), discovery pathways (`/`), and system stats (`/info`, `/metrics`) alongside mounted MCP Server-Sent Events (SSE) and Streamable HTTP transports.
* **Stateless Token Authentication:** Middleware securing `/ready`, `/info`, `/metrics`, and `/mcp` endpoints using `Authorization: Bearer <token>` validation.
* **Stateless Configuration Engine:** Created `backend/config.py` as the single configuration manager, removing all scattered `os.getenv` calls.
* **Resilience Retry Engine:** Pinned HTTP request timeouts to 10.0s and implemented a 3-retry exponential backoff policy (0.5s, 1s, 2s) for Apps Script calls.
* **Startup Verification Check:** Fail-fast checklist checking variables, URLs, pings, and tools on server boot.
* **CI/CD Pipelines:** Created Google Cloud Build (`cloudbuild.yaml`) and GitHub Actions workflows (`.github/workflows/deploy.yml`) with health check gate validations.
* **Documentation Guides:** Created `/backend/README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, and this `CHANGELOG.md` document.

### Changed
* **Repository Reorganization:** Relocated the Python MCP server files from `bakatracker-mcp/` directly to the `backend/` folder (`backend/server.py`, `backend/tools/`, etc.).
