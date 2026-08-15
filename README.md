# 🚀 BakaTracker — v2

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF.svg)](https://vite.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Hosting-Cloudflare%20Workers-orange.svg)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1-orange.svg)](https://developers.cloudflare.com/d1/)
[![Cloudflare R2](https://img.shields.io/badge/Storage-Cloudflare%20R2-orange.svg)](https://developers.cloudflare.com/r2/)
[![Google OAuth](https://img.shields.io/badge/Auth-Google%20OAuth-green.svg)](https://console.cloud.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

> **BakaTracker** is a gamified personal life operating system — an RPG where
> your habits, tasks, journal entries, and notes earn XP and level up a
> character. **v2 is Cloudflare-native**: React PWA → Cloudflare Workers REST
> API → D1 + R2 + KV. Self-hostable, single-user by design, zero
> subscriptions. *"Track your life without turning it into a project."*

---

## ✨ What's new in v2

| | v1 (legacy) | **v2 (this repo)** |
|---|---|---|
| **Backend** | Python FastAPI on Google Cloud Run + Google Apps Script | **Cloudflare Workers** (`platform/`) |
| **Database** | Google Sheets via Apps Script proxy | **Cloudflare D1** (SQLite: notes, FTS, tags) + **R2** (binaries) + **KV** (OAuth, notifications) |
| **Auth** | Auth0 JWT / static bearer | **Google OAuth** via `workers-oauth-provider` (+ offline guest mode) |
| **API style** | MCP-first, UI hit Sheets | **REST-only for the UI** (`/api/v1/*`); MCP reserved for AI clients |
| **UI** | Neo-brutalist light/dark | **Dark glassmorphism** with LightTunnel WebGL background |
| **AI** | — | **BakaSur assistant** (Workers AI + Gemini fallback), notes AI actions, proactive notifications |
| **Sync** | Sheets `sync` overwrite | **Local-first with op-log sync** (`/sync/push`, `/sync/pull`) |

---

## 🗺️ Table of Contents

1. [Features](#-features)
2. [Routes](#-routes)
3. [Technical Architecture](#-technical-architecture)
4. [Folder Structure](#-folder-structure)
5. [Tech Stack](#-tech-stack)
6. [Local Development](#-local-development)
7. [Deploy Your Own Instance](#-deploy-your-own-instance)
8. [Security](#-security)
9. [Developer Guidelines](#-developer-guidelines)
10. [Troubleshooting](#-troubleshooting)
11. [Roadmap](#-roadmap)

---

## 🎨 Features

- **Habits** — 5 tracker types: checkbox, counter, numeric, mood, energy. Each feeds XP and a character stat.
- **Tasks (Kanban)** — Backlog → Todo → Doing → Done master board; star tasks onto the Today board.
- **Eisenhower Matrix** — Do First 🔥 / Schedule 📅 / Delegate 👥 / Delete 🗑️ quadrant prioritization.
- **Today Focus Board** — starred tasks in one execution view, with spotlight focus mode and floating XP.
- **Daily Journal** — highlight + mood + notes, one entry per day.
- **Journey Analytics** — consistency heatmap, XP over time, streak tracking, stat breakdowns.
- **Visual Notes** — Excalidraw-style notebook pages (create, duplicate, archive, reorder), saved to D1/R2.
- **RPG Character** — 5 stats (Discipline, Health, Knowledge, Creativity, Career), XP, levels, celebration moments.
- **BakaSur AI Assistant** — in-app assistant with suggested prompts; notes AI actions (summarize, explain, ask, extract tasks/concepts, generate questions).
- **Web Push Notifications** — opt-in notifications with quiet hours and personality settings.
- **Local-first sync** — instant UI, background op-log sync when online; offline guest mode works fully.
- **PWA** — installable, service-worker cached, works offline.

---

## 🧭 Routes

| Path | Page |
|---|---|
| `/` | Landing / walkthrough |
| `/today` | Today Focus Board |
| `/habits` | Habits tracker |
| `/tasks` | Kanban task board |
| `/eisenhower` | Eisenhower matrix |
| `/journal` | Daily journal |
| `/journey` | Analytics dashboard |
| `/notes` | Visual notes library |
| `/notes/:pageId` | Note editor workspace |

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────┐
│   React 19 PWA (src/)       │  Dark glassmorphism, Zustand store,
│   local-first, offline      │  LocalStorage replica + sync queue
└──────────────┬──────────────┘
               │ REST only (fetch) — never MCP
┌──────────────▼──────────────┐
│   Cloudflare Worker (platform/) │  Hono REST API (/api/v1/*)
│   Google OAuth (workers-    │  Tool Registry = single business logic
│   oauth-provider)           │  REST + MCP + Cron share the registry
└──────┬──────────┬───────┬───┘
       │          │       │
   ┌───▼───┐  ┌──▼───┐ ┌─▼──────────────┐
   │ D1    │  │ R2   │ │ KV (OAUTH_KV)  │
   │ SQLite│  │ bins │ │ tokens/notif   │
   └───────┘  └──────┘ └────────────────┘
```

**Key decisions (v2):**
1. **React talks REST only** — `/api/v1/*` via Hono. MCP is for AI clients (Claude, Cursor), not the browser.
2. **One Tool Registry** — tools in `platform/src/tools/` power REST, MCP, cron, and future transports. No duplicated business logic.
3. **D1 for text, R2 for binaries** — notes text + metadata + tags + FTS live in SQLite; images/PDFs/audio/exports go to R2.
4. **Google Sheets removed entirely** — replaced by portable exports + the sync API.
5. **Dark glass design system** — documented in [DESIGN.md](DESIGN.md); product rationale in [PRODUCT.md](PRODUCT.md).

---

## 📂 Folder Structure

```
BakaTracker/
├── src/                    # React 19 frontend (PWA)
│   ├── components/
│   │   ├── background/     # LightTunnel WebGL background
│   │   ├── shell/          # ContextBar, BakaSurRail, GlassPrimitives, GlassContainer
│   │   └── shared/         # Layout, modals, user menu
│   ├── pages/              # Landing, Today, Habits, Tasks, Eisenhower, Journal, Journey, Notes
│   ├── features/auth/      # Google OAuth + guest/demo mode
│   ├── store/useStore.ts   # Zustand store, local cache, sync queue
│   ├── services/           # REST API client
│   ├── lib/                # tour, stats helpers
│   └── types/              # TypeScript interfaces
├── platform/               # Cloudflare Worker backend
│   ├── src/
│   │   ├── http/           # REST endpoints (Hono)
│   │   ├── auth/           # Google OAuth handlers
│   │   ├── tools/          # Tool Registry (business logic)
│   │   ├── ai/             # BakaSur AI service (Workers AI + Gemini)
│   │   ├── notifications/  # proactive notifications
│   │   ├── mcp/            # MCP server (AI clients)
│   │   └── storage/        # D1 repositories, R2 files, sync
│   ├── migrations/         # D1 SQL migrations
│   └── scripts/            # db-verify, e2e worker helpers
├── scripts/                # setup.mjs, deploy.mjs, pages tests, env sync
├── public/                 # PWA manifest, icons, logo
├── e2e/                    # Playwright specs (archived in extra/)
├── DESIGN.md               # Design system spec (dark glass)
├── PRODUCT.md              # Product spec
└── extra/                  # gitignored archive (legacy files, see .gitignore)
```

> **Note:** Legacy v1 artifacts (Python `backend/`, `google-apps-script.js`,
> `docs/`, old `Plan.md`) are archived in `extra/` (gitignored) — they are not
> part of the v2 build.

---

## 🧰 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, lucide-react |
| Backend | Cloudflare Workers, Hono, `workers-oauth-provider` |
| Database | Cloudflare D1 (SQLite + FTS), Cloudflare R2, Cloudflare KV |
| AI | Workers AI (`AI_MODEL`/`AI_EMBED_MODEL`), Gemini REST fallback |
| Auth | Google OAuth 2.0 (Authorization Code + PKCE) |
| PWA | Vite PWA, injectManifest service worker |
| Tests | Vitest (platform), Node test runner (pages checks), Playwright (e2e) |
| Deploy | `wrangler` + `scripts/setup.mjs` + Cloudflare Pages |

---

## 🛠️ Local Development

```bash
npm install && (cd platform && npm install)

# 1. Worker API (http://localhost:8787)
cd platform && npx wrangler dev
#    copy platform/.dev.vars.example → platform/.dev.vars and fill secrets
#    (set REST_DEV_BYPASS=1 in .dev.vars for local dev before OAuth is wired)

# 2. Frontend (http://localhost:5173)
npm run dev
```

Wrangler simulates D1/KV/R2 locally — no Cloudflare resources needed for dev.

### Verification suite

```bash
npm run build         # tsc + vite production build
npm run lint          # eslint
npm run test:pages    # production build contract checks (10 tests)
cd platform && npm test   # vitest + db-verify (81+ tests)
```

---

## ⚡ Deploy Your Own Instance

Built to be forked and self-hosted — each instance is fully independent
(own Worker, own D1, own KV, own OAuth client). No shared backend, no SaaS.

```bash
git clone <your fork>
cd BakaTracker
npm install && (cd platform && npm install)

npm run setup      # 1. interactive: D1 + KV + R2, wrangler.prod.jsonc, secrets
                   #    → register the printed Google redirect URI in Google Cloud
npm run deploy     # 2. deploy the Worker (REST + OAuth + MCP)
```

Then publish the frontend on **Cloudflare Pages**: build command `npm run build`,
output `dist`, with production env vars `VITE_API_BASE_URL=<worker origin>` and
`VITE_GOOGLE_CLIENT_ID=<client id>` (see [DEPLOYMENT.md](DEPLOYMENT.md)).

---

## 🛡️ Security

- **Google OAuth** via `workers-oauth-provider` — the Worker issues its own
  access tokens; every `/api/v1/*` request is authenticated (no token → 401).
- **Owner-scoped data** — tokens carry `sub`/`email`; repositories scope reads
  and writes to the authenticated user.
- **Local dev bypass** (`REST_DEV_BYPASS=1`) is dev-only and must never be set
  in production.
- **Production gate** — `test:pages` asserts the built `dist/index.html` never
  references `localhost` or the source tree.
- Secrets live in `.dev.vars` / Wrangler secrets, never in git (`.env*` ignored).
  See [SECURITY.md](SECURITY.md).

---

## 🛠️ Developer Guidelines

1. **Store actions only** — React components never call the REST API directly;
   all mutations go through Zustand actions in `src/store/useStore.ts` (local
   cache + sync queue).
2. **Registry over duplication** — new business logic goes into
   `platform/src/tools/`; REST/MCP/cron call the same registry tools.
3. **D1 schema changes** — add a numbered migration in `platform/migrations/`,
   never edit applied migrations.
4. **Verify before pushing** — `npm run build`, `npm run test:pages`,
   `cd platform && npm test`.
5. **Design system** — new UI uses the glass primitives in `src/components/shell/`
   and tokens from [DESIGN.md](DESIGN.md); no legacy light-mode hardcodes.

---

## 💬 Troubleshooting

- **401 on API calls** — you're not signed in (or the OAuth token expired);
  sign in via the UI. In local dev, ensure `REST_DEV_BYPASS=1` is set in
  `platform/.dev.vars`.
- **`test:pages` fails on "localhost"** — a dev script leaked into
  `index.html`; production builds must not reference the dev server.
- **Worker deploy fails** — run `cd platform && npm run db:migrate:remote`
  and verify secrets with `wrangler secret list`.
- **Sync not reaching the server** — check `VITE_API_BASE_URL` on Pages and
  the Worker's CORS allow-list (`APP_ORIGIN`).

---

## 🗺️ Roadmap

- [ ] BakaSur chat in the UI once `/api/v1/assistant/chat` lands in the Worker
- [ ] Conflict resolution UI for multi-device op-log merges
- [ ] Delivery transport for proactive notifications (push → email)
- [ ] Habit archiving without losing history
- [ ] Export / import (portable, non-Sheets)

BakaTracker is **MIT licensed**. Contributions welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md). Changes are tracked in
[CHANGELOG.md](CHANGELOG.md).
