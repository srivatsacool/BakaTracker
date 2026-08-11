# Phase 8 — v2.1 · Excalidraw Visual Notes + BakaSur Page Interpretation

Status: **NEXT** (defined; not implemented) · Supersedes: nothing · Reuses: `AiService`, `notes-ai.ts` pipeline, repositories

---

## 1. Excalidraw integration (track 3A)

### 1.1 Package decision
- **`@excalidraw/excalidraw` v0.18.x** — official embeddable package, **MIT license**, React peer deps `^17 || ^18 || ^19` (frontend is React 19 ✓). Verified exports: `Excalidraw` component, `serializeAsJSON`, `restore`/`restoreElements`, `getTextFromElements`, `getNonDeletedElements`, `exportToBlob/exportToCanvas/exportToSvg`, `loadSceneOrLibraryFromBlob`, `mergeLibraryItems`, `serializeLibraryAsJSON`, `parseLibraryTokensFromUrl`, `useHandleLibrary`, `convertToExcalidrawElements`, `useDevice`, `THEME`/`MIME_TYPES`, `Sidebar`/`MainMenu`/`Footer`/`WelcomeScreen`.
- **Bundle:** dist prod `index.js` ≈ 490 KiB raw / **~151 KiB gzip** (measured 0.18.1). Loaded via `React.lazy` on the Notes route only — never in the main bundle. CSS via `@excalidraw/excalidraw/index.css` (required; parent container needs explicit height).
- **Client-only** — no SSR concerns (Vite SPA); wrap in a lazy component, render in a sized container.
- Do NOT vendor Excalidraw source. Use the supported package; custom chrome stays outside the canvas (React shell around `<Excalidraw />`).

### 1.2 Scene model & serialization
- Scene JSON (v2 format): `{ type: "excalidraw", version: 2, source, elements[], appState, files{} }`.
- Elements: `rectangle|ellipse|diamond|arrow|line|freedraw|text|image|frame|embeddable|iframe`; common fields: `id, type, x, y, width, height, angle, strokeColor, backgroundColor, fillStyle, strokeWidth, strokeStyle, roughness, opacity, groupIds, frameId, roundness, seed, version, versionNonce, isDeleted, boundElements, link, locked`. Text elements carry `text/fontFamily/fontSize/textAlign/verticalAlign/containerId`; arrows carry `startBinding/endBinding`; images reference `files`.
- **Persistence:** `serializeAsJSON(elements, appState, files, "local")` → store the JSON string in `notes.scene` (D1 TEXT). **Load:** `restore(scene, appState, files)` — handles schema migration of older scenes (forward compatibility is built-in; always run scene through `restore` on load).
- `files{}` in the scene map image ids → `{ mimeType, dataURL, created, lastRetrieved }`.

### 1.3 Libraries
- `mergeLibraryItems` / `serializeLibraryAsJSON` for user library persistence (per-user KV key `baka:excalidraw:lib:{sub}` — small JSON; D1 not needed), `parseLibraryTokensFromUrl` + `useHandleLibrary` for the "Add to library" flow, `loadLibraryFromBlob` for `.excalidrawLibrary` files.
- Default libraries ship in the package; no bundling decision required beyond the lazy route.

### 1.4 Asset handling (images → R2)
- Storage rule (locked): **D1 never stores binary.** On page save, the client sends the scene; the worker extracts any `files` entries with `dataURL` payloads:
  - upload payload → R2 (`pages/{userId}/{pageId}/{fileId}.{ext}`), server-derived keys only;
  - replace `dataURL` with a reference token in the stored scene; keep `mimeType` + byte size as metadata.
- On page open: worker returns scene with file *metadata*; the client fetches each image from R2 (parallel, in-memory cache; regenerate `files` map with `dataURL` from the signed GET / same-origin R2 binding) before `restore()`.
- Cap per-image size + per-page total (e.g., 10 MB/image, 50 MB/page) at upload; reject beyond bounds (413-style).

### 1.5 Export / import
- Export: `.excalidraw` file (`serializeAsJSON` → blob), PNG (`exportToBlob({ mimeType:"image/png" })`), SVG (`exportToSvg`); exports go to R2 if user-requested persistence (`files` metadata row), otherwise client-side download.
- Import: `loadSceneOrLibraryFromBlob` on `.excalidraw` / `.excalidrawLibrary` files; `convertToExcalidrawElements` for foreign formats.

### 1.6 Mobile behavior
- Touch-first canvas is Excalidraw's default; `useDevice` drives chrome density. The v2.1 shell stays minimal (notebook list + canvas); polish is v2.3. iOS note: image paste/file pick is supported in modern browsers.

### 1.7 Autosave requirements (concrete)
- **No per-mouse-event persistence.** Coalesce: debounce `onChange` 1.5–3 s after the last change; flush on `visibilitychange`/`beforeunload`/blur; heartbeat 30 s while dirty.
- **Optimistic UI:** save is fire-and-forget with local `saved_at` indicator; failure → queue.
- **Offline queue:** last unsaved scene kept in localStorage (`baka:page:{id}:draft`), retried with exponential backoff (2 s → 30 s cap); on reconnect, flush.
- **Conflict strategy:** client sends `base_version` (server `updated_at`/revision). Server applies last-write-wins only if versions match; else **409** → client offers *reload remote* (draft preserved separately) or *overwrite*. Single-user app → rare; never silently drop either side (draft kept in localStorage until resolved).
- **No data loss:** draft + server copy + conflict draft = three tiers; nothing overwrites without version agreement.

