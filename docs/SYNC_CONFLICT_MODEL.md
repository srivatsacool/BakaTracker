# Sync Conflict Model — BakaTracker

> **Status:** Documented. No new conflict-resolution mechanism was implemented.
> **Decision:** The current model is acceptable for BakaTracker's single-user
> productivity use case. Multi-device conflict resolution is deferred.

## Overview

Server-authoritative synchronization with entity-level full-state upserts.
Conflicts are detected and logged, but conflicting writes are not currently
rejected. The effective result is that the accepted full-state sync can
overwrite the server entity. Initialization reconciles local state against
remote state according to the existing merge behavior.

## Architecture

```
Frontend (Zustand + localStorage)
  ↓
pushSync() → debounce(500ms) → retry queue (P3.4b)
  ↓
POST /api/v1/sync/push { ops: [per-entity operations] }
  ↓
Worker conflict check (rev comparison)
  ↓
D1 mirror tables (upsert / delete)
  ↓
Response { accepted, conflicts, server_time }
  ↓
Frontend clears tombstone queues on success
```

## Key Characteristics

### Entity-Level Records
Each sync op operates on a single entity (task, habit, note, journal).
The frontend sends individual entity operations, not batch snapshots.
A full-state push produces N ops — one per entity in the store.

### Revision Tracking (`rev`)
Each op carries a `rev` string (ISO timestamp from the client, typically
the entity's `updated_at` field). The server compares this against the
latest `rev` in `sync_queue` for that (user, entity, entity_id) tuple.

### Conflict Detection
```
SELECT rev FROM sync_queue
WHERE user_id=? AND entity=? AND entity_id=?
ORDER BY created_at DESC LIMIT 1

IF existing AND existing.rev !== rev → conflict++
```
Conflicts are logged (incremented in the response) but do **not** prevent
the write. The op is recorded in `sync_queue` and applied to the mirror
tables regardless.

### Upsert Behavior
Mirror tables use `INSERT ... ON CONFLICT DO UPDATE SET ...` — the entire
entity record is overwritten on conflict. There is no field-level merge.

### Tombstone Behavior
Deletes are represented as `{ op: 'delete', entity_id: '...' }` ops.
Tombstone queues (`deletedTaskIds`, `deletedHabitIds`) are persisted to
localStorage and cleared after a successful sync.

### Durable Retry (P3.4b)
Failed syncs set `syncPending=true` (persisted to localStorage).
Exponential backoff retry (1s→30s cap, 10 attempts max).
Network reconnect triggers immediate retry.

### Initialization Reconciliation
On init, the frontend loads from localStorage first, then pulls remote
state from the Worker. If remote data exists, it replaces local state
for the corresponding entities.

## Known Limitations

These are **known and documented**, not bugs to silently hide.

### A. Same-Entity Concurrent Edits
**Behavior:** The whole entity may be overwritten by whichever sync
arrives last.

**Impact:** If Device A edits task X and Device B edits task X while
offline, the first to sync wins. The second's edit is silently lost
on the next full-state push from the first device.

**Mitigation:** Uncommon for single-user personal productivity tools.

### B. Offline Edit vs Server Edit
**Behavior:** Initialization can replace stale local state with remote
state.

**Impact:** If Device A edits task X offline, Device B syncs a different
version of X, then Device A reconnects and inits — Device A's local
edit is overwritten by B's server version.

**Mitigation:** The user sees the server version and can re-apply their
edit if needed.

### C. Delete vs Stale Offline Update
**Behavior:** A stale full-state push can recreate a previously deleted
entity.

**Impact:** If Device A deletes task X and Device B (which has X in its
local state) syncs full state — X is re-created via upsert.

**Mitigation:** The tombstone mechanism helps, but the full-state push
from B bypasses it by including X as an active entity.

### D. No Field-Level Merge
**Behavior:** Independent fields on the same entity are not merged.

**Impact:** If Device A changes a task's title and Device B changes the
same task's due date, the last sync wins the entire entity — one
device's field change is lost.

**Mitigation:** Would require CRDTs or field-level versioning. Deferred.

### E. No Client/Device Identity
**Behavior:** Writes cannot currently be attributed to a device.

**Impact:** Conflict logs cannot show which device produced each version.
The `client_id` field exists in the schema but is not used.

**Mitigation:** Would require client UUID generation and storage. Deferred.

## What Was NOT Changed

- pushSync semantics (unchanged)
- Worker conflict logic (unchanged)
- Database schema (unchanged)
- Entity merge logic (unchanged)
- Retry architecture (unchanged)

## Future Work (Deferred)

Proper multi-device conflict resolution is deferred. Potential approaches:

- **Client/device identity:** Generate UUID per device, store in localStorage.
- **Server revision numbers:** Use integer versions instead of ISO timestamps.
- **Optimistic concurrency:** Reject writes if server version ≠ expected version.
- **Entity-level three-way merge:** Detect conflicts and merge non-overlapping fields.
- **Operation-based sync:** Send diffs instead of full entities.

None of these are needed for BakaTracker's current single-user use case.
