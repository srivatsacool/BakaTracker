# BakaTracker — v2.0 Development Plan

> **Status as of this document:** V1 is **complete and frozen**. Work begins on **v2.0 — the Cloudflare-native replatform**.
> This plan consolidates the migration strategy: the GitHub `BakaTracker` repo stays the single source of truth, the UI/Zustand store/gamification is preserved, and the application platform is replaced underneath it using the Cloudflare Workers reference.

---

## 1. Mental model — where each piece lives

### 1.1 `BakaTracker` (GitHub) = **THE PRODUCT**

This is the canonical, living repository. It already has the complete application:

- Full React UI (`src/pages`, `src/components`)
- Zustand state store (`src/store/useStore.ts`)
- Landing page, Tasks, Habits, Journal, Journey (XP/gamification)
- Demo mode, first-run wizard, app tour
- Auth (Auth0 + guest/demo), services, types

**This repository does not get thrown away or rewritten.**

### 1.2 The Cloudflare reference = **THE ARCHITECTURE LIBRARY**

This is **not** a product. It is a box of reusable infrastructure patterns to **mine** — never merge wholesale:

- Worker bootstrap
- Tool Registry
- MCP server
- OAuth (provider-to-MCP + client-to-Google)
- Thin REST transport over the registry
- D1 schema + access layer
- AI provider abstraction
- Sync concepts

---

## 2. v2 is NOT "reference becomes the app"

The migration is **not**:

```
cloudflare-reference
        ↓
    becomes app
```

It **is**:

```
BakaTracker
      │
      ├──────────────┐
      │              │
Current UI    Current Features
      │              │
      └──────────────┘
             │
             ▼
      Replace Platform
             │
    using the Cloudflare reference
```

That's a completely different (and lower-risk) migration: **infrastructure-first**. Replace the platform beneath the app while keeping the product behavior stable.

---

## 3. Freeze the UI

These folders are **touched only when a backend contract changes**. Do not rewrite them:

```
src/pages/
src/components/
src/store/
src/lib/
src/assets/
src/types/
```

> Especially **do not** rewrite `src/store/useStore.ts` (1153 lines). It already holds business logic, XP/level, settings, local cache, events, character, and sync. Rewriting it reintroduces bugs for no benefit. Keep it and swap only the seam below it.

---

## 4. The migration seam — these are the folders that change

```
src/api/
src/services/
src/features/auth/
config/env.ts
```

Today:

```
React → stateService → FastAPI → Google Sheets
```

Becomes:

```
React → stateService → REST → Cloudflare Worker → Registry → D1
```

The pages don't care. `Tasks.tsx` should not know whether data came from Sheets or D1. Only the seam changes.

| Seam | Current | Target |
|---|---|---|
| `src/services/stateService.ts` | `GET/POST /state` (full-blob) | Worker REST (per-entity + `/state` compat) |
| `src/api/apiClient.ts` | Auth0 Bearer → FastAPI | OAuth session → Worker REST |
| `src/features/auth/` | Auth0 (`@auth0/auth0-react`) | Google OAuth via Worker (`workers-oauth-provider`) |
| `config/env.ts` | `VITE_AUTH0_*`, `VITE_API_BASE_URL` | Cloudflare origin + OAuth client |

```diff
- Current:   useStore() → stateService() → Google
+ Target:    useStore() → stateService() → Worker REST → Registry → D1
```

**Minimal UI changes. Maximum backend replacement.**

---

## 5. New features (the only new product work)

### Notes — the one genuinely new module

```
src/pages/Notes.tsx
src/services/notes/…
src/components/notes/…
src/types/Note.ts
```

**Storage rule (locked):**
- **D1** stores note **text + metadata + tags + FTS index + embedding id** (searchable, co-located).
- **R2** stores **binary assets only** (images, PDFs, voice, drawings, videos, exports, attachments).

### Later expansion (builds on D1+R2, no architecture change)
Notes, R2 attachments, Voice, AI search, RAG.

---

## 6. Journey / gamification — the product wins

The Platform initially has no XP/level/character layer — but **the product does**, and the product wins. Therefore the Worker eventually exposes APIs for:

```
events, xp, levels, stats, character, weekly stats, quotes
```

Not because Workers "need" them — because **BakaTracker needs them**. Platform adapts to the product, not the other way around.

---

## 7. Migration phases

| Phase | Scope | Definition of done |
|---|---|---|
| **1. Platform** | Workers · Registry · REST · OAuth · D1 · MCP | No UI changes; backend exists and is exercised |
| **2. Reconnect UI** | Replace only `stateService` implementation | Pages render identically against Worker REST / D1 |
| **3. Decommission** | Remove **FastAPI**, **Auth0**, **Google Sheets**, Apps Script behind, Cloud Run | No v1 runtime or Google-Sheets dependency remains |
| **4. New features** | Notes (D1+R2), attachments, AI search | New product capability ships |
| **5. UI polish** | Landing redesign, Settings redesign, better onboarding | e.g., improvements |
---

## 8. Target repository layout

Instead of splitting v2 into `UI` + `Backend` branches, keep it in one tree that communicates intent:

```
BakaTracker
│
├── src/                      ← KEEP (product UI)
│
├── platform/                 ← NEW: Cloudflare Workers reposit
│     ├── workers/
│     ├── registry/
│     ├── auth/
│     ├── storage/
│     ├── ai/
│     └── mcp/
│
├── docs/
│
└── cloudflare-reference/     ← archived reference (never imported wholesale)
```

---

## 9. Final architecture

```
BakaTracker (Canonical Repository)
│
├── UI (Preserve)
│   ├── Pages · Components · Zustand Store · Gamification
│   ├── Landing · Journal · Habits · Tasks · Journey
│
├── Platform (Replace)
│   ├── Cloudflare Workers · REST API · MCP · Registry
│   ├── Google OAuth · D1 · KV · AI · R2 (future)
│
└── Features (Expand)
    ├── Notes (new) · Attachments · Voice · AI Search · RAG
```

---

## 10. Constraints & guardrails

- **Single source of truth:** the GitHub `BakaTracker` repo.
- **Preserve** UI, Zustand store, gamification, user experience.
- **Mine, don't merge:** imported only reusable infra patterns from the Cloudflare reference.
- **Seams over rewrite:** swap `stateService`/auth/env only; pages & store untouched.
- **No Google Sheets** as a runtime dependency (portable exports instead).
- **No multi-tenancy, no scope creep** — personal, single-user.

## 11. How this was recorded

- This file is committed to `BakaTracker`, the canonical repo.
- Git tag **`v1.0-final`** marks V1 finished and the start of V2 development.