## 2. Notes data model (track 3B)

**Decision: extend, don't replace.** Existing `notes` (0001: `id, user_id, created_at, updated_at, title, body, tags, vector`) stays; text notes become pages via extension. Backward compatibility: all existing REST/tool/MCP consumers of `notes` keep working.

### 2.1 Migration `0003_notes_pages.sql`
```sql
CREATE TABLE IF NOT EXISTS notebooks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT 'Personal',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notebooks_user_position ON notebooks(user_id, position);

ALTER TABLE notes ADD COLUMN kind TEXT NOT NULL DEFAULT 'text';        -- 'text' | 'excalidraw'
ALTER TABLE notes ADD COLUMN scene TEXT;                                -- serialized Excalidraw JSON (kind='excalidraw')
ALTER TABLE notes ADD COLUMN notebook_id TEXT;                          -- NULL → default notebook
ALTER TABLE notes ADD COLUMN position INTEGER NOT NULL DEFAULT 0;       -- ordering within notebook
ALTER TABLE notes ADD COLUMN archived_at TEXT;                          -- soft delete (restore support)
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_position ON notes(user_id, notebook_id, position);
```
- `title`/`body` semantics: text notes unchanged. For `kind='excalidraw'` pages, `body` = **bounded plain-text projection** of the scene (see §3.1) — powers existing LIKE search, the AI window, and backward compat.
- `vector` column remains reserved for v2.2 embeddings (page-level or chunk-level; decided in phase10).
- Ordering: `position` is a sparse integer (e.g., 1000-step increments) — reorder = update positions of the moved range only; duplicate = new row with copied scene + `position = max+1000`.
- Delete = soft (`archived_at = now`); restore = clear it; trash retention/purge via scheduled handler (documented; not built).
- Seed: existing notes get `kind='text'`, `notebook_id=NULL` (resolved to the default "Personal" notebook at read time).

### 2.2 Repository / REST
- `repositories.notes` extended: `listPages(sub, notebookId)` (ordered, active only), `create/rename/reorder/duplicate/archive/restore`, `get` unchanged, `updateScene(sub, id, scene, baseVersion)` (409 semantics).
- New routes under the existing global auth guard: `GET/POST /notebooks`, `GET /notebooks/:id/pages`, `POST /pages`, `PATCH /pages/:id`, `POST /pages/:id/duplicate`, `POST /pages/:id/archive`/`restore`, `PUT /pages/:id/scene` (versioned). Page scene save and page metadata are **separate endpoints** — metadata edits never resend scenes.
- Sync: `GET /sync` continues to expose notes; scene payloads ride the same sync envelope (size-bounded; images stay in R2, referenced by id).

### 2.3 Isolation
Every page operation goes through `repos.notes` with `(sub, id)` ownership (404, no existence oracle) — same convention as Phase 7. No cross-user page access; no shared notebooks in v2.1.

## 3. BakaSur + Notes (track 3C)

### 3.1 Page interpretation layer (worker-side, never the model)
```
scene (notes.scene)
  → restore() (sanitize/schema-migrate)
  → getTextFromElements(elements)  → text + labels (bounded ≤ 8,000 chars)
  → element-type histogram (counts; frames → sections)
  → relationship graph: arrows (startBinding/endBinding → node ids + node text),
    containerId (labels bound to shapes), frameId membership
  → image METADATA only: count, mimeTypes, byte sizes — NEVER dataURLs/pixels
  → links (element.link) + URL count
  → totals: element count, deleted elements excluded (getNonDeletedElements)
  → PageRepresentation { page_id, title, text, structure, relationships, images, links, version }
```
- Bounds: text ≤ 8,000 chars, relationship entries ≤ 200, representation JSON ≤ ~12,000 chars (below `AI_INPUT_MAX_CHARS`).
- **The model receives only `PageRepresentation` — never raw scene JSON.** This is the controlled representation the roadmap requires.

### 3.2 AI actions (v1, read-only, minimal safe subset)
Reuse `handleNoteSummarize`'s pipeline shape for each action (guard → ownership → bounded retrieve → interpret → `generateStructured` → zod result):

| Action | Route | Schema (result) |
|---|---|---|
| summarize | `POST /notes/:id/ai/summarize` (exists) | `{ summary ≤2000, key_points[] ≤8 }` |
| explain | `POST /notes/:id/ai/explain` | `{ explanation ≤2000 }` |
| ask | `POST /notes/:id/ai/ask` | body `{ question ≤1000 }` → `{ answer ≤2000, confidence? }` |
| extract_tasks | `POST /notes/:id/ai/extract-tasks` | `{ tasks[] ≤20 }` — **read-only; user must explicitly add to Tasks** |
| extract_concepts | `POST /notes/:id/ai/extract-concepts` | `{ concepts[] ≤15 }` |
| generate_questions | `POST /notes/:id/ai/generate-questions` | `{ questions[] ≤10 }` |

- Prompts: constant app-authored strings added to `src/ai/prompts.ts` (per-action system prompts; representation injected as data).
- **AI never mutates a page without an explicit user action** — no action in this list writes; task extraction returns suggestions only.
- Rate limiting (v2.1 hardening): per-user token bucket on `/notes/:id/ai/*` before UI exposure.

### 3.3 Testing (unit, no live inference)
New spec `test/pages-ai.spec.ts`: representation builder (bounds, injection-as-data), each action's schema (fake provider), ownership 404s, 413 on oversized pages, degraded-provider → deterministic errors, mutation-absence assertion (page bytes unchanged after every action).
