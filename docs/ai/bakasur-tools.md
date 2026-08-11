# BakaSur — Controlled Tool Registry (v1 read-first)

## Principle

BakaSur (future agent loop) may only ever request tools from the **existing
Tool Registry** — the same registry REST and MCP use. There is no second
data-access surface for AI. This phase defines the v1 allowlist, the
validation rule, and the contract; it does NOT build the agent loop.

## The rule

```ts
// src/ai/bakasur.ts (implemented this phase)
BAKASUR_ALLOWED_TOOLS: Set<string>   // curated read-first allowlist
assertBakasurAllowed(name): void      // throws ToolRegistryError("tool_denied")
```

An agent loop (future) must call `assertBakasurAllowed(name)` before
`registry.call(name, input, ctx)` with the authenticated user's context.
The registry already provides everything else:

- **schema validation** — every tool zod-validates input (`registry.call`)
- **authorization** — `ctx.user.sub` scopes every repository call
- **bounded arguments** — schemas cap lengths/lists (e.g. `SearchQuery.limit ≤ 50`)
- **structured results** — tools return plain JSON objects
- **existing business-service invocation** — tools call repositories, never D1/R2 directly

## v1 allowlist (read-first) — maps to existing tools

| BakaSur tool | Registry tool | Backing service | Notes |
|---|---|---|---|
| get_tasks | `list_tasks` | TaskRepository.list | status-filterable |
| get_habits | `list_habits` | HabitRepository.list | incl. streak + log |
| get_notes | `list_notes` | NoteRepository.list | recent notes |
| get_note | `get_note` | NoteRepository.get | single note by id |
| get_journal | `get_journal` / `list_journal` | JournalRepository | by date / range |
| search_notes | `search_notes` | NoteRepository.search | lexical (LIKE) v1; Vectorize later |
| get_file_metadata | `file_list` / `file_get` | FileRepository | names/types/sizes; no binary bodies |

**Denied in v1** (exist but excluded until validation): `create_task`,
`update_task`, `delete_task`, `create_habit`, `log_habit`, `create_note`,
`update_note`, `delete_note`, `journal_today`, `file_upload`, `file_delete`,
`reset_account`, `remember`. Rationale: read-first until the tool-call
validation path (schema + ownership + rate bounds) is proven end-to-end in a
real agent loop.

## Contract for a future tool call

```jsonc
// What the (future) agent loop sends — after assertBakasurAllowed
{
  "tool": "search_notes",
  "input": { "query": "meeting notes", "limit": 10 }   // zod-validated
}
```

Every tool keeps: explicit name, description, zod schema, authenticated
user (from ctx, never from the model), authorization (user-scoped repos),
bounded args, structured result, test coverage (existing suite covers the
registry path; the allowlist gets its own unit test this phase).

## Mutation tools (designed, not enabled)

Same contract, enabled only after: (1) argument schema hardening, (2)
ownership checks (already present), (3) rate limits, (4) a confirmation
gate for destructive tools (`reset_account` already requires `confirm`).
Tracked in the phase-7 doc as the gate for the BakaSur agent loop.
