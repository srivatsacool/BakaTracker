# Notes AI Action Contract (v2.1 notepad backend)

The v2.1 Notes UI calls these backend actions. **`summarize` (Phase 7) and the
five track-3C actions (`explain`, `ask`, `extract-tasks`, `extract-concepts`,
`generate-questions`) are implemented**; the remaining three are specified so
they can be added without a backend redesign. Actions are user-scoped REST
endpoints; the UI never talks to the model directly.

## Common conventions

- Base: `POST /api/v1/notes/:id/ai/<action>` — bearer token required
  (401), note must belong to the caller (404, existing convention), note
  content is bounded (413 when over the AI window), AI unavailable → 503,
  upstream/model failure → 502.
- Response envelope (repo convention): `{ ok: true, result: {...} }` with
  every result carrying `model` + `request_id`.
- No action mutates the note. Mutations stay in the regular notes API.
- Input window: `AI_INPUT_MAX_CHARS = 24_000` (title + body).

## Implemented

### summarize — `POST /api/v1/notes/:id/ai/summarize`

```jsonc
// 200
{ "ok": true, "result": {
    "summary":     "string ≤ 2000",
    "key_points":  ["string ≤ 200", ... ≤ 8],
    "model":       "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "request_id":  "uuid"
} }
// 401 missing/invalid token · 404 not found / not owned · 413 over window
// 503 AI disabled/not configured · 502 upstream or output-validation failure
```

### explain — `POST /api/v1/notes/:id/ai/explain`

```jsonc
// 200
{ "ok": true, "result": {
    "explanation": "string ≤ 2000",
    "model":       "...", "request_id": "uuid"
} }
```

### ask — `POST /api/v1/notes/:id/ai/ask`

```jsonc
// request body: { "question": "string ≤ 1000" }  (missing/oversized → 400 invalid_input)
// 200
{ "ok": true, "result": {
    "answer":      "string ≤ 2000",
    "confidence":  "optional string ≤ 100",
    "model":       "...", "request_id": "uuid"
} }
```

### extract-tasks — `POST /api/v1/notes/:id/ai/extract-tasks`

```jsonc
// READ-ONLY: returns candidate tasks only; creation stays an explicit user
// action via the Tasks API.
// 200
{ "ok": true, "result": {
    "tasks":       [{ "title": "string ≤ 200", "due": "optional ≤ 50", "priority": "optional ≤ 50" }, ... ≤ 20],
    "model":       "...", "request_id": "uuid"
} }
```

### extract-concepts — `POST /api/v1/notes/:id/ai/extract-concepts`

```jsonc
// 200
{ "ok": true, "result": {
    "concepts":    [{ "term": "string ≤ 100", "definition": "string ≤ 400", "references": ["string ≤ 200", ... ≤ 10] }, ... ≤ 15],
    "model":       "...", "request_id": "uuid"
} }
```

### generate-questions — `POST /api/v1/notes/:id/ai/generate-questions`

```jsonc
// 200
{ "ok": true, "result": {
    "questions":   ["string ≤ 200", ... ≤ 10],
    "model":       "...", "request_id": "uuid"
} }
```

### Page interpretation (track 3C)

Excalidraw pages are NEVER fed to the model as raw scene JSON. A worker-side
interpretation layer (`platform/src/ai/interpret.ts`, self-contained — no
`@excalidraw/excalidraw` import) reduces the scene to a bounded
`PageRepresentation` (text ≤ 8000 chars, relationships ≤ 200, serialized ≤
~12000 chars; image metadata only — never dataURLs; deleted elements
excluded; frames → sections; arrows → relationship graph; links + counts).
Text notes keep the `title\n\nbody` window. See `docs/phases/phase8-notes-excalidraw.md` §3.1.

## Specified, future phases

| Action | Path suffix | Result shape (draft) | Notes |
|---|---|---|---|
| rewrite | `/ai/rewrite` | `{ rewritten, changed: string[] }` | tone/format params (`tone`, `format`) |
| expand | `/ai/expand` | `{ expanded }` | bounded by `AI_OUTPUT_MAX_CHARS` |
| simplify | `/ai/simplify` | `{ simplified, reading_level }` | plain-language pass |
| ask_note | `/ai/ask_note` | `{ answer, sources: [{ note_id, chunk_index }] }` | requires semantic retrieval (Vectorize) — the only action blocked on `docs/ai/memory-vectorize.md`; v1 fallback: lexical search |

Every action follows the same pipeline: authenticate → authorize ownership →
bounded retrieve → `AiService.generateStructured` with a fixed system prompt
+ zod output schema → structured result. Adding an action = new schema +
prompt + route registration; no transport or storage changes.

## UI integration notes (for v2.1)

- `apiClient` (`src/api/apiClient.ts`) gains typed per-action calls; the
  auth header is the existing bearer-token path.
- Actions are POSTs (idempotent reads but keep POST semantics — they are
  RPC-style); results are display-only, cached by `request_id` if needed.
- The UI must treat `ok:false` envelopes as first-class states (413/502/503
  render differently from 404).
