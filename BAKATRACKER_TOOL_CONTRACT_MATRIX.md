# BakaTracker — Canonical Tool Contract Matrix

## Overview
This document specifies the canonical tool contract for all 40 platform tools across the BakaTracker unified architecture. It defines the formal input schemas, return shapes, safety classifications, runtime routing, execution environments (BakaSur, WebMCP, Remote MCP), authentication requirements, and idempotency guarantees.

---

## Safety Tier Taxonomy

| Safety Tier | Category | Confirmation Behavior | Description |
|:---|:---|:---|:---|
| **Tier 1** | `tier1_safe` | Automatic (No HITL) | Read-only queries, status introspection, and analytics without state mutation. |
| **Tier 2** | `tier2_mutation` | Immediate Execution | Standard state mutations (create, update, toggle, log). |
| **Tier 3** | `tier3_destructive` | **HITL Required** (Queue + 60s Timeout) | Destructive operations (delete, purge, reset). In browser runtimes (BakaSur, WebMCP), enqueues a user confirmation modal. In Remote MCP, requires explicit `confirm: 'DELETE'` argument. |

---

## Execution Route Taxonomy

| Execution Route | Primary Runtime | Storage Engine | Synchronization Impact |
|:---|:---|:---|:---|
| `local_store` | Client Browser | LocalStorage / Zustand Store | Generates sync events queued in `bt_sync_pending` and pushed to Cloudflare D1. |
| `server_api` | Cloudflare Worker | Cloudflare D1 / R2 / KV | Direct authenticated REST API invocation (`/api/*`). |
| `hybrid` | Client + Server | Zustand + D1/R2/KV | Coordinated execution involving both local state and server-side storage. |

---

## Canonical 40-Tool Matrix

### 1. Task Operations (`local_store`)

#### 1. `list_tasks`
- **Category:** Tasks
- **Safety Tier:** `tier1_safe`
- **Route:** `local_store`
- **WebMCP / BakaSur / Remote MCP:** Supported (Browser Local Zustand / Remote D1 sync)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "status": { "type": "string", "enum": ["todo", "in_progress", "done"], "description": "Optional status filter" },
      "limit": { "type": "number", "description": "Max number of tasks to return (default: 200)" }
    }
  }
  ```
- **Return Contract:** `Task[]`
- **Idempotency:** Yes (Read-only)
- **Test Coverage:** `src/__tests__/tools/registry.test.ts`, `src/__tests__/tools/contract.test.ts`

#### 2. `get_task`
- **Category:** Tasks
- **Safety Tier:** `tier1_safe`
- **Route:** `local_store`
- **WebMCP / BakaSur / Remote MCP:** Supported
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Task ID" }
    },
    "required": ["id"]
  }
  ```
- **Return Contract:** `Task | { error: string }`
- **Idempotency:** Yes (Read-only)
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`

#### 3. `create_task`
- **Category:** Tasks
- **Safety Tier:** `tier2_mutation`
- **Route:** `local_store`
- **WebMCP / BakaSur / Remote MCP:** Supported
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string", "description": "Task title" },
      "notes": { "type": "string", "description": "Optional notes/description" },
      "priority": { "type": "string", "enum": ["low", "medium", "high", "urgent"], "description": "Priority level" },
      "area": { "type": "string", "enum": ["work", "personal", "health", "learning", "finance"], "description": "Life area" },
      "xp": { "type": "number", "description": "XP reward (default: 10)" },
      "today": { "type": "boolean", "description": "Mark for today" },
      "due_date": { "type": "string", "description": "Due date (YYYY-MM-DD)" },
      "dueDate": { "type": "string", "description": "Alias for due_date" }
    },
    "required": ["title"]
  }
  ```
- **Return Contract:** `{ success: true, id: string, title: string, task: Task }`
- **Idempotency:** No (Creates new task record on each call)
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`, `src/__tests__/tools/dispatcher.test.ts`

#### 4. `update_task`
- **Category:** Tasks
- **Safety Tier:** `tier2_mutation`
- **Route:** `local_store`
- **WebMCP / BakaSur / Remote MCP:** Supported
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Task ID to update" },
      "title": { "type": "string", "description": "New title" },
      "notes": { "type": "string", "description": "New notes" },
      "status": { "type": "string", "enum": ["todo", "in_progress", "done"], "description": "New status" },
      "area": { "type": "string", "enum": ["work", "personal", "health", "learning", "finance"], "description": "Life area" },
      "priority": { "type": "string", "enum": ["low", "medium", "high", "urgent"], "description": "Priority level" },
      "xp": { "type": "number", "description": "XP reward" },
      "today": { "type": "boolean", "description": "Mark for today" },
      "due_date": { "type": "string", "description": "Due date (YYYY-MM-DD)" },
      "dueDate": { "type": "string", "description": "Alias for due_date" },
      "due": { "type": "string", "description": "Alias for due_date" }
    },
    "required": ["id"]
  }
  ```
