# BakaTracker Final Visual Review v2

**Capture date:** 2026-08-28 01:59 IST  
**Application commit:** a83452b (docs(p3.4c): document sync conflict model)  
**Visual refinement phases:** 1–12 complete + first-login onboarding  

**Desktop viewport:** 1440 × 1000  
**Mobile viewport:** 390 × 844  
**Device scale:** 1  
**Browser:** Chromium (headless, Playwright 1.62.1)  
**Auth mode:** Guest/Demo (bt_demo_mode = true, no backend)  

---

## DESKTOP

| File | Description | State |
|------|-------------|-------|
| `01-today.png` | Today — RPG Command Center with DailyStatus HUD, task kanban, cockpit modules | DEMO |
| `02-tasks.png` | Tasks — Quest Board with 4-column Kanban, QuestBoardHUD, task cards across columns | DEMO |
| `03-habits.png` | Habits — Pixel Tracker with HabitTrackerHUD, WeekStrip, stat bars, multiple habits | DEMO |
| `04-eisenhower.png` | Eisenhower — Tactical Priority Board with 4 quadrants, tasks distributed | DEMO |
| `05-journal.png` | Journal — Daily Log with JournalMoodSelector, mood trail, calendar | DEMO |
| `06-journey.png` | Journey — Character Progression with CharacterCard, StatBar, heatmap, Recharts charts | DEMO |
| `07-notes.png` | Notes — Knowledge Inventory with notebook hierarchy, demo notebooks | DEMO |
| `08-bakasur.png` | BakaSur — Companion Terminal with conversation (user message + assistant response), suggested prompts | DEMO |
| `09-settings.png` | Settings — System Control modal open, Account/Appearance/Notifications/Data sections | DEMO |
| `10-landing.png` | Landing — LightTunnel world + dark overlay, public page without auth shell | REAL |

---

## MOBILE

| File | Description | State |
|------|-------------|-------|
| `mobile-01-today.png` | Today mobile — stacked sections, mobile chrome, daily board | DEMO |
| `mobile-02-tasks.png` | Tasks mobile — column tabs, touch-friendly cards | DEMO |
| `mobile-03-habits.png` | Habits mobile — habit rows stacked, week strip | DEMO |
| `mobile-04-eisenhower.png` | Eisenhower mobile — stacked quadrants | DEMO |
| `mobile-05-journal.png` | Journal mobile — calendar + entry form | DEMO |
| `mobile-06-journey.png` | Journey mobile — character card + stats stacked | DEMO |
| `mobile-07-notes.png` | Notes mobile — notebook list | DEMO |
| `mobile-08-bakasur.png` | BakaSur mobile — full-width terminal | DEMO |
| `mobile-09-settings.png` | Settings mobile — bottom sheet modal open | DEMO |

---

## STATES

| File | Description | State |
|------|-------------|-------|
| `states/today-populated.png` | Today with demo tasks and habits | DEMO |
| `states/tasks-populated.png` | Tasks with demo tasks across columns | DEMO |
| `states/habits-populated.png` | Habits with demo habits, streaks, week strips | DEMO |
| `states/eisenhower-populated.png` | Eisenhower with tasks in quadrants | DEMO |
| `states/journal-populated.png` | Journal with demo entries and mood trail | DEMO |
| `states/journey-populated.png` | Journey with level, XP, stats, charts, heatmap | DEMO |
| `states/notes-populated.png` | Notes with demo notebooks | DEMO |
| `states/settings-open.png` | Settings modal open with all sections visible | DEMO |
| `states/bakasur-chat.png` | BakaSur with user question + assistant response | DEMO |
| `states/first-run-walkthrough.png` | FirstRunWizard boot cabinet (welcome step) | DEMO |

---

## SKIPPED CAPTURES

| Capture | Reason |
|---------|--------|
| `first-login-onboarding.png` | Requires authenticated session (Google OAuth). Guest mode bypasses onboarding entirely. Onboarding logic is user-scoped (`bt_onboarding:<userId>`) and only triggers for authenticated first-time users. |
| `mobile-first-login-onboarding.png` | Same reason as above — requires authenticated session. |
| `bakasur-error.png` | Requires breaking the API endpoint to trigger error handling. Unsafe to reproduce without code modification. |
| `today-empty.png` | Demo mode seeds data on guest visit. Empty state requires clearing localStorage, which would destroy demo data. |
| `tasks-empty.png` | Same as above — demo mode seeds tasks. |
| `habits-empty.png` | Same — demo mode seeds habits. |
| `journal-empty.png` | Same — demo mode seeds journal. |
| `notes-empty.png` | Notes require backend API (401 in guest mode). No data to clear. |
| `eisenhower-empty.png` | Same — demo mode seeds tasks that populate quadrants. |

---

## CAPTURED FILES

```
docs/visual-qa/final-v2/
├── README.md
├── 01-today.png              (647 KB)
├── 02-tasks.png              (577 KB)
├── 03-habits.png             (606 KB)
├── 04-eisenhower.png         (571 KB)
├── 05-journal.png            (591 KB)
├── 06-journey.png            (575 KB)
├── 07-notes.png              (663 KB)
├── 08-bakasur.png            (606 KB)
├── 09-settings.png           (252 KB)
├── 10-landing.png            (1065 KB)
├── mobile-01-today.png       (129 KB)
├── mobile-02-tasks.png       (124 KB)
├── mobile-03-habits.png      (116 KB)
├── mobile-04-eisenhower.png  (116 KB)
├── mobile-05-journal.png     (110 KB)
├── mobile-06-journey.png     (121 KB)
├── mobile-07-notes.png       (118 KB)
├── mobile-08-bakasur.png     (110 KB)
├── mobile-09-settings.png    (86 KB)
└── states/
    ├── bakasur-chat.png      (614 KB)
    ├── eisenhower-populated.png (571 KB)
    ├── first-run-walkthrough.png (243 KB)
    ├── habits-populated.png  (604 KB)
    ├── journal-populated.png (590 KB)
    ├── journey-populated.png (586 KB)
    ├── notes-populated.png   (668 KB)
    ├── settings-open.png     (252 KB)
    ├── tasks-populated.png   (577 KB)
    └── today-populated.png   (650 KB)
```

**Total screenshots:** 29  
**Desktop:** 10  
**Mobile:** 9  
**States:** 10
