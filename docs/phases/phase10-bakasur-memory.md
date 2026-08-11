# Phase 10 — v2.2 · BakaSur Memory (Vectorize) — DESIGN ONLY

Status: **PLANNED** — design reference. **No implementation in v2.1. No Vectorize provisioning until v2.2.**

---

## 1. Goal

Give BakaSur semantic recall over the user's Excalidraw pages: *"which page had the diagram about the lease renewal?"* — without hand-written tags. Answers stay user-scoped, bounded, and privacy-safe.

## 2. Architecture

```
Pages (notes.kind='excalidraw' | 'text')
  → chunking (worker-side, deterministic)
  → Workers AI embeddings (AI_EMBED_MODEL, e.g. bge-base-en-v1.5 @ 768-d)
  → Vectorize index (user-scoped metadata: user_id, page_id, chunk index, page version)
  → bounded retrieval (top-k, user_id filter MANDATORY)
  → PageRepresentation enrichment → BakaSur (existing AiService path)
```

### 2.1 Chunking
- Text projection (Phase 8 §3.1) split into overlapping chunks (~500 tokens / 2,000 chars, 10% overlap).
- Structure-aware: prefer frame boundaries (each frame = a section) before falling back to token windows; text elements grouped by container/frame first.
- Images contribute **metadata text only** (mime, size, alt if any) — pixels are never embedded.
- Chunk identity: `user_id:page_id:chunk_idx`; page-level vector optionally stored at chunk 0 metadata for whole-page queries.

### 2.2 Embedding lifecycle
| Event | Action |
|---|---|
| Page created | embed chunks on first save (or lazily on first query — cost control) |
| Page updated | **incremental reindex of the changed page only**: new embeddings for chunks, old chunk vectors replaced by `(user_id, page_id)` delete + insert (Vectorize supports delete-by-id / query-delete) |
| Page archived/deleted | delete all `(user_id, page_id)` vectors; purge on trash-expiry |
| Stale embeddings | every vector carries `page_version` (notes.updated_at); retrieval filters `page_version`; mismatch → reindex-on-read (flag), never returns stale silently |
| Reindex | on-demand `POST /ai/reindex` (user-scoped) + automatic after restore |
| Account reset | `reset-account` tool extended to purge the user's vectors (privacy obligation) |

### 2.3 Metadata & user isolation
- Vector metadata: `{ user_id, page_id, chunk_idx, page_version, kind }`. **Every query filters `user_id = caller` server-side — non-negotiable** (Vectorize metadata filtering).
- No cross-user context; no shared index entities; index is namespaced by user_id only (single index, filtered) — simplest option at this scale.

### 2.4 Retrieval limits & privacy
- top-k ≤ 8, context window ≤ ~12,000 chars (below `AI_INPUT_MAX_CHARS`), per-user per-minute query cap (rate limiter from Phase 7 hardening).
- Never embedded/sent: image dataURLs, file binaries, raw scene internals, emails, ids.
- Prompt: retrieved chunks are DATA; fixed system prompts; injection treated as data (same posture as Phase 7/8).

## 3. Open decisions (deferred to v2.2 kickoff)
- Single shared Vectorize index vs per-user index (cost/limits).
- Embedding model final pick + dimension (bge-base 768-d default via `AI_EMBED_MODEL`; contract already in `AiService.generateEmbedding`).
- Chunk-at-save vs chunk-on-demand (cron sweep vs lazy) — cost vs freshness.
- Whether `notes.vector` (single-page embedding, reserved in 0001) is used for page-level search alongside chunk vectors.
- D1 FTS5 vs Vectorize for keyword search — Vectorize covers semantic; LIKE remains the zero-cost fallback.

## 4. Out of scope (v2.2)
- Memory across the whole app (tasks/habits/journal) — pages first, per roadmap.
- Reranking, hybrid search, citations UI.
- Cross-user or shared memories.