- **Return Contract:** `{ success: true, id: string, task: Task } | { success: false, error: string }`
- **Idempotency:** Yes (Applying identical updates yields identical state)
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`

#### 5. `toggle_task`
- **Category:** Tasks
- **Safety Tier:** `tier2_mutation`
- **Route:** `local_store`
- **WebMCP / BakaSur / Remote MCP:** Supported
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Task ID to toggle completion" }
    },
    "required": ["id"]
  }
  ```
- **Return Contract:** `{ success: true, id: string, status: 'todo' | 'done' } | { error: string }`
- **Idempotency:** No (Inverts status)
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`

#### 6. `delete_task`
- **Category:** Tasks
- **Safety Tier:** `tier3_destructive` (Requires Confirmation)
- **Route:** `local_store`
- **WebMCP / BakaSur / Remote MCP:** Supported (HITL modal in browser, `confirm: 'DELETE'` in Remote MCP)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Task ID to delete" },
      "confirm": { "type": "string", "description": "Explicit confirmation token" }
    },
    "required": ["id"]
  }
  ```
- **Return Contract:** `{ success: true, id: string } | { success: false, error: string }`
- **Idempotency:** Yes (Subsequent deletes return `{ success: false, error: 'Task not found' }`)
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`, `src/__tests__/tools/confirmation.test.ts`

---

### 2. Habit Operations (`local_store`)

#### 7. `list_habits`
- **Category:** Habits
- **Safety Tier:** `tier1_safe`
- **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": {} }`
- **Return Contract:** `Habit[]`
- **Test Coverage:** `src/__tests__/tools/registry.test.ts`

#### 8. `get_habit`
- **Category:** Habits
- **Safety Tier:** `tier1_safe`
- **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Return Contract:** `Habit | { error: string }`
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`

#### 9. `create_habit`
- **Category:** Habits
- **Safety Tier:** `tier2_mutation`
- **Route:** `local_store`
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string", "description": "Habit name" },
      "category": { "type": "string", "description": "Category (discipline, health, knowledge, creativity, career)" },
      "frequency": { "type": "string", "enum": ["daily", "weekly", "monthly"] },
      "target_days": { "type": "number", "description": "Target times per period" }
    },
    "required": ["title"]
  }
  ```
- **Return Contract:** `{ success: true, id: string, title: string, habit: Habit }`
- **Idempotency:** No
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`

#### 10. `update_habit`
- **Category:** Habits
- **Safety Tier:** `tier2_mutation`
- **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "category": { "type": "string" }, "frequency": { "type": "string" }, "target_days": { "type": "number" } }, "required": ["id"] }`
- **Return Contract:** `{ success: true, id: string } | { success: false, error: string }`
- **Idempotency:** Yes
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`

#### 11. `log_habit`
- **Category:** Habits
- **Safety Tier:** `tier2_mutation`
- **Route:** `local_store`
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "The habit ID" },
      "date": { "type": "string", "description": "Date in YYYY-MM-DD format (defaults to current date)" }
    },
    "required": ["id"]
  }
  ```
- **Return Contract:** `{ success: true, id: string, date: string, alreadyCompleted?: boolean } | { success: false, error: string }`
- **Idempotency:** **Yes** (Strictly idempotent: if already logged for date, returns `alreadyCompleted: true` without untoggling)
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`

#### 12. `delete_habit`
- **Category:** Habits
- **Safety Tier:** `tier3_destructive` (HITL Required)
- **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" }, "confirm": { "type": "string" } }, "required": ["id"] }`
- **Return Contract:** `{ success: true, id: string } | { success: false, error: string }`
- **Test Coverage:** `src/__tests__/tools/contract.test.ts`

---

### 3. Journal Operations (`local_store`)

#### 13. `list_journal`
- **Safety Tier:** `tier1_safe` | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "limit": { "type": "number" } } }`
- **Return Contract:** `JournalEntry[]`

#### 14. `get_journal_entry`
- **Safety Tier:** `tier1_safe` | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Return Contract:** `JournalEntry | { error: string }`

#### 15. `create_journal_entry`
- **Safety Tier:** `tier2_mutation` | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "title": { "type": "string" }, "content": { "type": "string" }, "tags": { "type": "array" } }, "required": ["title", "content"] }`
- **Return Contract:** `{ success: true, id: string, entry: JournalEntry }`

