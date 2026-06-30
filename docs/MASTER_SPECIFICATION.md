# BakaTracker Master Specification

*ADHD-friendly minimalist life RPG planner.*

* **Version:** 1.0 (Codebase package.json version: `0.0.0`)
* **Project Status:** ✅ Core Web App & PWA Completed | ✅ Apps Script Sync Layer Completed | ✅ FastMCP Server Completed | 🟨 Caching & Conflict Resolution Improvements
* **Architecture Version:** 2.1 (Local-First + Apps Script REST API + MCP Interface)
* **Database Schema Version:** 2.0 (10 Google Sheets collections)
* **Last Updated:** 2026-06-30
* **Repository Information:** srivatsacool/BakaTracker (d:\Portfilo_build.srivatsa\BakaTracker)

---

## Executive Summary

### What BakaTracker Is
BakaTracker is a minimalist personal tracker designed as a **Life RPG (Role-Playing Game)**. It combines habit tracking, task backlog planning, today-focused checklist execution, and emotional reflection journaling into a single clean application. 

### Why It Exists
Most productivity apps eventually become work. They overwhelm the user with configurations, nested databases, folders, and dashboards, inducing "productivity guilt" when a day is missed. BakaTracker is designed to prevent this by separating planning from doing, automating game-like rewards, and keeping daily sessions short and highly focused.

### Philosophy
**"Track your life without turning it into a project."**
The application is optimized for check-ins taking **30 seconds or less**:
1. Open the app and read the daily quote.
2. Check off habits.
3. Review and check off today's starred tasks (Quests).
4. Write a single-sentence Highlight of the Day.
5. Close the app.

### Target Users
* **ADHD and Neurodivergent individuals:** Who suffer from task paralysis, struggle with nested folders, and need immediate visual progression and positive feedback.
* **Minimalists:** Who want a clean daily checkout sheet without social features, coins, or shops.
* **Privacy-First / Local-First Advocates:** Who want to own their data locally while utilizing a personal Google Sheet as a serverless database backend.

### Design Principles
1. **Low Friction:** Toggling check-ins, incrementing counters, or rating moods takes a single tap.
2. **Physical Planner Aesthetic (Neobrutalism):** Thick black borders, solid drop shadows, off-white background paper tones, and handdrawn highlights.
3. **Calm Progress:** Streaks are computed supportively, and daily scores focus on consistency.

### Current Maturity
The core React frontend, PWA registration, Zustand store, Google Sheets backend sync API, and Python FastMCP server are completed and stable. Next steps focus on sync conflict handling and habit archiving.

---

## Current Development Status

The following matrix represents the actual state of the BakaTracker codebase:

