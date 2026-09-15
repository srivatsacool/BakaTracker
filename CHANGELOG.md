# BakaTracker Changelog

All notable changes to BakaTracker will be documented in this file.

---

## [2.3.0] — 2026-09-15 — BakaTracker v2.3.0 — Production Release

### Major Features
* **Gamified Life RPG System** — Complete personal life operating system unifying habits (checkbox, counter, numeric, mood, energy), tasks (Kanban master board), Eisenhower matrix prioritization, today focus board, daily journaling with mood ratings, and visual notes with full state persistence.
* **RPG Character Progression** — Dynamic attribute progression across 5 stats (Discipline, Health, Knowledge, Creativity, Career) with celebratory level-ups and consistency heatmaps.
* **Cinematic Home & Lighting** — Responsive character fitting, ambient lighting passes, and clean landing flow without stock UI or mockup artifacts.

### Architecture
* **Cloudflare Workers Native** — Serverless edge API (`platform/`) written in Hono, handling REST (`/api/v1/*`), OAuth, MCP, and cron triggers in a unified runtime.
* **Unified Tool Registry** — 38 canonical tools in `platform/src/tools/` powering REST, MCP, and internal automation from a single business logic implementation.
* **Storage Hierarchy** — Cloudflare D1 (SQLite-compatible) for structured entities, tags, search index, and op-log ledger; Cloudflare R2 for binary attachments; Cloudflare KV for session tokens and push subscriptions.
* **Local-First Sync** — Instant local mutations backed by browser `localStorage` + causal op-log queue with debounced and exponential-backoff sync (`/sync/push`, `/sync/pull`).

### Security Improvements
* **Google OAuth 2.0 with PKCE** — Implemented via `@cloudflare/workers-oauth-provider`; Worker acts as OAuth authorization server issuing owner-scoped access tokens (`sub`).
* **Strict CORS Allowlist** — Disallowed origins receive no `Access-Control-Allow-Origin` header (zero allowlist reflection leakage).
* **Owner-Scoped Data Scoping** — Every query and R2 object key is strictly scoped to the authenticated user's `sub`. Zero multi-tenant cross-contamination.
* **Defense-in-Depth Dev Bypass** — `REST_DEV_BYPASS` is double-gated by strict loopback origin checks (`isLocalDevOrigin`) and omitted from all production configs.
* **Secret Hygiene** — Automated build contract tests guarantee no OAuth secrets, API keys, or private keys are exposed to the client bundle.

### Performance Improvements
* **Zustand Optimization** — Converted 14 whole-store subscriptions to granular `useShallow` selectors across rails, context bars, modals, and pages to eliminate cascading renders.
* **Asset & Component Pruning** — Stripped unused components (`Silk.tsx`, `CinematicSequence.tsx`, `InteractiveHeroCard.tsx`, `HabitTrackerHUD.tsx`, `QuestBoardHUD.tsx`, `WeekStrip.tsx`).
* **Code Splitting & PWA Caching** — Heavy canvas and charting views split into dynamic chunks with service worker precaching.

### MCP Support
* **Model Context Protocol (MCP)** — Exposes 38 BakaTracker tools via `@modelcontextprotocol/sdk` and `MyMCP` Durable Object at `/mcp`, enabling AI agents (Claude, Cursor, Hermes) to manage tasks, habits, and notes through authenticated tool calls.

### AI Support
* **BakaSur AI Assistant** — Route-aware contextual assistant backed by Workers AI (`@cf/meta/llama-3.2-1b-instruct` and `@cf/baai/bge-base-en-v1.5`) with daily quota management and graceful 503 fallback when offline or unconfigured.

### PWA Support
* **Full Offline PWA** — Service worker precaching, web app manifest, offline indicator, and local guest mode enabling full functionality without internet connectivity.

### Known Limitations
* **Single-User Architecture** — Each deployment is designed for single-user self-hosting; multi-user tenant collaboration is not supported.
* **Workers AI Free Quota** — Daily AI assistant interactions depend on Cloudflare Workers AI limits or configured daily limits in Settings.

### Self-Hosting & Deployment
* Automated one-command setup via `npm run setup` and deployment via `npm run deploy`.
* Self-hostable on Cloudflare's free tier (Workers + D1 + KV + R2 + Pages).

### Migration Information
* Fully migrates from v1 (Google Sheets proxy) to v2 Cloudflare-native storage. Migrations `0001` through `0004` run automatically via `wrangler d1 migrations apply`.

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
