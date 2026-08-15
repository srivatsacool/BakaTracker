# BakaTracker Architecture — v2 (Cloudflare-Native)

This document defines the architectural boundaries, subsystems, and data
patterns for BakaTracker v2. It supersedes the v1 architecture (React →
Google Sheets / Cloud Run / Auth0), which is archived in `extra/`.

---

## High-Level Layout

```
                   Cloudflare Pages / local dev
                          │
                          ▼
            React 19 PWA (Local-First, Zustand)
                          │
              REST /api/v1/* (fetch) — never MCP
                          ▼
            Cloudflare Worker  (platform/)
            ┌───────────────────────────────────────┐
            │  OAuth Provider (Google)              │
            │  Hono REST router                     │
            │  Tool Registry  ← single business     │
            │  logic shared by REST · MCP · Cron    │
            │  BakaSur AI service (Workers AI +     │
            │  Gemini fallback)                     │
            └───────┬───────────────┬───────────────┘
                    │               │
              ┌─────▼─────┐   ┌─────▼──────┐
              │  D1       │   │  R2        │
              │  (SQLite  │   │  binaries  │
              │   + FTS)  │   │  images/   │
              │           │   │  pdf/voice │
              └───────────┘   └────────────┘
              ┌──────────────────────────────┐
              │  KV (OAUTH_KV)               │
              │  OAuth tokens · notif state  │
              └──────────────────────────────┘

              ▲
              │
     MCP Clients (Claude / Cursor) — AI only, not the browser
```

---

## Architectural Components

### 1. Frontend Client (React 19 + Zustand)
- **Hosting:** Cloudflare Pages (production) or Vite dev server.
- **Storage:** LocalStorage acts as a local replica; UI updates instantly.
- **Sync:** Mutations flow through Zustand store actions, which persist
  locally and push an **operation log** to the Worker (`POST /sync/push`);
  pull (`GET /sync/pull`) reconciles other devices. No more whole-state
  overwrite semantics.
- **Shell:** dark-glass application frame (`src/components/shell/`) with
  ContextBar (date/time, daily score, XP, quest count, sync status, day/night)
  and a collapsible BakaSur assistant rail.

### 2. Backend (Cloudflare Worker — `platform/`)
- **Framework:** Hono. All business endpoints live under `/api/v1/*`
  (`platform/src/http/rest.ts`).
- **Auth:** Google OAuth 2.0 via `@cloudflare/workers-oauth-provider`
  (`/authorize`, `/callback`, `.well-known/oauth-authorization-server`).
  The Worker issues its own access tokens; `unwrapToken` yields
  `{ sub, name, email }` which scopes every request. No token → 401.
- **Tool Registry:** `platform/src/tools/` is the single source of business
  logic. REST, MCP, and scheduled cron all call the same registered tools —
  never duplicated (v2.0 philosophy: UI → REST → registry; MCP → registry).
- **AI (BakaSur):** `platform/src/ai/` — application-level `AiService` with
  bounded input/output, zod-validated structured results, deterministic error
  taxonomy, and secret-safe logging. Providers: Workers AI (`env.AI`,
  `AI_MODEL` / `AI_EMBED_MODEL` overrides, `AI_ENABLED` kill switch) with a
  Gemini REST fallback. Notes AI actions are ownership-scoped and never mutate
  the note (`POST /api/v1/notes/:id/ai/*`).
- **Proactive notifications:** `scheduled` handler + cron `*/15 * * * *`
  runs candidates → policy → AI message → delivery; user-scoped state in KV;
  REST `GET/PUT /api/v1/notifications/settings`; Web Push subscriptions via
  `POST/DELETE /api/v1/push/subscription` (delivery transport stubbed — log
  only, awaiting explicit approval).

### 3. Storage
- **D1 (SQLite):** note text + metadata + tags + FTS index + embedding id;
  plus habits, tasks, journal, events, stats tables (migrations in
  `platform/migrations/`).
- **R2:** ONLY binaries — images, PDFs, voice memos, drawings, videos,
  exports, attachments. Files are referenced by id from D1.
- **KV (`OAUTH_KV`):** OAuth state/tokens and notification settings
  (`baka:notif:*:{sub}`).

---

## API Surface (REST)

| Method | Path | Purpose |
|---|---|---|
| GET | `/registry` | Tool registry listing |
| POST | `/tools/:name` | Invoke a registry tool (business logic) |
| POST | `/sync/push` | Push local op-log changes |
| GET | `/sync/pull` | Pull remote ops for reconciliation |
| POST/GET/DELETE | `/files`, `/files/:id` | R2 binary upload/list/read/delete |
| GET | `/whoami` | Current authenticated identity |
| POST | `/notes/:id/ai/summarize` · `/explain` · `/ask` · `/extract-tasks` · `/extract-concepts` · `/generate-questions` | BakaSur notes AI actions |
| GET/POST/DELETE | `/notebooks`, `/notebooks/:id/pages` | Visual notes notebooks |
| GET/POST/PATCH/DELETE | `/pages`, `/pages/:id`, `/pages/:id/duplicate`, `/pages/:id/restore`, `/pages/:id/archive`, `/pages/reorder`, `/pages/:id/scene` | Note pages (CRUD, duplicate, archive, reorder, Excalidraw scene) |
| GET/PUT | `/notifications/settings` | Notification preferences |
| POST/DELETE | `/push/subscription` | Web Push subscription |

**Local dev only:** `REST_DEV_BYPASS=1` (`.dev.vars`) trusts an `X-User-Sub`
header so the app can exercise the API before OAuth is wired into the UI.
Never set this in production.

---

## Data Integration & Statelessness

- The React app never talks to MCP; it uses REST only.
- MCP clients (Claude, Cursor) talk to the Worker's MCP server
  (`platform/src/mcp/server.ts`), which also goes through the registry.
- Both transports share one business-logic layer, so state can never diverge
  between the UI and AI clients.
- Writes are op-based; read-modify-write whole-state overwrites were removed
  in v2 in favor of the sync op-log.
