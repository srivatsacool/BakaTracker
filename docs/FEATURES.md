# 🎨 Features and Mechanics Breakdown

This document provides a technical breakdown of BakaTracker's modules, calculations, and interface systems.

---

## 1. Habits Engine

The Habits module manages daily tracking. It calculates consistency streaks and tracks five habit formats:
* **Checkbox:** Logs a boolean `1` or `0`.
* **Counter:** Logs an integer (e.g. counts cups of water).
* **Mood:** Logs a face index string (`😞`, `😐`, `🙂`).
* **Energy:** Logs energy level strings (`Low`, `Medium`, `High`).
* **Number:** Logs floating-point numbers (e.g. sleep duration, screen time).

### Daily Score Formula
Every day, BakaTracker computes a weighted consistency score between `0` and `100`:
$$\text{Daily Score} = (\text{Habit Completion Rate} \times 50) + (\text{Today Tasks Completion Rate} \times 40) + (\text{Journal Entry Logged} \times 10)$$
* **Habit Rate:** The percentage of checked habits configured for that day.
* **Task Rate:** The percentage of Today tasks moved to "Done".
* **Journal Log:** Grants a flat 10 points if a Highlight of the Day is saved.

---

## 2. Tasks Kanban Boards

BakaTracker divides task management into two distinct workspaces:

```
[ Master Board ] ────── Marking task as "Today" ─────> [ Today Board ]
(Backlog, Todo, Doing, Done)                          (Today, Doing, Done)
- Planning space                                      - Focus execution space
- Unlimited backlog tasks                             - Filtered database view
- No XP awarded here                                  - XP awarded on completion
```

### Drag-and-Drop Lifecycle
* Tasks are stored in a flat list database array. Changing a task's column status (e.g. moving a task card from `Todo` to `Doing` or `Done`) overwrites its `status` string field (`backlog`, `todo`, `doing`, `done`) and updates its `completed_at` timestamp.
* Completing a task via the Today board triggers floating XP animations and adds the corresponding XP reward directly to your character stats.

---

## 3. Reflections Journal

The journaling system prioritizes consistency over length.
* **Highlight Constraint:** Tapping "Save" requires at least a one-sentence text entry in the highlight field, which acts as the title header in your timeline view.
* **Metadata Association:** Saves the active quote ID, daily mood rating, and energy level index directly in the journal record.
* **Timeline Search:** Features a local filter bar allowing you to search journal entries, secondary notes, and filter lists by mood ratings.

---

## 4. RPG Gamification Engine

BakaTracker models personal development as character stat progression.

### Core Attributes
1. **⚔️ Discipline:** Built by consistency habits (e.g. taking medicine, brushing teeth).
2. **💪 Health:** Built by fitness and nutrition logs (e.g. gym, sleep, water).
3. **🧠 Knowledge:** Built by learning tasks and reading counters.
4. **🎨 Creativity:** Built by design, drawing, and creative writing quests.
5. **💼 Career:** Built by professional tasks and portfolio building.

### XP and Level Formulas
* **XP Incrementing:** Checkbox habits grant flat XP (e.g., +10 XP). Counter habits scale by value (e.g., `value * habit.xp`). Task cards reward variable XP mapped in details.
* **Level Progression:** Each level requires exactly `100 XP`. Total levels are calculated as:
  $$\text{Level} = \lfloor \frac{\text{Total XP}}{100} \rfloor + 1$$
* **Progression Ledger:** Every XP gain is logged as an transaction entry inside the `Events` database sheet, enabling audits and level syncs.

---

## 5. Journey Analytics & Heatmaps

The **Journey** dashboard compiles historical entries using client-side calculations:
* **Github-Style Heatmap:** Plots daily scores on a grid calendar. A daily score of `100` displays a dark accent green cell, while `0` shows a light neutral gray.
* **Recharts Integrations:** Renders SVG graphs showing sleep duration, average screen time, habit completions, and mood curves.
* **Static Rule Insights:** Analyzes the past 30 days of data and surfaces logical correlations (e.g. *Your energy is 20% higher on days with a Gym check-in*).

---

## 6. Visual Notes (v2.1B)

* **Excalidraw Canvas** — each page hosts an Excalidraw workspace (`@excalidraw/excalidraw` v0.18, MIT, lazy-loaded in a separate chunk). Drawing tools (rectangle, ellipse, arrow, text, etc.) and pointer events work directly on the interactive canvas.
* **Debounced Autosave** — 1500ms idle debounce; the serialized scene is saved via `PUT /pages/:id/scene` with optimistic concurrency (`expected_revision`). A 409 conflict shows a non-destructive "Load latest" / "Keep my version" banner. A 413 shows a size warning.
* **Scene Hydration** — `hydrateScene()` dynamically imports Excalidraw's `restore()` to deserialize stored scenes on page load. The editor bundle stays code-split.
* **dataURL Ban** — the v2.1A contract bans dataURLs in D1 scenes (2 MiB cap). Images pasted into the canvas produce a clear "images aren't supported yet" notice rather than silently stripping content.
* **Notebooks** — organizational containers for pages. CRUD via REST (`POST /notebooks`, `DELETE /notebooks/:id`). Pages are listed per notebook (`GET /notebooks/:id/pages`).
* **Page Lifecycle** — create (text or excalidraw), rename (inline), archive/restore, duplicate. Archived pages appear under a toggle; archived pages remain in state with `archived_at` set.
* **Conflict Recovery** — when a save returns 409, the user can "Load latest" (fetches server revision) or "Keep my version" (resends with the server's newer revision to win the conflict).

---

## 7. PWA Offline & Google Sheets Sync

* **Local-First Writes:** User input triggers state updates in Zustand and writes directly to browser `localStorage`.
* **Sync Engine Queue:** If internet connectivity is detected, the `sheetsService` sends a background POST payload to Google Apps Script. If offline, the sync status displays a warning icon and queues requests.
* **Conflict Validation:** Future releases will enforce conflict warnings if local and remote edit timestamps diverge, preventing older device sessions from overwriting newer sheet additions.

---

## 8. FastMCP Server Bridge

The backend serves as a Model Context Protocol endpoint, exposing BakaTracker's tools directly to LLM clients:
* **Tool Bindings:** FastMCP maps the 22 tools (such as `log_habit`, `create_task`) directly to Python Sheets functions.
* **Resource URIs:** Resolves resources like `bakatracker://character` or `bakatracker://weekly` as formatted Markdown summaries, allowing LLMs to read your status before answering prompts.
