# BakaTracker Final Visual QA

**Capture date:** 2026-08-28 00:39 IST  
**Application commit:** a83452b (docs(p3.4c): document sync conflict model)  
**Visual refinement phases:** 1–12 complete  

**Desktop viewport:** 1440 × 1000  
**Mobile viewport:** 390 × 844  
**Device scale:** 1  
**Browser:** Chromium (headless, Playwright 1.62.1)  
**Auth mode:** Guest/Demo (bt_demo_mode = true, no backend)  

---

## Desktop Screenshots

| File | Description |
|------|-------------|
| `01-today.png` | Today — RPG Command Center with DailyStatus HUD, task kanban, cockpit |
| `02-tasks.png` | Tasks — Quest Board with 4-column Kanban, QuestBoardHUD |
| `03-habits.png` | Habits — Pixel Tracker with HabitTrackerHUD, WeekStrip |
| `04-eisenhower.png` | Eisenhower — Tactical Priority Board with 4 quadrants |
| `05-journal.png` | Journal — Daily Log with JournalMoodSelector, mood trail |
| `06-journey.png` | Journey — Character Progression with CharacterCard, StatBar, charts |
| `07-notes.png` | Notes — Knowledge Inventory with notebook hierarchy |
| `08-bakasur.png` | BakaSur — Companion Terminal with conversation, suggested prompts |
| `10-landing.png` | Landing page — LightTunnel world + dark overlay |

**Note:** `09-settings.png` could not be captured at desktop viewport in guest mode — the InstrumentRail settings button is rendered by the authenticated Layout, which requires login. The settings modal state is captured in `states/settings-open.png`.

---

## Mobile Screenshots

| File | Description |
|------|-------------|
| `mobile-01-today.png` | Today mobile — stacked sections, mobile chrome |
| `mobile-02-tasks.png` | Tasks mobile — column tabs, touch-friendly cards |
| `mobile-03-habits.png` | Habits mobile — habit rows stacked, week strip |
| `mobile-04-eisenhower.png` | Eisenhower mobile — stacked quadrants |
| `mobile-05-journal.png` | Journal mobile — calendar + entry form |
| `mobile-06-journey.png` | Journey mobile — character card + stats stacked |
| `mobile-07-notes.png` | Notes mobile — notebook list |
| `mobile-08-bakasur.png` | BakaSur mobile — full-width terminal |
| `mobile-09-settings.png` | Settings mobile — bottom sheet modal |

---

## State Captures

| File | Description |
|------|-------------|
| `states/today-populated.png` | Today with demo tasks and habits |
| `states/tasks-populated.png` | Tasks with demo tasks across columns |
| `states/habits-populated.png` | Habits with demo habits and streaks |
| `states/eisenhower-populated.png` | Eisenhower with tasks in quadrants |
| `states/journal-populated.png` | Journal with demo entries |
| `states/journey-populated.png` | Journey with level, XP, stats, charts |
| `states/notes-populated.png` | Notes with demo notebooks |
| `states/bakasur-chat.png` | BakaSur with conversation |
| `states/bakasur-populated.png` | BakaSur with demo data context |
| `states/settings-open.png` | Settings modal open |

**Note:** All populated states use demo mode data (localStorage guest). No real user data exposed.

---

## Capture Limitations

1. **Desktop settings modal** (`09-settings.png`): Not captured — the settings button is rendered by the authenticated InstrumentRail, which requires login. In guest mode, the app renders the landing page when navigating to protected routes. The settings modal state is captured in `states/settings-open.png` via JavaScript evaluation.

2. **Empty states**: Not captured — the demo mode seeds data, so all pages show populated states. To capture empty states, the localStorage data would need to be cleared, which risks losing demo data.

3. **Loading/error states**: Not captured — the app loads instantly in demo mode with no network latency. Error states require breaking the API endpoint.

4. **BakaSur thinking state**: Not captured — requires sending a message and capturing mid-response, which is timing-dependent.

5. **BakaSur error state**: Not captured — requires breaking the API endpoint to trigger error handling.

---

## Files Created

```
docs/visual-qa/final/
├── README.md              (this file)
├── 01-today.png           (241 KB)
├── 02-tasks.png           (1269 KB)
├── 03-habits.png          (283 KB)
├── 04-eisenhower.png      (280 KB)
├── 05-journal.png         (269 KB)
├── 06-journey.png         (272 KB)
├── 07-notes.png           (239 KB)
├── 08-bakasur.png         (240 KB)
├── 10-landing.png         (1051 KB)
├── mobile-01-today.png    (124 KB)
├── mobile-02-tasks.png    (128 KB)
├── mobile-03-habits.png   (125 KB)
├── mobile-04-eisenhower.png (126 KB)
├── mobile-05-journal.png  (125 KB)
├── mobile-06-journey.png  (128 KB)
├── mobile-07-notes.png    (126 KB)
├── mobile-08-bakasur.png  (124 KB)
├── mobile-09-settings.png (123 KB)
└── states/
    ├── bakasur-chat.png
    ├── bakasur-populated.png
    ├── eisenhower-populated.png
    ├── habits-populated.png
    ├── journal-populated.png
    ├── journey-populated.png
    ├── notes-populated.png
    ├── settings-open.png
    ├── tasks-populated.png
    └── today-populated.png
```

**Total screenshots:** 28  
**Desktop:** 9  
**Mobile:** 9  
**States:** 10