#### 16. `update_journal_entry`
- **Safety Tier:** `tier2_mutation` | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "content": { "type": "string" }, "tags": { "type": "array" } }, "required": ["id"] }`
- **Return Contract:** `{ success: true, id: string } | { success: false, error: string }`

#### 17. `delete_journal_entry`
- **Safety Tier:** `tier3_destructive` (HITL Required) | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" }, "confirm": { "type": "string" } }, "required": ["id"] }`
- **Return Contract:** `{ success: true, id: string } | { success: false, error: string }`

---

### 4. Analytics & Level Operations (`local_store`)

#### 18. `get_day_summary`
- **Safety Tier:** `tier1_safe` | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": { "date": { "type": "string" } } }`
- **Return Contract:** `{ date: string, tasksDone: number, totalTasks: number, habitsCompleted: number, totalHabits: number, xpGained: number }`

#### 19. `get_level_info`
- **Safety Tier:** `tier1_safe` | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": {} }`
- **Return Contract:** `{ level: number, currentXp: number, nextLevelXp: number, progressPercent: number, stats: Record<string, number> }`

---

### 5. Notebook Operations (`server_api`)

#### 20. `list_notebooks`
- **Safety Tier:** `tier1_safe` | **Route:** `server_api` (`GET /api/notebooks`)
- **Return Contract:** `Notebook[]`

#### 21. `get_notebook`
- **Safety Tier:** `tier1_safe` | **Route:** `server_api` (`GET /api/notebooks/:id`)
- **Return Contract:** `Notebook`

#### 22. `create_notebook`
- **Safety Tier:** `tier2_mutation` | **Route:** `server_api` (`POST /api/notebooks`)
- **Input Schema:** `{ "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" } }, "required": ["name"] }`
- **Return Contract:** `Notebook`

#### 23. `update_notebook`
- **Safety Tier:** `tier2_mutation` | **Route:** `server_api` (`PUT /api/notebooks/:id`)
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "description": { "type": "string" } }, "required": ["id"] }`
- **Return Contract:** `Notebook`

#### 24. `delete_notebook`
- **Safety Tier:** `tier3_destructive` (HITL Required) | **Route:** `server_api` (`DELETE /api/notebooks/:id`)
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" }, "confirm": { "type": "string" } }, "required": ["id"] }`
- **Return Contract:** `{ success: true, id: string }`

---

### 6. Page Operations (`server_api`)

#### 25. `list_pages`
- **Safety Tier:** `tier1_safe` | **Route:** `server_api` (`GET /api/pages`)
- **Input Schema:** `{ "type": "object", "properties": { "notebook_id": { "type": "string" } } }`
- **Return Contract:** `Page[]`

#### 26. `get_page`
- **Safety Tier:** `tier1_safe` | **Route:** `server_api` (`GET /api/pages/:id`)
- **Return Contract:** `Page`

#### 27. `create_page`
- **Safety Tier:** `tier2_mutation` | **Route:** `server_api` (`POST /api/pages`)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "notebook_id": { "type": "string", "description": "Notebook ID" },
      "title": { "type": "string", "description": "Page title" },
      "kind": { "type": "string", "enum": ["text", "excalidraw", "markdown", "visual"], "description": "Page kind (markdown normalizes to text, visual normalizes to excalidraw)" }
    },
    "required": ["notebook_id", "title"]
  }
  ```
- **Return Contract:** `Page`
- **Client/Server Normalization:** Dispatcher automatically maps `markdown` $\to$ `text` and `visual` $\to$ `excalidraw` before invoking server endpoint.

#### 28. `update_page`
- **Safety Tier:** `tier2_mutation` | **Route:** `server_api` (`PUT /api/pages/:id`)
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "content": { "type": "string" } }, "required": ["id"] }`
- **Return Contract:** `Page`

#### 29. `delete_page`
- **Safety Tier:** `tier3_destructive` (HITL Required) | **Route:** `server_api` (`DELETE /api/pages/:id`)
- **Input Schema:** `{ "type": "object", "properties": { "id": { "type": "string" }, "confirm": { "type": "string" } }, "required": ["id"] }`
- **Return Contract:** `{ success: true, id: string }`

---

### 7. File Operations (`server_api` / Cloudflare R2)