| Feature / Subsystem | Status | File / Component References | Notes |
| :--- | :--- | :--- | :--- |
| **Local Replica Database** | ✅ Complete | [useStore.ts](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/store/useStore.ts) | Local storage handles read, write, and collection normalization. |
| **Zustand Core Store** | ✅ Complete | [useStore.ts](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/store/useStore.ts) | Unified state, actions, and automatic sync triggers. |
| **Checkbox Habits** | ✅ Complete | [Habits.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Habits.tsx) | Basic toggle habits (e.g. Gym, Medicine). |
| **Counter Habits** | ✅ Complete | [Habits.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Habits.tsx) | Habit logs with incremental offsets (e.g. Reading pages). |
| **Numeric Habits** | ✅ Complete | [Habits.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Habits.tsx) | Direct input logs (e.g. Sleep hours, screen time). |
| **Mood/Energy Trackers** | ✅ Complete | [Habits.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Habits.tsx) | Select emojis or low/med/high parameters. |
| **Habit Streaks** | ✅ Complete | [calculateHabitStreak.ts](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/services/habits/calculateHabitStreak.ts) | Supportively counts streaks from today or yesterday. |
| **Kanban Backlog Planner** | ✅ Complete | [Tasks.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Tasks.tsx) | Manage tasks in Backlog, Todo, Doing, Done. |
| **Today Focus Board** | ✅ Complete | [Today.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Today.tsx) | Dedicated view for starred tasks. |
| **Spotlight Focus Mode** | ✅ Complete | [Today.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Today.tsx) | Dims screen when a task is in the "Doing" column. |
| **Daily Highlight Journal** | ✅ Complete | [Journal.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Journal.tsx) | Input box with character limit, mood, and note. |
| **Consistency Heatmap** | ✅ Complete | [Journey.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Journey.tsx) | 15-week grid with a daily stats overlay modal. |
| **Trend Charts** | ✅ Complete | [Journey.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Journey.tsx) | Recharts grids for Sleep, screen time, habits, and mood. |
| **RPG Leveling HUD** | ✅ Complete | [Journey.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/pages/Journey.tsx) | RPG levels, title milestones, and HUD visual blocks. |
| **Sheets Sync Service** | ✅ Complete | [sheetsService.ts](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/services/sheetsService.ts) | GET/POST JSON requests to Apps Script. |
| **Apps Script Backend** | ✅ Complete | [google-apps-script.js](file:///d:/Portfilo_build.srivatsa/BakaTracker/google-apps-script.js) | Handles spreadsheet API, verification, and sheet creation. |
| **PWA Service Workers** | ✅ Complete | [vite.config.ts](file:///d:/Portfilo_build.srivatsa/BakaTracker/vite.config.ts) | standalone caching with offline warning banner. |
| **FastMCP Python Server** | ✅ Complete | [server.py](file:///d:/Portfilo_build.srivatsa/BakaTracker/bakatracker-mcp/server.py) | CLI tools and resources. |
| **Markdown Exporter** | ✅ Complete | [ExportLifeModal.tsx](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/components/shared/ExportLifeModal.tsx) | Markdown profile exporter. |
| **Habit Archiving** | ⬜ Planned | — | Hide habits from checklist without losing logs. |
| **Dynamic Task Sorting** | ⬜ Planned | — | Sort master task board by due date or XP reward. |
| **Sync Conflict Resolution** | 🟨 In Progress | [useStore.ts](file:///d:/Portfilo_build.srivatsa/BakaTracker/src/store/useStore.ts) | Handles error status; needs conflict recovery modals. |
| **8-Bit Sound System** | ⬜ Planned | — | Retro sound feedback. |
| **Natural Language Parser** | 🧪 Experimental | [quick_log.py](file:///d:/Portfilo_build.srivatsa/BakaTracker/bakatracker-mcp/tools/quick_log.py) | Python regex parser for shorthand input strings. |

---

## Product Philosophy

### Why BakaTracker Exists
Traditional productivity applications eventually turn into work. Users spend more time organizing, sorting, categorizing, and managing tasks than executing them. This complexity induces "productivity guilt" when users fail to meet their rigid schedules. BakaTracker is designed to prevent this by separating planning from doing, automating game-like rewards, and keeping daily sessions short and highly focused.

### Problems It Solves
1. **The Overwhelm of Choice:** Instead of showing all tasks, BakaTracker separates planning (the Tasks backlog board) from execution (the Today board).
2. **Productivity Guilt:** The daily completion score and character XP focus on consistency rather than perfect streaks.
3. **ADHD Task Paralysis:** Spotlight Mode helps users focus by dimming everything on the screen except for the task marked as "Doing Now."

### Daily Workflow
1. **Morning Check-in (10s):** Open the PWA, review the daily quote, and check the Character stats HUD.
2. **Tackle Quests (10s):** Star master tasks to push them to the Today board. Move the current task to the "Doing" column to activate Spotlight Mode.
3. **Evening Review (10s):** Check off remaining habits and log a one-sentence Daily Highlight in the Journal.
4. **Close App:** The database updates locally and syncs to Google Sheets in the background.

The core experience ensures that the user always leaves the app feeling: **"I made progress today."**

---

## Non-Goals

To prevent feature creep, the following modules are explicitly excluded from BakaTracker's design:

* **❌ Notion-style nested pages:** There are no sub-pages, database links, or nested folder paths.
* **❌ Jira-style project management:** No epics, sprint planning tools, story points, or team assignments.
* **❌ AI Assistants/Coaches:** No chatbots or LLM wrappers inside the React web app.
* **❌ Calendar integrations:** No complex Google/Outlook calendar integrations or scheduled meetings.
* **❌ Social networks:** No shared feeds, public boards, friends lists, or comments.
* **❌ Finance trackers:** No expense logs or budget tools.
* **❌ Pomodoro-first setups:** The focus is on spotlighting tasks, not strict timers.

---

## Core Product Principles

Every feature in BakaTracker must satisfy at least one of these principles:

1. **Reduce Friction:** Logging should be a single tap.
2. **Encourage Consistency:** Reward logging over perfect streaks.
3. **Reward Progress:** RPG level-ups and visual HUD progression.
4. **Reduce Decision Fatigue:** Separate planning views from execution views.
5. **Feel Satisfying:** Level-up celebrations, confetti, and floating XP.

---

## Complete Feature Documentation

### Habits
* **Purpose:** Log daily behaviors to build consistency.
* **Current Status:** ✅ Complete.
* **How it works:** Renders active habits on the dashboard. Supports checkboxes, click counters, numeric inputs (e.g. sleep hours), mood ratings, and energy inputs.
* **Data source:** `Habits` and `HabitLogs` sheets/store collections.
* **Future improvements:** Archiving habits instead of deleting them.

### Tasks
* **Purpose:** Plan and backlog master goals.
* **Current Status:** ✅ Complete.
* **How it works:** Full Kanban manager for master tasks. Allows users to categorize tasks into life Areas, define due dates, set custom XP rewards, and toggle the "Today" pin.
* **Data source:** `Tasks` sheet/store collection.
* **Future improvements:** Drag-and-drop support, dynamic sorting.

### Today Focus Board
* **Purpose:** Execution view.
* **Current Status:** ✅ Complete.
* **How it works:** Displays starred tasks. Checklist inputs update task status to Done. Moving a task into "Doing Now" dims the screen to highlight the active task.
* **Data source:** Filtered subset of `Tasks`.
* **Future improvements:** Built-in focus timer.

### Daily Highlight Journal
* **Purpose:** Log a single daily win to combat productivity guilt.
* **Current Status:** ✅ Complete.
* **How it works:** Form inputs for date, Highlight of the Day (120 character limit, written in handdrawn font), notes, and mood emojis. Saves the quote shown on that day to the log.
* **Data source:** `Journal` sheet/store collection.
* **Future improvements:** Image attachments.

### Journey Page
* **Purpose:** Aggregate logs into a structured growth overview.
* **Current Status:** ✅ Complete.
* **How it works:** Renders the character sheet, weekly recap, consistency heatmap, weekly wins checklist, Recharts trend graphs, and consistency insights.
* **Data source:** `habitLogs`, `tasks`, `journal`, and `events`.
* **Future improvements:** Filterable dates.

### Character & Levels
* **Purpose:** RPG-style progression.
* **Current Status:** ✅ Complete.
* **How it works:** Levels are calculated as `Math.floor(totalXP / 100) + 1`. Levels correspond to titles:
  * Level 1-4: *Novice Adventurer*
  * Level 5-9: *Initiate Scholar*
  * Level 10-14: *Steady Wanderer*
  * Level 15-19: *Discipline Expert*
  * Level 20+: *Habit Champion / Ascended Master*
* **Data source:** `Character` sheet/store collection.
* **Future improvements:** Title customizers.

### Events Ledger
* **Purpose:** Standardized ledger of user accomplishments.
* **Current Status:** ✅ Complete.
* **How it works:** Automatically logs events for habit checks, task completions, and reflections.
* **Data source:** `Events` sheet/store collection.
* **Future improvements:** Event category filtering.

### Quote System
* **Purpose:** Motivational focus on launch.
* **Current Status:** ✅ Complete.
* **How it works:** Displays a random quote from the database. Integrates the active quote ID into the day's journal entry.
* **Data source:** `Quotes` sheet/store collection.
* **Future improvements:** Favorite quotes list.

### Settings Overlay
* **Purpose:** Database and theme customization.
* **Current Status:** ✅ Complete.
* **How it works:** Dialog form to set Google Apps Script URL, API authentication key, and custom accent colors for light and dark modes.
* **Data source:** Local storage.
* **Future improvements:** Export/import backup JSON files.

### PWA Offline Support
* **Purpose:** Offline reliability.
* **How it works:** Caches resources using Service Workers. Displays a warning banner when offline, and queues synchronization for when connectivity is restored.
* **Data source:** local storage.
* **Future improvements:** Background sync API integration.

### Model Context Protocol (MCP) Server
* **Purpose:** LLM command-line interface.
* **Current Status:** ✅ Complete.
* **How it works:** FastMCP Python server. Maps tools and resources to Apps Script requests.
* **Data source:** Sheets API client.
* **Future improvements:** Support for local SQL database fallbacks.

---

## Complete User Journey

The diagram below represents the complete user journey and system mechanics from first installation to weekly reflections.

```
[First Launch] ──> [Initializes Default Habits & Quotes] ──> [Show Onboarding Banner]
                                                                        │
                                                                        ▼
                                                             [Daily Usage Check-In]
                                                                        │
         ┌─────────────────────────┬────────────────────────────┼──────────────────────────┐
         ▼                         ▼                            ▼                          ▼
[Read Today's Quote]    [Check Off Checkbox Habits]   [Adjust Counter Habits]    [Record Mood & Energy]
         │                         │                            │                          │
         └─────────────────────────┴────────────────────────────┴──────────────────────────┘
                                                                │
                                                                ▼
                                                      [Select Today's Focus]
                                                                │
                                      ┌─────────────────────────┴──────────────────────────┐
                                      ▼                                                    ▼
                             [Backlog Master Board]                              [Star Tasks for Today]
                                      │                                                    │
                                      └─────────────────────────┬──────────────────────────┘
                                                                │
                                                                ▼
                                                      [Execute Focus Today]
                                                                │
                                      ┌─────────────────────────┴──────────────────────────┐
                                      ▼                                                    ▼
                             [Check Off Checklist]                      [Move Task to Doing/Done]
                                      │                                                    │
                                      └─────────────────────────┬──────────────────────────┘
                                                                │
                                                                ▼
                                                     [Reflect & Level Up]
                                                                │
                                      ┌─────────────────────────┴──────────────────────────┐
                                      ▼                                                    ▼
                             [Write Daily Highlight]                     [Review Journey & Heatmap]
                                      │                                                    │
                                      └─────────────────────────┬──────────────────────────┘
                                                                │
                                                                ▼
                                                    [Save & Background Sync]
```

### Detailed Flow
1. **First Launch:** The app initializes. It reads `localStorage`. Finding no keys, it loads 6 default habits (Gym, Reading, Medication, Sleep, Mood check, Screen Time) and 5 motivational quotes. The Neobrutalist **Onboarding Banner** is pinned to the top.
2. **Onboarding:** The banner guides the user to clear 5 onboarding quests:
   * Create 3 Habits
   * Add 2 Tasks
   * Write First Journal Entry
   * Earn First XP
   * Reach Level 2
3. **Daily Check-In:** The user opens the PWA, reviews the daily quote, and checks off completed habits. Streaks recalculate, and daily completion scores are updated.
4. **Master Backlog & Planning:** On the **Tasks page**, the user logs master goals, assigns them to life Areas, and stars today's targets.
5. **Focused Execution:** On the **Today page**, the user focuses on starred tasks. Moving a task into the "Doing" column dims the rest of the interface to prevent distraction. Completing a task triggers a floating XP notification.
6. **Reflections:** At the end of the day, the user logs a one-sentence daily highlight (max 120 characters) and notes.
7. **Growth Review:** The user checks the **Journey page** to review heatmaps, weekly progress logs, and trends.
8. **Synchronization:** Data is saved to local storage, and updates are synchronized to Google Sheets in the background.

---

## Page-by-Page Documentation

### Habits Page (`src/pages/Habits.tsx`)
* **Purpose:** Daily habit logging and character stat monitoring.
* **Widgets:** Hero HUD Card (Date, Level progress bar, Daily score dial, Quote of the Day), Character Stats panel, Habit Grid.
* **Interactions:** Checkbox toggle, counter adjustments, numeric inputs, custom habit form, habit delete.
* **Animations:** Confetti, floating XP.
* **State:** Connected to Zustand store.
* **Services:** `useStore` store actions, `sheetsService` background syncer.
* **Data Dependencies:** `habits`, `habitLogs`, `stats`.
* **Future Improvements:** Habit archiving, habit scheduling.

### Tasks Page (`src/pages/Tasks.tsx`)
* **Purpose:** Master backlog planning.
* **Widgets:** Kanban board with columns: Backlog, Todo, Doing, Done. Task Add Form. Area filters.
* **Interactions:** Task moves, today stars, task delete.
* **Animations:** Column transitions.
* **State:** Connected to Zustand store.
* **Services:** `useStore` task management services.
* **Data Dependencies:** `tasks`.
* **Future Improvements:** Drag-and-drop support, dynamic sorting.

### Today Page (`src/pages/Today.tsx`)
* **Purpose:** Execution view.
* **Widgets:** Today checklist, focus Kanban board.
* **Interactions:** Checklist click, status shift.
* **Animations:** Spotlight dimmer overlay, floating XP, completion bounce.
* **State:** Connected to Zustand store.
* **Services:** `useStore` task selectors.
* **Data Dependencies:** Filtered subset of `tasks` where `today = true`.
* **Future Improvements:** Built-in focus timer.

### Journal Page (`src/pages/Journal.tsx`)
* **Purpose:** One-sentence reflection logging.
* **Widgets:** Today's reflection form, quote preview, timeline list, search bar.
* **Interactions:** Mood button click, text input, timeline search.
* **Animations:** Cursive font highlight styling.
* **State:** Connected to Zustand store.
* **Services:** `useStore` journal save operations.
* **Data Dependencies:** `journal`, `currentQuote`, `quotes`.
* **Future Improvements:** Image attachments.

### Journey Page (`src/pages/Journey.tsx`)
* **Purpose:** Aggregate logs into a structured growth overview.
* **Widgets:** Character overview, Weekly recap growth, Weekly wins checklist, heatmap grid, Recharts trend charts, consistency insights list.
* **Interactions:** Heatmap cell click (opens detail card), export modal toggle.
* **Animations:** Recharts graph lines.
* **State:** Connected to Zustand store.
* **Services:** Recharts library, `ExportLifeModal`.
* **Data Dependencies:** `habits`, `habitLogs`, `tasks`, `journal`, `events`, `stats`.
* **Future Improvements:** Filterable dates.

### Settings Dialog (`src/components/shared/Layout.tsx`)
* **Purpose:** Custom theme and database config.
* **Widgets:** Sheets URL form, API Key input, accent color config pickers.
* **Interactions:** Save and sync, default resets.
* **Animations:** Theme transition color updates.
* **State:** Connected to Zustand store.
* **Services:** `sheetsService`.
* **Data Dependencies:** `settings`.
* **Future Improvements:** Backup JSON exports.

---

## UI & Design System

### Design Language
Neobrutalism. Inspired by Gumroad and physical planners. Emphasizes bold black borders and thick drop shadows over soft gradients.

### Palette
* Background: `#F8F5F0` (warm paper off-white)
* Surface: `#FFFFFF` (card surfaces)
* Borders: `#000000` (thick black lines)
* Accent Pink: `#FF90E8` (customizable)
* Success: `#22C55E`
* Warning: `#F59E0B`
* Danger: `#EF4444`

### Typography & Spacing
* Sans-Serif font: `Inter`. Cursive highlight font: `Architects Daughter` or `Gochi Hand`.
* Layout spacing: Tailwind variables.

### Key Components
* **Cards (`.neo-card`):** Bold borders and shadows.
  ```css
  border: 2px solid var(--color-border-primary);
  box-shadow: 4px 4px 0px 0px var(--shadow-color);
  border-radius: 8px;
  ```
* **Buttons (`.neo-button`):** Animate translation offsets when clicked to simulate physical presses.
  * `:hover` $\to$ `translate(-1px, -1px); shadow-gumroad-lg`
  * `:active` $\to$ `translate(1px, 1px); shadow-gumroad-sm`
* **Habit Tiles:** Render grid items displaying streaking days and completion status.
* **Responsive Layout:** Automatically scales from a collapsible vertical left sidebar on desktop to a bottom navigation bar on mobile.

---

## Technical Architecture

BakaTracker uses a local-first React frontend with a Google Sheets database backend and a command-line Python MCP server.

```
                +----------------------------+
                |        FastMCP CLI         |
                |       (Python Server)      |
                +----------------------------+
                              │
                              │ REST (doGet/doPost)
                              ▼
+-------------+  Local  +------------+  Sync  +--------------------+  Write  +---------------+
| React Views | <-----> |   Zustand  | ------> | SheetsService HTTP | ------> | Google Sheets |
| (PWA Mobile)|         | Local Store|         |   (Apps Script)    |         |   Database    |
+-------------+         +------------+         +--------------------+         +---------------+
```

### Why this architecture exists:
1. **React + Zustand:** Fast rendering and easy state management.
2. **Google Sheets + Apps Script:** Free, serverless hosting that lets users own their data.
3. **Local-First Sync:** App updates instantly using local storage and handles synchronization asynchronously in the background.
4. **FastMCP Server:** Integrates BakaTracker with LLM coding agents.

---

## Architecture Decisions

* **Why React?** Component modularity, rich ecosystem, and support for Recharts.
* **Why Zustand?** Avoids boilerplate, provides reactive state, and supports direct persistence.
* **Why Google Sheets?** Free database hosting that gives users control over their data.
* **Why Local-First?** Offline reliability and fast load times.
* **Why Apps Script?** Free REST endpoint hosting for Google Sheets.
* **Why MCP?** Integrates BakaTracker with developer LLMs.
* **Why FastMCP?** Simplifies Python tool and resource registration.
* **Why Service Layer?** Decouples business logic from React views.
* **Why TypeScript?** Prevents data mapping errors.

---

## Project Structure

```
BakaTracker/
├── backend/                  # Python FastMCP Server & FastAPI app
│   ├── models/               # Data structures
│   ├── services/             # Apps Script Sheets client
│   ├── tools/                # Habits, tasks, and logging tools
│   ├── server.py             # FastMCP application core
│   ├── main.py               # FastAPI entry point
│   ├── config.py             # Centralized config options
│   ├── Dockerfile            # Container build specification
│   ├── pyproject.toml        # Dependencies and metadata
│   └── cloudbuild.yaml       # Google Cloud Build triggers
├── public/                   # Public assets (icons, manifest)
├── src/
│   ├── assets/               # Local asset files
│   ├── components/           # Shared views & layout panels
│   │   └── shared/
│   │       ├── Layout.tsx          # Nav shell & Settings modal
│   │       ├── OnboardingBanner.tsx # Steps checklist
│   │       └── ExportLifeModal.tsx  # Markdown report exporter
│   ├── lib/
│   │   └── utils.ts          # XP, score, and utility helpers
│   ├── pages/                # Page route views
│   │   ├── Habits.tsx        # Daily trackers list
│   │   ├── Tasks.tsx         # Master Kanban board
│   │   ├── Today.tsx         # Spotlight focus board
│   │   ├── Journal.tsx       # Memory reflection form
│   │   └── Journey.tsx       # Heatmaps & Recharts trends
│   ├── services/             # Operations utility services
│   │   ├── habits/           # Streak & lifecycle helpers
│   │   ├── tasks/            # Task status modifiers
│   │   ├── journal/          # Entry generators
│   │   ├── quotes/           # Quote selectors
│   │   ├── stats/            # XP & Level recalculators
│   │   └── sheetsService.ts  # HTTP client
│   ├── store/
│   │   └── useStore.ts       # Zustand store and actions
│   ├── types/
│   │   └── index.ts          # TypeScript model schemas
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # App routing
│   └── index.css             # Tailwind imports & Neobrutalist classes
├── google-apps-script.js     # Sheets API deployment script
├── vite.config.ts            # Vite & PWA configurations
├── package.json              # App dependencies
└── tsconfig.json             # TypeScript rules
```

---

## TypeScript Models (`src/types/index.ts`)

BakaTracker uses TypeScript to enforce type safety on all local operations and sheet payloads.

### `HabitType`
```typescript
export type HabitType = 'checkbox' | 'counter' | 'mood' | 'energy' | 'numeric';
```
* **Purpose:** Enumerate the support modes for logging habits.

### `StatType`
```typescript
export type StatType = 'discipline' | 'health' | 'knowledge' | 'creativity' | 'career';
```
* **Purpose:** Maps habits and tasks to RPG attributes.

### `Habit`
```typescript
export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  icon: string; // Emoji
  xp: number;
  stat: StatType;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```
* **Purpose:** Holds metadata definitions for habits. Used in Habit grids and setup forms.

### `HabitLog`
```typescript
export interface HabitLog {
  id: string;
  date: string; // YYYY-MM-DD
  habit_id: string;
  value: number | string;
  xp_earned: number;
  created_at: string;
}
```
* **Purpose:** Holds the specific value recorded on a date for a habit.

### `TaskStatus`
```typescript
export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'done';
```
* **Purpose:** Columns in the master task board.

### `TaskArea`
```typescript
export type TaskArea = 'health' | 'career' | 'learning' | 'personal' | 'creativity';
```
* **Purpose:** Life categories mapping to `StatType` via `areaToStat()`.

### `Task`
```typescript
export interface Task {
  id: string;
  title: string;
  notes: string;
  area: TaskArea;
  status: TaskStatus;
  today: boolean;
  due_date: string;
  xp: number;
  created_at: string;
  updated_at: string;
  completed_at: string;
}
```
* **Purpose:** Holds details for master tasks.

### `JournalEntry`
```typescript
export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  highlight: string;
  notes: string;
  mood: '😞' | '😐' | '🙂' | '';
  quote_id: string;
  quote_text?: string;
  quote_author?: string;
  created_at: string;
  updated_at: string;
}
```
* **Purpose:** Daily reflection log structure.

### `Quote`
```typescript
export interface Quote {
  id: string;
  quote: string;
  author: string;
  category: string;
  active: boolean;
}
```
* **Purpose:** Wisdom quotes.

### `Settings`
```typescript
export interface Settings {
  sheets_url: string;
  xp_per_level: number;
  accent_color_light?: string;
  accent_color_dark?: string;
  api_key?: string;
}
```
* **Purpose:** App settings model.

---

## Database Documentation

BakaTracker uses **Google Sheets** as a database. The spreadsheet represents a relational database with 10 tables (sheets).

```
+------------+        +---------------+
|   Habits   | <----+ |   HabitLogs   |
+------------+        +---------------+
                      | habit_id (FK) |
                      +---------------+

+------------+        +---------------+
|   Tasks    |        |    Journal    |
+------------+        +---------------+
                      | quote_id (FK) |
                      +---------------+
```

### Table Schema Breakdowns

#### 1. Habits
* **Purpose:** Defines the trackers configured by the user.
* **Columns:**
  * `id` (String - PK) - Unique identifier (e.g. `h1`).
  * `name` (String) - Habit description.
  * `type` (String) - `checkbox`, `counter`, `numeric`, `mood`, `energy`.
  * `icon` (String) - Emoji symbol.
  * `xp` (Integer) - Experience granted per completion.
  * `stat` (String - FK) - Attribute linked: `discipline`, `health`, `knowledge`, `creativity`, `career`.
  * `active` (Boolean) - Visibility flag (`true` or `false`).
  * `created_at` (String) - ISO timestamp.
  * `updated_at` (String) - ISO timestamp.

#### 2. HabitLogs
* **Purpose:** Log of habit activities.
* **Columns:**
  * `id` (String - PK) - Log identifier (`log_...`).
  * `date` (String) - Date of execution (`YYYY-MM-DD`).
  * `habit_id` (String - FK) - Linked habit.
  * `value` (String/Number) - Entry value (`1`, mood emoji, numeric value).
  * `xp_earned` (Integer) - Computed XP reward.
  * `created_at` (String) - ISO timestamp.

#### 3. Tasks
* **Purpose:** Master list of planned tasks.
* **Columns:**
  * `id` (String - PK) - Task identifier (`task_...`).
  * `title` (String) - Task title.
  * `notes` (String) - Detailed descriptions.
  * `area` (String) - life Area (`health`, `career`, `learning`, `personal`, `creativity`).
  * `status` (String) - `backlog`, `todo`, `doing`, `done`.
  * `today` (Boolean) - Starred flag (`true` or `false`).
  * `xp` (Integer) - XP reward.
  * `due_date` (String) - Target date (`YYYY-MM-DD` or empty).
  * `created_at` (String) - ISO timestamp.
  * `updated_at` (String) - ISO timestamp.
  * `completed_at` (String) - Completion ISO timestamp (or empty).

#### 4. Journal
* **Purpose:** Memory timeline reflections.
* **Columns:**
  * `id` (String - PK) - Reflection identifier (`journal_...`).
  * `date` (String) - Reflection date (`YYYY-MM-DD`).
  * `highlight` (String) - The single best thing that happened.
  * `notes` (String) - Extra reflections.
  * `mood` (String) - Mood rating emoji (`😞`, `😐`, `🙂`).
  * `quote_id` (String - FK) - Associated quote.
  * `created_at` (String) - ISO timestamp.
  * `updated_at` (String) - ISO timestamp.

#### 5. Quotes
* **Purpose:** Motivational quotes database.
* **Columns:**
  * `id` (String - PK) - Quote identifier (e.g. `q1`).
  * `quote` (String) - The quote text.
  * `author` (String) - Quote source.
  * `category` (String) - Focus topic.
  * `active` (Boolean) - Active flag (`true`/`false`).

#### 6. Events
* **Purpose:** Chronological system ledger for XP and activities.
* **Columns:**
  * `id` (String - PK) - Event identifier (`evt_...`).
  * `type` (String) - `habit_completed`, `task_completed`, `journal_created`.
  * `source` (String) - `habit`, `task`, `journal`, `system`.
  * `entity` (String) - Description string.
  * `entity_id` (String - FK) - Reference ID to origin table.
  * `xp` (Integer) - Gained XP.
  * `stat` (String) - Associated stat category.
  * `metadata` (String) - JSON string holding variable info (e.g. `{"value": 5}`).
  * `timestamp` (String) - ISO timestamp.

#### 7. Settings
* **Purpose:** Settings dictionary.
* **Columns:**
  * `key` (String - PK) - Config name (e.g. `sheets_url`, `xp_per_level`, `api_key`).
  * `value` (String) - Config value.

#### 8. Metadata
* **Purpose:** Database health validation.
* **Columns:**
  * `schema_version` (String) - Current database schema (`2.0`).
  * `xp_formula` (String) - Formula definition.
  * `last_sync` (String) - ISO timestamp.

#### 9. Character
* **Purpose:** Pre-computed character progress cache (for MCP speed).
* **Columns:**
  * `id` (String - PK) - Record identifier.
  * `level` (Integer) - Current level.
  * `total_xp` (Integer) - Overall XP.
  * `discipline` (Integer) - Attribute XP.
  * `health` (Integer) - Attribute XP.
  * `knowledge` (Integer) - Attribute XP.
  * `creativity` (Integer) - Attribute XP.
  * `career` (Integer) - Attribute XP.
  * `title` (String) - Earned title.
  * `updated_at` (String) - ISO timestamp.

#### 10. WeeklyStats
* **Purpose:** Pre-computed historical weekly recap cache.
* **Columns:**
  * `week_start` (String - PK) - Monday date (`YYYY-MM-DD`).
  * `xp` (Integer) - Total weekly XP.
  * `health` (Integer) - Health XP.
  * `knowledge` (Integer) - Knowledge XP.
  * `career` (Integer) - Career XP.
  * `creativity` (Integer) - Creativity XP.
  * `discipline` (Integer) - Discipline XP.

---

## Service Layer

BakaTracker separates business logic from React views via pure utility services.

```
+-------------+
| React Views |
+-------------+
       |
       v
+-------------+
|    Store    |
+-------------+
       |
       v
+-------------+
|   Service   |
|   Utilities |
+-------------+
```

### Habits Service (`src/services/habits`)
* **`createHabit(name, type, icon, xp, stat)`:** Returns a clean `Habit` object containing a generated ID and timestamps.
* **`calculateHabitStreak(habit, logs)`:** Analyzes logs to determine streaks. Starts checking yesterday if today is not completed yet.
* **`deleteHabit(id, habits, logs)`:** Filters out deleted habits and corresponding logs.

### Tasks Service (`src/services/tasks`)
* **`createTask(title, notes, area, xp, today, dueDate)`:** Returns a clean `Task` object.
* **`moveTask(task, status)`:** Updates task status and completes timestamps.
* **`deleteTask(id, tasks)`:** Deletes task.

### Journal Service (`src/services/journal`)
* **`createJournalEntry(date, highlight, notes, mood, quoteId)`:** Constructs a daily reflection item.

### Quotes Service (`src/services/quotes`)
* **`refreshQuote(quotes, currentId)`:** Pulls a random active quote, ensuring it does not repeat the current ID.

### Stats Service (`src/services/stats`)
* **`calculateCharacterStats(habits, logs, tasks, journal, xpPerLevel)`:** Computes total XP and returns Level, XP progress, and stat totals.
* **`calculateXP(habits, logs, tasks, journal)`:** Evaluates logs and today's completed tasks to compute XP maps.
* **`calculateLevel(totalXP, xpPerLevel)`:** Translates total XP to levels.
* **`backfillEvents(habits, logs, tasks, journal)`:** Reconstructs the `events` ledger if it gets out of sync or is empty.
* **`generateInsights(logs, tasks)`:** Standard rules engine generating text observations.

### Sheets Service (`src/services/sheetsService.ts`)
* **`fetchData(url, apiKey)`:** Performs GET request to Apps Script Web App.
* **`syncData(url, data, apiKey)`:** POSTs local collections to Apps Script.

---

## Zustand Store

BakaTracker utilizes **Zustand** as its state management engine (`src/store/useStore.ts`). 

### State Schema
* `habits`: `Habit[]`
* `habitLogs`: `HabitLog[]`
* `tasks`: `Task[]`
* `journal`: `JournalEntry[]`
* `quotes`: `Quote[]`
* `events`: `EventLog[]`
* `settings`: `Settings`
* `stats`: `UserStats`
* `character`: `CharacterRecord[]`
* `weeklyStats`: `WeeklyStatsRecord[]`
* `theme`: `'light' | 'dark'`
* `syncStatus`: `'idle' | 'loading' | 'success' | 'error'`

### Key Mechanics
1. **Initialization (`init`):**
   * Loads the active theme and applies colors.
   * Loads all collections from `localStorage`.
   * Normalizes values (ensuring IDs and timestamps are correct).
   * Backfills events if missing.
   * If a `sheets_url` exists, it triggers a remote fetch and merges state with remote data.
2. **Synchronization (`syncWithSheets`):**
   * Synchronizes state to the cloud. Sets `syncStatus` to `loading` and executes a background POST request.
3. **Persistence:**
   * Local changes are instantly written to `localStorage` and then synced in the background.

---

## Google Apps Script API

BakaTracker turns a standard Google Sheet into a serverless database using Google Apps Script (`google-apps-script.js`).

```
+-------------+              +--------------------+              +---------------+
| BakaTracker |  ---POST---> | Apps Script Engine |  ---Writes-> | Google Sheets |
|  PWA / MCP  |  <--JSON---  |    (doPost/doGet)  |              |  Collections  |
+-------------+              +--------------------+              +---------------+
```

### Endpoints
* **`doGet(e)`:**
  * Checks/configures missing sheets.
  * Validates `apiKey` parameters.
  * Reads data from all 10 sheets and returns a structured JSON payload:
    ```json
    { "status": "success", "data": { "habits": [...], "habitLogs": [...], ... } }
    ```
* **`doPost(e)`:**
  * Receives a JSON payload containing the collection arrays.
  * Clears sheet contents (retaining headers) and overwrites rows using `setValues()`.

### Sheet Initialization
If sheets are missing when doGet/doPost runs, Apps Script inserts them automatically and appends the required column headers.

---

## MCP Server

The Model Context Protocol (MCP) server allows LLM coding assistants to interact with the BakaTracker database.

### Directory Structure
```
backend/
├── main.py               # FastAPI server and health endpoints
├── server.py             # FastMCP application core
├── config.py             # Centralized environment variables
├── Dockerfile            # Production Docker image build
├── pyproject.toml        # Pinned dependency ranges
├── cloudbuild.yaml       # Google Cloud Build triggers
├── README.md             # Developer and deployment manual
├── .env.example          # Environment variables template
├── services/
│   └── sheets_client.py  # Apps Script database proxy client
├── tools/
│   ├── habits.py         # Habit logging tools
│   ├── tasks.py          # Task management tools
│   ├── journal.py        # Reflection tools
│   ├── quotes.py         # Quote retrieval tools
│   ├── events.py         # Activity retrieval tools
│   └── quick_log.py      # Natural language parser
└── models/               # Data structures
```

### Registered Tools
* `get_habits`: Returns configured habits.
* `get_habit_logs(date)`: Returns habit logs.
* `log_habit(habit_id, date)`: Toggles checkbox habits.
* `increment_habit(habit_id, amount, date)`: Increments counter habits.
* `set_habit_value(habit_id, value, date)`: Logs numeric/mood/energy values.
* `get_tasks` / `get_today_tasks`: Returns tasks.
* `create_task` / `update_task` / `delete_task`: Manages tasks.
* `save_journal_entry`: Logs a reflection.
* `quick_log(text)`: Parses shorthand natural language (e.g. `Gym done. Read 15. Mood happy`).

### Registered Resources
* `bakatracker://character`: Text character profile.
* `bakatracker://today`: Today's quest board summary.
* `bakatracker://weekly`: Weekly Wins and weekly growth recaps.
* `bakatracker://journal`: Timeline logs.
* `bakatracker://events`: Chronological system events.

---

## Data Flow

Here is how data flows through BakaTracker when checking off a habit (e.g., checking "Gym Workout"):

```
+-------------+           +---------------+           +-------------+
| User clicks | --------> |  useStore.ts  | --------> | calculateXP |
|  Gym Card   |           |  toggleHabit  |           |  updates    |
+-------------+           +---------------+           +-------------+
                                  |                          |
                                  v                          v
+-------------+           +---------------+           +-------------+
|    Local    | <-------- | localStorage  |           | Character   |
|   Storage   |           | write         |           | WeeklyStats |
+-------------+           +---------------+           +-------------+
                                  |                          |
                                  v                          v
+-------------+           +---------------+           +-------------+
|    Sync     | --------> |  Apps Script  | --------> |    Sheets   |
|   Engine    |           |  doPost(sync) |           |  Updated    |
+-------------+           +---------------+           +-------------+
```

1. **User Action:** The user clicks the Gym checkbox.
2. **React View:** Triggers `toggleHabit('h1', '2026-06-30')`.
3. **Zustand Store:**
   * Appends/toggles the log inside `habitLogs`.
   * Appends a `habit_completed` item to `events`.
   * Writes the updated state to `localStorage`.
   * Triggers `updateStatsAndSummaries` to recalculate XP, levels, character sheets, and weekly stats.
4. **Cloud Synchronization:** Triggers a background sync. The `sheetsService` POSTs the modified database collections.
5. **Apps Script:** Receives the POST payload, clears Sheets, writes the new records, and returns `success`.

---

## Gamification System

BakaTracker implements a clean gamification loop focused on rewarding consistency.

* **XP Distribution:**
  * Checkbox habit: Granted habit XP (e.g., Gym = +10 XP).
  * Counter habit: `value * habit.xp` (e.g., Reading = +2 XP per page).
  * Numeric habit: Granted habit XP (e.g., Sleep = +5 XP).
  * Mood/Energy habit: Granted habit XP (e.g., Mood = +5 XP).
  * Today Tasks: Completed tasks on the Today board grant task XP.
  * Journal Entry: Logging a daily highlight grants +10 XP.
* **Level Progression:** Each level requires exactly 100 XP.
* **Character Stats Progression:** Gained XP is mapped to individual stats based on habit/task metadata.
* **Daily Score:** A weighted score calculated daily:
  $$\text{Daily Score} = (\text{Habits Completed}\% \times 0.5) + (\text{Tasks Completed Today}\% \times 0.4) + (\text{Journal Entry Written} \times 10)$$

---

## Event System

Every log, task check-off, or reflection is recorded as an event.

* **Format:**
  ```json
  {
    "id": "evt_...",
    "type": "habit_completed",
    "source": "habit",
    "entity": "Gym Workout",
    "entity_id": "h1",
    "xp": 10,
    "stat": "health",
    "metadata": "",
    "timestamp": "2026-06-30T12:00:00.000Z"
  }
  ```
* **Event Creation:** Automatically created during store updates.
* **Event Removal:** If a user unchecks a habit or updates a task to a non-completed state, the corresponding event is deleted from the timeline.
* **Purpose:** Serves as a single source of truth to calculate weekly recaps, weekly stats histories, and consistency heatmaps.

---

## Performance

* **Bundle Size:** Highly optimized by avoiding heavy UI components (like Material UI or Radix). Uses pure custom CSS classes and Lucide SVGs.
* **Caching:** PWA caches icons and index files, allowing sub-second app launching.
* **Data Payload:** Small, flat JSON collection structures.
* **Potential Bottleneck:** Over-the-air App Script latency. POST requests to Google Apps Script can take 1.5 - 3.5 seconds. 
  * *Mitigation:* Local actions are updated immediately in UI and written to localStorage. Synchronization runs asynchronously in the background.

---

## Security

* **API Keys:** Settings support an optional custom `api_key`. If set, GET/POST requests must supply a matching key, preventing unauthorized access.
* **Apps Script Security:** Apps Script runs in the user's Google Drive. The script is deployed as "Execute as Me" and "Access: Anyone," meaning the endpoint is public but protected by the API key verification logic in the script.
* **Vulnerabilities:**
  * API Key is stored in local storage, which can be inspected if a device is compromised.
  * Google Apps Script URL is public. If no API key is set, anyone who discovers the URL can read/write the sheet.
* **Recommended Improvements:** Emphasize that the user should set an API key during initial Apps Script configuration.

---

## Open Source Readiness

BakaTracker is well-positioned for open-source distribution:
* **Code Quality:** Well-separated folder structure, clear naming conventions, and strong TypeScript schemas.
* **Configurability:** Fully decoupled from static database URLs. Users use their own Google Sheets and custom accent colors.
* **Documentation:** Clear guides in `README.md` and detailed Apps Script deploy instructions.
* **Licensing Recommendations:** MIT License or Apache 2.0 to allow developers to fork, customize, and self-host.

---

## Technical Debt

* **Duplicated Sync Logic:** Sync verification and key checking exist separately in the React store and the Python MCP server sheets client.
* **Spotlight Implementation:** Spotlight mode in `Today.tsx` modifies global overlay classes. A better approach would be wrapping it in a React portal component.
* **Recharts Warnings:** Recharts elements can trigger type warnings in React 19 due to legacy reference hooks.

---

## Roadmap

### Critical
* **Encryption:** Add optional AES encryption for local storage and sync payloads.
* **Archiving Trackers:** Allow archiving habits instead of deleting them to preserve historical logs.

### High
* **Task Sorting:** Sort master planner tasks by due date or XP reward.
* **Sync Recovery:** Handle offline conflict states when local and remote sheets diverge.

### Medium
* **Sound Effects:** Add retro 8-bit sound effects for level-ups and quest completions.
* **Custom Titles:** Allow users to choose their titles from unlocked achievements.

### Low
* **Import/Export File:** Allow importing/exporting database JSON files directly (bypassing Google Sheets).

### Experimental
* **Natural Language Parsing in App:** Port the MCP server's natural language quick logger directly into the React UI.

---

## Changelog

### v1.0 (2026-06-30)
* **Added:** Master Specification schema.
* **Added:** Neobrutalist UI styling inspired by Gumroad.
* **Added:** Collapsible left navigation sidebar on desktop.
* **Added:** Bottom navigation bar on mobile.
* **Added:** Theme customization panel for custom accent colors.
* **Added:** Google Sheets sync verification using API keys.
* **Added:** Service workers configuration using `vite-plugin-pwa`.
* **Added:** MCP server using Python FastMCP framework.

---

## Final Project Health Report

### Core Metrics
* **Architecture Score: 9/10**
  * *Why:* Decoupled store, service, and database layers.
* **UX Score: 9.5/10**
  * *Why:* Great styling, interactive focus spotlighting, and floating feedback indicators.
* **Code Quality: 9/10**
  * *Why:* Fully typed, clean files, and modular design.
* **Scalability: 7/10**
  * *Why:* Google Sheets sync operations might hit timeout thresholds with large datasets.
* **Maintainability: 9.5/10**
  * *Why:* Small codebase, minimal external dependencies.
* **Performance: 8.5/10**
  * *Why:* Immediate local updates, but background sheet syncing has network latency.
* **Accessibility: 8/10**
  * *Why:* High contrast aid readability, but Neobrutalist design might lack full screen-reader optimization.
* **Open Source Readiness: 9/10**
  * *Why:* Decoupled structure makes it easy for developers to host their own instances.
* **MCP Readiness: 10/10**
  * *Why:* Full FastMCP python server with tools/resources matches the frontend store functionality.
* **Overall Score: 8.8 / 10**

---

## Next Sprint

1. **Tracker Archiving:** Add an `archived` boolean to the `Habit` type. Modify selectors to hide archived habits from the today checklist while preserving historical streaks and XP totals.
2. **Conflict Resolution:** Add a `last_modified` timestamp to the sync payload to prevent local changes from overwriting newer remote sheet edits.
3. **Overlay Modals Refactor:** Refactor the spotlight dimmer overlay into a reusable React Portal component to clean up `Today.tsx`.

---

## Living Document Rules

This file must always reflect the actual codebase.
Never document imaginary features.
Never mark planned features as complete.
Whenever the code changes:
Update this document.
If implementation differs from documentation:
The documentation must be corrected immediately.
This document is the project's single source of truth.
