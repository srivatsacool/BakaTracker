# 🗄️ Database Schema Manual

This document details BakaTracker's relational schema structure stored inside Google Sheets.

---

## 🏛️ Sheets Reference Diagram

```
   [ Habits ] ◄───────── FK (habit_id) ───────── [ HabitLogs ]
  (id, name, stat...)                          (date, value, xp...)

   [ Quotes ] ◄───────── FK (quote_id) ───────── [ Journal ]
  (id, quote, author)                          (date, highlight, notes...)

   [ Events ] ◄───────── FK (entity_id) ──────── [ Habits / Tasks ]
  (id, type, xp, stat...)                      (id, title, area...)
```

---

## 📋 Table Schema Breakdowns

### 1. Settings
* **Purpose:** Stores user configuration variables.
* **Columns:**
  * `sheets_url` (String): The public URL of the Google Apps Script bridge.
  * `xp_per_level` (Integer): Required XP points to level up (Default: `100`).
  * `accent_color_light` (String): Hex code for light theme accent color.
  * `accent_color_dark` (String): Hex code for dark theme accent color.
  * `api_key` (String): Custom security passcode.

### 2. Habits
* **Purpose:** Configures daily tracker models.
* **Columns:**
  * `id` (String - PK): Unique identifier (e.g. `h1`, `h2`).
  * `name` (String): Display name of the tracker.
  * `type` (String): Format type (`checkbox`, `counter`, `mood`, `energy`, `number`).
  * `icon` (String): Icon symbol representing the tracker.
  * `xp` (Integer): Base XP rewarded on completion.
  * `stat` (String): Target life attribute (`discipline`, `health`, `knowledge`, `creativity`, `career`).
  * `active` (Boolean): Flag indicating if the habit is currently shown on the dashboard.

### 3. HabitLogs
* **Purpose:** Stores historical completion logs for habits.
* **Columns:**
  * `date` (Date - YYYY-MM-DD): The check-in date.
  * `habit_id` (String - FK): References `Habits.id`.
  * `value` (Float/String): Captured input value (e.g. `1.0` for checkbox, `5.0` for counters, `🙂` for mood).
  * `xp_earned` (Integer): Awarded XP.

### 4. Tasks
* **Purpose:** Master backlog Kanban cards.
* **Columns:**
  * `id` (String - PK): Unique identifier (e.g. `t1`).
  * `title` (String): Short title description of the quest.
  * `notes` (String): Detailed instructions or subtasks.
  * `area` (String): Target life attribute mapping.
  * `status` (String): Kanban column location (`backlog`, `todo`, `doing`, `done`).
  * `today` (Boolean): Flag pinning task to the Today board.
  * `due_date` (Date - YYYY-MM-DD): Target completion date.
  * `xp` (Integer): XP rewarded on completion.
  * `created_at` (Timestamp): Record creation timestamp.
  * `completed_at` (Timestamp): Move-to-done completion timestamp.

### 5. Journal
* **Purpose:** Captured daily reflections.
* **Columns:**
  * `date` (Date - YYYY-MM-DD - PK): Check-in date.
  * `highlight` (String): Highlight of the Day description.
  * `notes` (String): Secondary journal notes.
  * `mood` (String): Mood rating face emoji.
  * `quote_id` (String - FK): References `Quotes.id` representing the active quote displayed that day.

### 6. Events
* **Purpose:** Transactions ledger of all XP gains and actions.
* **Columns:**
  * `id` (String - PK): Unique transaction ID (e.g. `evt_...`).
  * `type` (String): Action event code (e.g. `habit_completed`, `task_completed`).
  * `source` (String): System category (`habit`, `task`, `journal`).
  * `entity` (String): Text name of the checked item.
  * `entity_id` (String - FK): References either `Habits.id` or `Tasks.id`.
  * `xp` (Integer): XP awarded.
  * `stat` (String): Attribute progression category.
  * `metadata` (String): Extra logged metadata.
  * `timestamp` (Timestamp): Entry creation timestamp.

### 7. Character
* **Purpose:** Flat history of character status levels over time.
* **Columns:**
  * `date` (Date - YYYY-MM-DD - PK): Record checkpoint date.
  * `level` (Integer): Overall character level.
  * `xp` (Integer): Accumulated XP.
  * `discipline` (Integer): discipline attribute XP.
  * `health` (Integer): health attribute XP.
  * `knowledge` (Integer): knowledge attribute XP.
  * `creativity` (Integer): creativity attribute XP.
  * `career` (Integer): career attribute XP.

### 8. WeeklyStats
* **Purpose:** Historical summaries computed per calendar week.
* **Columns:**
  * `week_key` (String - PK): Week identifier (e.g. `2026-W26`).
  * `habits_completed` (Integer): Sum of completed checkbox/counter logs.
  * `tasks_completed` (Integer): Sum of quests moved to Done.
  * `avg_sleep` (Float): Average sleep hours.
  * `avg_screentime` (Float): Average screen time.
  * `mood_happy_count` (Integer): Count of happy check-ins.
  * `xp_earned` (Integer): Total XP gained during the week.

### 9. Metadata
* **Purpose:** Internal tracking metadata.
* **Columns:**
  * `key` (String - PK): Parameter key (e.g. `last_sync`).
  * `value` (String): Parameter value.

### 10. Quotes
* **Purpose:** Wisdom quotes library database.
* **Columns:**
  * `id` (String - PK): Unique quote ID (e.g. `q1`).
  * `quote` (String): Quote text.
  * `author` (String): Name of author.
  * `category` (String): Classification category.
  * `active` (Boolean): Flag permitting quote selection.