#### 30. `file_upload`
- **Safety Tier:** `tier2_mutation` | **Route:** `server_api` (`POST /api/files`)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "filename": { "type": "string", "description": "File name" },
      "data_base64": { "type": "string", "description": "Base64-encoded file content" },
      "data": { "type": "string", "description": "Alias for data_base64" },
      "content_type": { "type": "string", "description": "MIME type" }
    },
    "required": ["filename", "data_base64"]
  }
  ```
- **Return Contract:** `{ id: string, filename: string, size: number, content_type: string, url: string }`
- **Client/Server Normalization:** Dispatcher maps `data` $\to$ `data_base64` and defaults `content_type: 'application/octet-stream'`.

#### 31. `file_get`
- **Safety Tier:** `tier1_safe` | **Route:** `server_api` (`GET /api/files/:id`)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "File ID" },
      "key": { "type": "string", "description": "Alias for file ID" }
    },
    "required": ["id"]
  }
  ```
- **Return Contract:** `{ id: string, filename: string, size: number, content_type: string, data_base64: string }`

#### 32. `file_delete`
- **Safety Tier:** `tier3_destructive` (HITL Required) | **Route:** `server_api` (`DELETE /api/files/:id`)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "File ID" },
      "key": { "type": "string", "description": "Alias for file ID" },
      "confirm": { "type": "string", "description": "Confirmation token" }
    },
    "required": ["id"]
  }
  ```
- **Return Contract:** `{ success: true, id: string }`

#### 33. `file_list`
- **Safety Tier:** `tier1_safe` | **Route:** `server_api` (`GET /api/files`)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "limit": { "type": "number", "description": "Max files to return (default: 50)" }
    }
  }
  ```
- **Return Contract:** `FileInfo[]`

---

### 8. Memory Operations (`server_api` / Cloudflare KV)

#### 34. `remember`
- **Safety Tier:** `tier2_mutation` | **Route:** `server_api` (`POST /api/memory`)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "key": { "type": "string", "description": "Memory key" },
      "value": { "type": "string", "description": "Information to remember" }
    },
    "required": ["key", "value"]
  }
  ```
- **Return Contract:** `{ success: true, key: string }`

#### 35. `recall`
- **Safety Tier:** `tier1_safe` | **Route:** `server_api` (`GET /api/memory/:key`)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "key": { "type": "string", "description": "Memory key to retrieve" }
    },
    "required": ["key"]
  }
  ```
- **Return Contract:** `{ key: string, value: string | null }`

#### 36. `forget`
- **Safety Tier:** `tier3_destructive` (HITL Required) | **Route:** `server_api` (`DELETE /api/memory/:key`)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "key": { "type": "string", "description": "Memory key to delete" },
      "confirm": { "type": "string" }
    },
    "required": ["key"]
  }
  ```
- **Return Contract:** `{ success: true, key: string }`

---

### 9. System & Diagnostic Operations

#### 37. `context_dump`
- **Safety Tier:** `tier1_safe` | **Route:** `hybrid`
- **Input Schema:** `{ "type": "object", "properties": {} }`
- **Return Contract:** `{ tasks: Task[], habits: Habit[], journal: JournalEntry[], stats: any, timestamp: string }`

#### 38. `weekly_review`
- **Safety Tier:** `tier1_safe` | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": {} }`
- **Return Contract:** `{ weekStart: string, weekEnd: string, completedTasks: number, habitsLogged: number, journalEntries: number, xpEarned: number }`

#### 39. `sync_status`
- **Safety Tier:** `tier1_safe` | **Route:** `local_store`
- **Input Schema:** `{ "type": "object", "properties": {} }`
- **Return Contract:** `{ isOnline: boolean, pendingSyncCount: number, lastSyncTime: string | null }`

#### 40. `reset_account`
- **Safety Tier:** `tier3_destructive` (HITL Required)
- **Route:** `hybrid` (Sync Barrier + Server Wipe + Store Purge + LocalStorage Clear)
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "confirm": { "type": "string", "enum": ["DELETE"], "description": "Must be exactly 'DELETE' to confirm" }
    },
    "required": ["confirm"]
  }
  ```
- **Return Contract:** `{ success: true, message: string } | { success: false, error: string }`
- **Sync Barrier Sequence:**
  1. `setSyncBlocked(true)`: Immediately halts active background sync cycles and cancels debounced timer.
  2. Server Wipe: Authenticated call `POST /api/account/reset` wiping D1 tables and KV buckets.
  3. Store Wipe: `resetStore()` purges Zustand tasks, habits, journals, and local event logs.
  4. Storage Clear: Iterates and deletes `bt_*` keys in `localStorage` including `bt_sync_pending`.
  5. `setSyncBlocked(false)`: Re-enables clean sync engine.
