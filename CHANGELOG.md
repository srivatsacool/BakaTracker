# BakaTracker Changelog

All notable changes to BakaTracker will be documented in this file.

---

## [2.3.0] — 2026-08-17 — Landing Polish, Security Fix, AI Model + MCP

### Added
* **Landing text unified at 0.7 alpha** — hero paragraph, body text, captions,
  labels, feature descriptions, and inactive icons all at
  `rgba(233,230,242,0.7)` (paper white at 70% alpha) for a single consistent
  register across the full landing page.
* **Footer bolder** — Fragment Mono 700, full instrument white, violet GitHub
  chip with 700 weight.
* **Sign-in chip (live-accepted)** — statement instrument chip: Fragment Mono
  0.98rem/700, violet-tinted glass, hairline border, blinking cursor LED.
* **MCP integration** — BakaTracker tools accessible via Model Context
  Protocol (38 tools) with OAuth, enabling AI clients (Claude, Cursor, Hermes).

### Changed
* **AI model switched to `@cf/meta/llama-3.2-1b-instruct`** — fast inference
  on Workers AI, replacing the previous Llama 3.3 70B model.
* **Zustand optimization** — 14 whole-store subscriptions converted to
  `useStore(useShallow(s => ({...})))` selectors; Layout, BakaSurRail,
  ContextBar, SyncStatus, all pages, and modals re-render only when their
  own slices change.
* **Input hardening** — `maxLength` added to habit name, notes inputs, BakaSur
  chat, search fields; `max={1000}` on XP inputs (Habits, Eisenhower, FirstRun).
* **Kanban truncation** — task titles use `truncate min-w-0` to prevent
  long-text overflow in narrow columns.
* **DESIGN.md + README.md** updated to reflect v2.3 state.

### Fixed
* **CORS allowlist leak** — the worker's outer CORS wrapper on `/api/v1/*`
  previously reflected the first allowed origin on disallowed requests,
  leaking the allowlist to probing origins. Now reflects the caller's origin
  only when allowlisted; disallowed origins get no `Access-Control-Allow-Origin`
  header. 219/219 platform tests pass.
* **Tasks delete-timer unmount leak** — the 5s undo-grace timer fired
  `deleteTask` after the component unmounted (user navigated away during the
  window). Timer now cleared on unmount.
* **Hero paragraph aria** — accepted live variant baked into `.landing-hero-copy`
  in index.css with 0.7 alpha, line-height 1.85, 0.015em tracking.

### Security
* CORS fix (see Fixed above) — production verified: allowed origin → header
  echoed; evil origin → no ACAO.

---

## [2.2.0] — 2026-08-16 — BakaSur Chat + Premium Glass

### Added
* **BakaSur global chat endpoint lands on the Worker** — `POST /api/v1/assistant/chat`
  (`platform/src/http/assistant.ts`), the contract the UI has been calling since the
  frontend completion plan. Validated body (`message` 1-2000 chars, `history` ≤ 10
  turns, optional page `context`), bounded transcript → 413, `CHAT_SYSTEM` prompt
  (fixed, never interpolated), zod fail-closed reply, full AiError taxonomy
  (400/401/413/502/503). 7 new vitest specs (`platform/test/assistant-chat.spec.ts`).
* **Chat continuity** — the BakaSur rail now sends the last 6 turns as history.
* **v3.1 premium glass refinement (user-pinned)** — modern sleek glassmorphism at
  premium-tooling craft: SyncStatus pill (synced/syncing/offline/error/local-only,
  error click-to-retry), OfflineBanner, themed browser surfaces (violet selection/
  caret, glass scrollbars, focus rings), expo-out motion grammar, light chips →
  glass-alpha tints, `.glass-surface` rule, keyboard-activatable Today quest rows.

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
