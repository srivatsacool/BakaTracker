# Notes AI Action Contract (v2.1 notepad backend)

The final v2.1 Notes UI will call these backend actions. **Only `summarize`
is implemented this phase**; the other eight are specified so the notepad
can be built without a backend redesign. Actions are user-scoped REST
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

## Specified, future phases

| Action | Path suffix | Result shape (draft) | Notes |
|---|---|---|---|
| explain | `/ai/explain` | `{ explanation, sections[] }` | ELI5-level breakdown, cite note sections |
| rewrite | `/ai/rewrite` | `{ rewritten, changed: string[] }` | tone/format params (`tone`, `format`) |
| expand | `/ai/expand` | `{ expanded }` | bounded by `AI_OUTPUT_MAX_CHARS` |
| simplify | `/ai/simplify` | `{ simplified, reading_level }` | plain-language pass |
| extract_tasks | `/ai/extract_tasks` | `{ tasks: [{ title, due?, priority? }] }` | **read-only**: returns candidates; creation stays explicit user action via `create_task` |
| extract_concepts | `/ai/extract_concepts` | `{ concepts: [{ term, definition, references[] }] }` | feeds future memory graph |
| generate_questions | `/ai/generate_questions` | `{ questions: ["string ≤ 200", ...] }` | spaced-repetition fodder |
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
