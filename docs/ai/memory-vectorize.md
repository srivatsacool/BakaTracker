# Memory / Vectorize — future design (no production mutation)

Design only. No Vectorize index is created or mutated this phase. The D1
`notes.vector` column exists but is unused until this lands.

## Pipeline

```
Note (D1, user-scoped)
  → chunk (deterministic splitter, ~500-800 tokens)
  → Workers AI embedding  (@cf/baai/bge-base-en-v1.5, 768-d)
  → Vectorize index
  → user-scoped metadata
  → semantic retrieval (top-k)
  → BakaSur context
```

## Definitions (contract)

### Namespace strategy

- One Vectorize index per environment: `bakasur-prod`, `bakasur-dev`,
  `bakasur-test` (binding via wrangler config). No per-user indexes — index
  count is not a scaling unit; **user isolation lives in metadata + query
  filters**, never in index topology.

### User isolation

- Every vector carries metadata `user_id` (Google `sub`) + `entity`
  (`note` | `task` | `journal` | `file`).
- Every query is `vectorize.query(..., { filter: { user_id: "<sub>" } })` —
  the sub comes from the authenticated `ToolContext.user.sub`, never from
  the model or request body.
- Cross-user leakage is structurally impossible: a vector without a matching
  `user_id` filter can never be returned to another user.

### Note/document IDs + chunk IDs

- `doc_id = "note:{note_id}"` (entity-prefixed, collision-free across types).
- `chunk_id = "note:{note_id}:chunk:{index}"` — deterministic from
  (note id, chunk index) so re-indexing is **idempotent**: same note, same
  chunk order → same chunk ids → upsert replaces, no duplicates.
- `chunk_index` metadata = position within the note (retrieval can show
  context windows).

### Embedding lifecycle

- **Create/update note** → re-embed in the sync/upsert path (or a
  post-write hook in the notes repository layer — decided when the agent
  loop lands; this phase only defines the contract).
- **Delete note** → delete all vectors `WHERE doc_id = "note:{id}"`
  (Vectorize `deleteByIds`).
- **Chunking** must be stable across edits (prefix-stable splitter) so an
  edit re-embeds only the affected chunks; worst case (non-stable chunk
  boundaries) is delete-all + re-embed — correctness first, optimization
  later.

### Re-indexing / stale embeddings

- Idempotent upsert by `chunk_id` (see above).
- A `notes.updated_at` change invalidates the note's vectors: delete-by-
  doc-id then re-embed, or upsert-by-chunk-id for stable chunkers.
- **Stale embeddings** (note edited but not yet re-embedded): acceptable
  within the sync window; the notes upsert path is the single choke point,
  so staleness is bounded by sync cadence. A reconciliation pass
  (scan D1 notes with `updated_at > last_embedded_at`) is the documented
  repair tool.

### Deletion guarantees

- Note delete → vector delete is **best-effort with a repair path**, NOT
  eventually-consistent-by-accident: the notes repository delete hook
  issues the Vectorize delete; the reconciliation pass catches any misses
  (same `last_embedded_at` ledger).
- Account reset (`reset_account`) → delete by `user_id` filter batch (the
  existing per-user scoped reset pattern extends to vectors).
- Retention: vectors are derived data — no vector is ever the only copy of
  anything. Losing an index loses search quality, not user data.

## Retrieval contract (future)

```ts
// service-level, user-scoped, never model-supplied filters
semanticSearch(user: { sub }, query: string, entity?: string, topK = 8)
  → [{ chunk_id, doc_id, note_id, text, score, chunk_index }]
```

## Explicit non-goals (this phase)

- No `vectorize` binding in any wrangler config.
- No migration touching `notes.vector`.
- No embedding call in the notes write path (summarize slice is inference-only).
