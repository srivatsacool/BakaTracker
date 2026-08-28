# BakaTracker Final Visual Review v3

**Capture date:** 2026-08-28 02:51 IST  
**Application commit:** a83452b (docs(p3.4c): document sync conflict model)  
**Visual refinement:** Phases 1–12 + first-login onboarding + visual direction reset (v3)  

**Desktop viewport:** 1440 × 1000  
**Mobile viewport:** 390 × 844  
**Browser:** Chromium (headless, Playwright 1.62.1)  
**Auth mode:** Guest/Demo (bt_demo_mode = true)  

---

## DESKTOP

| File | Description | State |
|------|-------------|-------|
| `01-today.png` | Today — RPG Command Center | DEMO |
| `02-tasks.png` | Tasks — Quest Board with Kanban | DEMO |
| `03-habits.png` | Habits — Pixel Tracker with week strips | DEMO |
| `04-eisenhower.png` | Eisenhower — Tactical Priority Board | DEMO |
| `05-journal.png` | Journal — Daily Log | DEMO |
| `06-journey.png` | Journey — Character Progression | DEMO |
| `07-notes.png` | Notes — Knowledge Inventory | DEMO |
| `08-bakasur.png` | BakaSur — Companion Terminal with conversation | DEMO |
| `09-settings.png` | Settings — System Control modal open | DEMO |
| `10-landing.png` | Landing — LightTunnel + dark overlay | REAL |

---

## MOBILE

| File | Description | State |
|------|-------------|-------|
| `mobile-01-today.png` | Today mobile | DEMO |
| `mobile-02-tasks.png` | Tasks mobile | DEMO |
| `mobile-03-habits.png` | Habits mobile | DEMO |
| `mobile-04-eisenhower.png` | Eisenhower mobile | DEMO |
| `mobile-05-journal.png` | Journal mobile | DEMO |
| `mobile-06-journey.png` | Journey mobile | DEMO |
| `mobile-07-notes.png` | Notes mobile | DEMO |
| `mobile-09-settings.png` | Settings mobile | DEMO |

---

## STATES

| File | Description | State |
|------|-------------|-------|
| `states/today-populated.png` | Today with demo data | DEMO |
| `states/tasks-populated.png` | Tasks with demo data | DEMO |
| `states/habits-populated.png` | Habits with demo data | DEMO |
| `states/eisenhower-populated.png` | Eisenhower with demo data | DEMO |
| `states/journal-populated.png` | Journal with demo data | DEMO |
| `states/journey-populated.png` | Journey with demo data | DEMO |
| `states/notes-populated.png` | Notes with demo data | DEMO |
| `states/settings-open.png` | Settings modal open | DEMO |
| `states/bakasur-chat.png` | BakaSur with conversation | DEMO |
| `states/first-run-walkthrough.png` | FirstRunWizard boot cabinet | DEMO |

---

## SKIPPED

| Capture | Reason |
|---------|--------|
| `first-login-onboarding.png` | Requires authenticated session |
| `mobile-first-login-onboarding.png` | Requires authenticated session |

---

## TOTALS

Desktop: 10  
Mobile: 8  
States: 10  
**Total: 28 screenshots**

---

## VISUAL DIRECTION CHANGES (v3 vs v2)

Token layer:
- Reduced purple dominance (gold replaces aurora for primary button)
- Gold accent for insert-coin buttons, chips, LED indicators
- Reduced glass border opacity (0.10 → 0.06)
- Reduced app-shell-frame purple gradient (0.78 → 0.92 opacity)
- Reduced collapsed rail purple intensity
- Reduced scrollbar, caret, focus ring purple
- Reduced chip background purple

Component layer:
- DailyStatus/CharacterCard/BakaSurPage: removed purple backgrounds
- BakaSurPage avatars: gold accent instead of purple
- OnboardingChoice: gold border instead of violet
- LED indicators: gold instead of purple (earned glow)

Background:
- App-shell-frame: darker, less purple, more graphite
- Collapsed rail: reduced purple, more neutral

BakaSur:
- Default state: collapsed (52px) — already implemented in rail CSS
- Expanded state: 320px (unchanged)
- The rail was already designed as collapsible; no code change needed
