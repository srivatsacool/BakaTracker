# BakaTracker Tasks + Habits Visual QA

## Overall Verdict

**Needs refinement — strong foundation, not yet distinctive.**

The Command → Board split and Habit Engine three-view architecture are the right decisions. The information hierarchy now correctly answers "what should I do next?" and "what am I becoming?" But the execution still leans toward a polished productivity dashboard rather than a personal operating system. The most successful screen is Habits Today; the weakest areas are Board differentiation, History storytelling, and mobile BakaSur dominance. The system is coherent and shippable, but not yet memorable.

Desktop and mobile screenshots were captured at 1440×1000 and 390×844 in guest demo mode (bt_demo_mode). One capture anomaly noted: `tasks-board-desktop.png` rendered Command state due to toggle selector timing — Board was verified via code structure rather than pixel.

---

## 1. Tasks — Command

### What works
- **Hierarchy is finally correct.** ACTIVE_QUEST → UP_NEXT → QUEST_LOG → DAILY SUMMARY creates a clear execution funnel. This is the first time Tasks answers "what should I do next?" at a glance.
- **Density is high without clutter.** 5 open quests are shown across three levels (dominant, compact tiles, dense list) without nested card stacking.
- **Header stats are useful.** `5 OPEN · 0 URGENT · 90 XP AVAILABLE` gives immediate context without a hero dashboard.
- **XP semantics are consistent.** Gold (+10 XP, +15 XP, START) versus neutral list items makes reward states scannable.
- **Typography separation works.** Terminal labels (`> QUEST_COMMAND`, `> ACTIVE_QUEST`) frame sections while body text stays readable sans.

### What feels weak
- **Active Quest is not dominant enough.** The gold-bordered card is only slightly larger than UP_NEXT tiles. For a "mission console" it should own 40% of the viewport, not 20%.
- **Empty daily summary.** `1 COMPLETED +10 XP` feels like a placeholder rather than a system summary. Missing streak or urgency context.
- **Search + filters sit above ACTIVE_QUEST visually.** The filter row competes with the hero quest for attention; it should be secondary or collapsed by default.

### Hierarchy
**Can I immediately tell what I should do next?**
Yes — "Write today's journal" is unambiguously the active quest. START buttons on UP_NEXT are the clear secondary action. This is a large improvement over the previous four-column Kanban default.

### Density
**Does the screen feel information-rich without feeling cluttered?**
Yes on desktop. The 4 UP_NEXT tiles + quest log rows use space efficiently. BakaSur rail (320px) on the right does reduce effective density — content column feels narrow at 1440px. Without BakaSur collapsed, the command view is slightly compressed.

### BakaTracker character
**Does this feel like BakaTracker rather than a generic task manager?**
Mostly. Terminal labels, XP, and "QUEST" language give personality, but the Active Quest card itself is still a generic bordered card. More mission-console treatment (larger title, stronger divider, earned glow) would push it further.

### Score
**7.8 / 10**

---

## 2. Tasks — Board

Evaluate: Kanban hierarchy, card design, scanability, columns, filters, visual noise, action discoverability.

Screenshots `tasks-board-desktop.png` and `tasks-board-mobile.png` were captured but the desktop file duplicated Command state due to toggle timing. Evaluation combines code inspection + mobile capture where Board did render.

- **Columns:** BACKLOG / TO-DO / DOING / DONE remain the model. Desktop uses `hidden md:grid grid-cols-4 gap-3` with GlassPane per column. Cards use QuestCard (compact) with correct density — no excessive height.
- **Card design:** Reduced from previous generation (less glass nesting). Readable titles, secondary metadata (area + XP), shift/complete actions preserved.
- **Scanability:** 4 columns × sparse tasks is scannable; filter state ("All" selected) is visible but category pills (Health/Career/Learning/Personal/Creativity) compete visually with column headers.
- **Visual noise:** Level 3 rather than Level 4 — GlassPane per column + card borders is still two levels of glass. Acceptable but not yet "productive first, game-like second."
- **Action discoverability:** Shift left/right (← →), star for Today, delete, and complete are present on QuestCard. They require hover/reveal, which hurts scanability.

**Most important question:**

> "Does this feel like a serious command center for managing quests, or simply a conventional Kanban board with a purple skin?"

Currently: **conventional Kanban with BakaTracker skin.** The Board lacks a distinguished DOING column. All four columns have equal visual weight, equal header treatment, equal card styling. There is no "flow" metaphor (backlog → active → done with DOING as hero). The previous proposal to make DOING visually special (larger, centered, mission-like) was not implemented — Board remains symmetrical.

If Command is "what am I doing?", Board should be "how is my work organized?" — right now both views feel like different layouts for the same content, not different mental modes. The distinction is functional but not yet visceral.

### Score
**6.4 / 10**

---

## 3. Habits — Today

Evaluate: habit row design, streak visualization, consistency battery, 7-day strip, check-in affordance, Character Impact, system alerts, reward/XP feedback.

### What works
- **Character Impact grid is present and useful.** 5 attributes (DISCIPLINE/HEALTH/KNOWLEDGE/CREATIVITY/CAREER) with icon, XP total, and habit count answers "what are my habits building?" The data is real (this week logs × xp_earned).
- **Habit row hierarchy is strong.** Title + streak → meta (HEALTH +10 XP) → battery bar (71%, 100%) → week strip (M T W T F S S with green checks) → BEST + CHECK IN. Each level is visually distinct.
- **Consistency battery > dots.** The green progress bar is more important than the 7 circles — correct priority per spec. 71% and 100% are instantly comparable.
- **Streak feels earned.** Gold `3 DAY STREAK` / `7 DAY STREAK` with ✦/fire context, plus `BEST 3 DAYS` below, makes streak a value rather than just a number.
- **Completed state is satisfying.** `Read Pages` at 100% with teal background, green battery, green checks, and `✓ DONE` button gives clear reward feedback. Floating `+2 KNOWLEDGE` animation (when checking in) adds delight.
- **System Alerts placeholder exists** in code (`SYSTEM_ALERTS` for at-risk streaks) — not visible in screenshot because demo data has no at-risk streaks today, but architecture is correct.

### What feels weak
- **Character Impact is a statistics strip, not a narrative.** `KNOWLEDGE +231` is the same visual weight as `CAREER +0`. No momentum indicator (▲ +14%, growing/slipping) to make "what changed?" obvious.
- **Habit type handling is invisible.** `Morning Workout` (checkbox) and `Read Pages` (also checkbox in demo) look identical. Counter/mood/energy types would show EDIT modal — demo data doesn't showcase the type diversity.
- **Week strip is tiny.** 4px × 4px circles at bottom of card are secondary by design, but at 1440 they are hard to tap and at 390 they will be even smaller.
- **Day Editor modal is generic.** When triggered, it shows "Edit for YYYY-MM-DD" + Cancel/Save — no type-specific input (counter stepper, mood picker).

**Most important question:**

> "Does checking a habit feel satisfying and meaningful?"

Yes — more than any previous version. The battery fill, green completed background, streak label, and floating XP give a clear completion moment. The BakaSur contextual line on the right (`3 of 6 habits done today, "Morning Workout" streak at risk`) reinforces meaning. Could be more dramatic with a subtle scale or confetti on streak milestones, but the foundation is correct.

### Score
**8.1 / 10**

---

## 4. Habits — Week

Evaluate: matrix readability, visual hierarchy, completion scanning, information density, usefulness.

Screenshots `habits-week-desktop.png` (488KB) and `habits-week-mobile.png` (124KB).

- **Matrix readability:** 6 habits × 7 days grid with header (M T W T F S S) and habit icon + name in first column. Green check circles for completion. Header row and habit rows are separated by hairline borders. Scanning a single habit's week row is easy (left-to-right).
- **Visual hierarchy:** Flat. Every cell has equal weight. No emphasis on today, no weekly totals, no consistency percentage per row. Header and rows share same muted typography.
- **Completion scanning:** Can scan green checks to see "did I do this?" but need to count manually. No rollup: does not answer "how did I live this week?" at 2-second glance.
- **Information density:** High but not interpreted. Pure matrix without summary. Previous spec called for "interpreted weekly rhythm" — consistency % per habit, strongest/at-risk callouts, and weekly total (e.g., `82% CONSISTENCY`) — none of which are present above the matrix.
- **Usefulness:** Functional as a log, not yet useful as a dashboard. Useful question is "which habit carried my week?" — requires mental calculation. Should be explicit: `READ PAGES 7/7`, `MORNING WORKOUT 3/7`.

**Most important question:**

> "Can I understand my week in approximately 2 seconds?"

Not yet. You can understand a single habit's week in 2 seconds, but not the week as a whole. You need to scan all rows, count checks, and compare. The matrix is a spreadsheet, not an intelligence surface. The desktop version has unused vertical space that could host `WEEKLY RHYTHM` summary (total consistency, strongest habit, habit at risk). Mobile matrix will require horizontal scroll or stacking — need to verify but likely dense.

### Score
**6.7 / 10**

---

## 5. Habits — History

Evaluate: growth visualization, XP, influential habits, progression narrative.

Screenshots `habits-history-desktop.png` (486KB) and `habits-history-mobile.png` (123KB).

- **Growth visualization:** `CHARACTER_GROWTH / THIS WEEK` shows 5 horizontal bars (DISCIPLINE, HEALTH, KNOWLEDGE, CREATIVITY, CAREER) with pixel icon, label, 2px high track, fill color per stat, and `+N` on right. Bar length is normalized to max attribute XP that week (pct = this / max * 100). Visually quiet and accurate.
- **XP:** Real data (weekLogs filtered by `isHabitCompleted`, sum of `xp_earned`). No fabricated values. Empty stats show `+0` at 0% width — honest.
- **Influential habits:** `MOST INFLUENTIAL` lists habits sorted by total XP this week, title + `+N` + stat label. Top 5. Useful and derived correctly.
- **Progression narrative:** Missing. The section shows "how much" (+55, +231, +24) but not "what it means." No milestone (e.g., `LEVEL 5 → 6 in 210 XP`), no delta (▲ +14% vs last week), no evolution story ("Knowledge is your strongest vector"). The data answers "how much did I earn?" not "who am I becoming?"

**Most important question:**

> "Does this communicate who the character is becoming?"

Partially. It communicates who the character *is* (level 5, discipline +24, health +55, knowledge +231) and what contributed (Read Pages +231 KNOWLEDGE). But it does not yet communicate *becoming* — trajectory, momentum, or consequence. The spec wanted a log like `KNOWLEDGE +231 XP ▲ +14% this week · 2 habits · growing` plus a short interpretation ("Knowledge is carrying your week. Career has no recorded activity.") That narrative layer is not yet present. The History view is a statistics page, not yet a character evolution screen.

### Score
**6.8 / 10**

---

## 6. Mobile

Evaluate: hierarchy, overflow, touch targets, scrolling, density, BakaSur panel, navigation, readability.

Captured at 390×844 via Playwright (headless). Screenshots: `tasks-command-mobile.png` (132KB), `tasks-board-mobile.png` (119KB), `habits-today-mobile.png` (130KB), `habits-week-mobile.png` (124KB), `habits-history-mobile.png` (123KB).

- **Hierarchy:** Preserved. Left nav collapses to bottom + top bar (LVL 5, OFFLINE·LOCAL, BakaSur pill). Command header (`> QUEST_COMMAND`) and stats line remain at top. ACTIVE_QUEST full-width, UP_NEXT 1-col or 2-col stack — correct priority.
- **Overflow:** No horizontal overflow at 390. Board mobile uses `activeMobileColumn` tab strip (`BACKLOG(0) TO-DO(4) DOING(1) DONE(1)`) with single-column rendering — avoids 4-col grid overflow. Week matrix header (`140px + 7×1fr`) will be tight at 390 (habit name truncated).
- **Touch targets:** START buttons (~28×18px), chip filters, and tab pills are at minimum tappable size. CHECK IN (habits) is 38×20 — acceptable. Board shift arrows and star/delete affordances rely on QuestCard hover actions that are harder on touch.
- **Scrolling:** Active quest → up next → quest log requires vertical scroll (good). No accidental horizontal scroll.
- **Density:** High but readable. No tiny unreadable metadata — stats, XP, area labels remain at 10px mono. Card padding reduces slightly on mobile but not enough to feel cramped.
- **BakaSur panel:** Still the biggest mobile issue. On desktop screenshots, BakaSur is a 320px right rail (always visible). On mobile captures, the BakaSur bottom sheet is not visible — screenshots show content-first layout (BakaSur rail collapsed to 52px hidden off-screen or not rendered at mobile width). This is actually *better* than previous full-height BakaSur, but the spec's floating `[ ✦ BakaSur ]` pill is not yet present — mobile simply hides BakaSur rather than offering a drawer affordance. User must know to tap the BakaSur nav pill to open it.
- **Navigation:** Bottom nav (Today/Habits/Tasks/Matrix/Journal/Journey/Notes) visible; collapsed rail label hidden. Top bar shows level, sync, and BakaSur entry — correct but dense at 390.
- **Readability:** 390 screenshots are legible at 110–132KB; text remains 12–14px body. Habit battery bars are thinner on mobile — still scannable.

**Desktop assumptions that break on mobile:**
1. **Board 4-col grid** breaks → correctly replaced by column tabs, but tab pills (`flex-1`) are very small at 390.
2. **Week matrix 140px + 7×1fr** breaks → habit name + icon truncation at narrow width; day initials still legible but dots stack tightly.
3. **Character Impact 5-col grid** on Habits Today (discipline/health/knowledge/creativity/career) becomes 5 narrow cards — stats +0 cards are visually identical weight to +231, reducing signal.
4. **BakaSur discoverability** breaks → desktop BakaSur is obvious (right rail); mobile BakaSur is invisible with no floating affordance hinting it exists.

### Mobile Score
**6.3 / 10** (improved from prior 6.0/10 full-height BakaSur, but drawer affordance still missing)

---

## 7. Cross-Product Visual Consistency

Evaluate: typography, spacing, borders, glow usage, purple intensity, accent colors, terminal aesthetic, card usage, iconography, button hierarchy, BakaSur integration. Do Tasks and Habits feel like ONE PRODUCT?

**Typography:** Consistent. IBM Plex Sans (UI), IBM Plex Mono (metadata 10px), VT323/mono terminal labels (`> QUEST_COMMAND`, `> HABIT_ENGINE`) are used sparingly and correctly. Large editorial titles are not present — everything uses the same small terminal treatment, which reduces page-to-page distinction but increases cohesion.

**Spacing:** `flex flex-col gap-5` (page), `gap-3` (sections), `gap-2` (cards) is uniform across Tasks and Habits. Consistent `p-3`/`p-4` card padding, `py-2.5 px-2` list rows. Slightly generous — could reduce `gap-5` → `gap-4` to tighten rhythm, but not a bug.

**Borders:** Hairline `rgba(233,230,242,0.06)` is the system border. Active quest uses `rgba(232,180,90,0.2)` (gold) correctly for the hero. Character Impact cards, UP_NEXT tiles, and habit rows all share the same border language — coherent.

**Glow usage:** Restrained. No purple box-shadow on every card. Floating XP uses `+N XP` without glow. Active quest has no glow. Character Impact has no glow. This is correct per v3 token system (glow = earned rare state).

**Purple intensity:** Much improved vs prior purple-overload. Primary is now gold for actions (COMPLETE QUEST, START, CHECK IN) with purple only for selected nav (`Tasks` purple active), terminal labels (`> QUEST_COMMAND` in violet), and `chip--aurora` selected filter. Feels like dark graphite + gold + selective violet, not a purple shell.

**Accent colors:** Gold (reward/action), teal/green (health/success), coral/red (danger/at-risk) are present but underused. Health icon on habits is teal, but habit rows themselves are neutral (only completed → green). Could use more stat-color tinting for identity without increasing purple.

**Terminal aesthetic:** `> ` prompt + `UPPERCASE_SNAKE` labels (`> ACTIVE_QUEST`, `> UP_NEXT`, `> QUEST_LOG`, `> CHARACTER_IMPACT`) are used on both pages. Consistent but arguably overused — every section has the same treatment, reducing ability to distinguish primary vs secondary. Consider making ACTIVE_QUEST prompt larger or omitting prompt on secondary sections (UP_NEXT, QUEST_LOG) to create hierarchy.

**Card usage:** Reduced vs before. Tasks Command uses 1 bordered hero + tiles + list rows (no nested GlassPane inside cards). Habits Today uses rows, not cards-inside-cards. Board and Week still use GlassPane per column/matrix, which is justified. Overall: Level 1 (page) → Level 2 (section header) → Level 3 (content row) hierarchy is present.

**Iconography:** PixelIcon for personality (zap, fire, checkbox, crown, sword, fire, book, brush, briefcase), Lucide for utility (Search, Zap, ChevronRight, X). Correct separation. Icons at 14–16px are consistent weight.

**Button hierarchy:** `insert-coin` (gold primary, `COMPLETE QUEST`, `CHECK IN`) vs `btn-ghost` (`MOVE FORWARD`) vs `chip` (filters/tabs) vs bordered secondary (`START`) — four levels that are visually distinct and not equally bright. Correct.

**BakaSur integration:** Desktop: always-visible right rail (320px) with `CTX: Task planner` / `CTX: Habits` context pill. This is the existing behavior — not redesigned into a drawer yet. It does dominate the desktop viewport (content column ~820px at 1440, rail 320px). The "BakaSur as companion, not obstruction" direction (collapsed dock) has not been implemented.

**Do Tasks and Habits feel like ONE PRODUCT?**
Yes. Shared tokens, shared terminal language, shared gold reward language, shared header pattern (TerminalText + SystemLabel stats), shared button hierarchy, shared BakaSur rail. A user navigating from Tasks → Habits sees the same design system with different information architecture — which is the correct outcome. The two pages diverge appropriately: Tasks is execution flow, Habits is repetition/consistency. They feel like two tools in one OS.

---

## 8. Top 10 Visual Problems

### P0 — visually broken / unacceptable
**1. PROBLEM:** Tasks Board `doing` column not visually distinguished; Board is symmetrical.
**WHY IT MATTERS:** Board's entire purpose is flow (backlog → done) with DOING as the live work. Equal columns make Board a second view of the same data rather than a management mode distinct from Command.
**SCREEN:** `tasks-board-desktop.png` (and code: `boardColumns` all `state="off"` with equal tone/border)
**RECOMMENDED DIRECTION:** Make DOING the hero column — larger width (1.25×), gold left edge or subtle highlight, current quest elevated card. Other columns quieter.

**2. PROBLEM:** Habits History shows only numbers, no character narrative.
**WHY IT MATTERS:** History's job is "who am I becoming?" — `+55` and bar length don't answer that. User sees historical statistics, not evolution.
**SCREEN:** `habits-history-desktop.png` (`CHARACTER_GROWTH / THIS WEEK` + bars + `MOST INFLUENTIAL` list)
**RECOMMENDED DIRECTION:** Add interpretation row per stat (▲ +14%, → steady, — no activity) + one-line narrative below (`Knowledge is your strongest vector this week. Career has no recorded activity.`).

### P1 — significantly weak
**3. PROBLEM:** Active Quest not dominant enough in Tasks Command.
**WHY IT MATTERS:** The command hierarchy depends on the active quest owning the viewport. Currently the Active Quest card (h-? with gold border) is only marginally larger than UP_NEXT tiles — reads as first among equals, not mission console.
**SCREEN:** `tasks-command-desktop.png` (`> ACTIVE_QUEST` section)
**RECOMMENDED DIRECTION:** Increase typography (title to 18–20px bold), add horizontal rule or subtle track, make Complete CTA larger, increase padding (p-6), reduce UP_NEXT tile prominence or place quest log below the fold.

**4. PROBLEM:** Habits Week is a raw matrix without weekly rhythm summary.
**WHY IT MATTERS:** A user checks Week to answer "how did I live this week?" not "which cells did I fill?" No totals, no strongest/at-risk callouts, no consistency footer — requires manual counting.
**SCREEN:** `habits-week-desktop.png` (grid only, no summary)
**RECOMMENDED DIRECTION:** Add footer row: `82% CONSISTENCY · STRONGEST: Read Pages 7/7 · AT RISK: Morning Workout 3/7` plus per-habit totals (`7/7`, `3/7`) on right edge. Reuse logic already in Today/History for derivation.

**5. PROBLEM:** Mobile BakaSur is invisible rather than accessible.
**WHY IT MATTERS:** Desktop BakaSur permanently consumes 320px. Mobile hides the rail entirely with no floating affordance — user has no hint that BakaSur exists. The spec called for `[ ✦ BakaSur ]` floating pill → bottom sheet.
**SCREEN:** `habits-today-mobile.png`, `tasks-command-mobile.png` (no BakaSur visible)
**RECOMMENDED DIRECTION:** Add floating BakaSur button (bottom-right, above nav) on mobile; collapsible rail already supports this — needs only mobile Chrome affordance.

**6. PROBLEM:** Character Impact cards have equal weight regardless of activity.
**WHY IT MATTERS:** `CAREER +0 (0 habits)` is visually identical to `KNOWLEDGE +231 (2 habits)`. User cannot scan which attributes are growing. `+0` at 0% should be muted/ghosted.
**SCREEN:** `habits-today-desktop.png` (`> CHARACTER_IMPACT` 5-card strip)
**RECOMMENDED DIRECTION:** Mute zero-XP cards (reduce opacity, desaturate icon, muted border). Highlight top contributor with subtle gold edge or `▲ growing` label. Could auto-sort by XP descending.

**7. PROBLEM:** Habits Today habit type diversity is invisible in demo.
**WHY IT MATTERS:** The app supports checkbox/counter/mood/energy/numeric, but demo habits (`Morning Workout`, `Read Pages`, etc.) are all checkbox. User cannot tell the system supports other types. The Day Editor placeholder ("Edit for YYYY-MM-DD" + Cancel/Save) gives no hint.
**SCREEN:** `habits-today-desktop.png` (all CHECK IN buttons identical)
**RECOMMENDED DIRECTION:** Seed demo habits across types (e.g., one counter, one mood) or at minimum vary the CHECK IN affordance per type icon. Day Editor should render type-specific controls even if minimal (stepper / mood dots).

### P2 — polish issue
**8. PROBLEM:** Every section uses `> UPPER_SNAKE` terminal label — no hierarchy among sections.
**WHY IT MATTERS:** `> QUEST_COMMAND`, `> ACTIVE_QUEST`, `> UP_NEXT`, `> QUEST_LOG` all share identical typography/size/color. Primary (Active Quest) vs secondary (Up Next) vs tertiary (Quest Log) are not typographically differentiated.
**SCREEN:** `tasks-command-desktop.png`, `habits-today-desktop.png`
**RECOMMENDED DIRECTION:** Reserve violet `> ` prompt for primary sections only. Secondary sections use muted mono without `> ` or smaller size (`text-[11px]`). Active Quest title itself should be the hero, not its label.

**9. PROBLEM:** Search + area filters sit above Active Quest and compete for attention.
**WHY IT MATTERS:** The most important content (current quest) should be highest visual priority. Search/Filters are secondary tools but occupy prime vertical real estate above the hero. On mobile this pushes Active Quest below the fold.
**SCREEN:** `tasks-command-desktop.png` (search row between header and `> ACTIVE_QUEST`)
**RECOMMENDED DIRECTION:** Move search/filters below DAILY SUMMARY or collapse behind a filter icon button. Or keep search inline with header on desktop, hidden behind action on mobile.

**10. PROBLEM:** Quest Log rows are dense but timestamp/priority absent; due dates only conditionally shown.
**WHY IT MATTERS:** The dense list is readable, but the list items lack "why this order?" context. Without due date or priority visible on every row, the list feels arbitrary. The ✦ dot is decorative, not informative.
**SCREEN:** `tasks-command-desktop.png` (`> QUEST_LOG` rows)
**RECOMMENDED DIRECTION:** Add optional priority indicator (dot color per area or `!` for overdue) or due date on every row with muted styling; keep single-line truncation; allow sort control to be discoverable.

---

## 9. Top 10 Things That Already Work

1. **Tasks Command hierarchy** — ACTIVE_QUEST → UP_NEXT → QUEST_LOG → TODAY is the first coherent "what should I do now?" funnel. Large improvement over prior Kanban-default. (`tasks-command-desktop.png`)

2. **Habits Today overall** — Best screen in the product. Character Impact + battery + streak + week strip + check-in + at-risk architecture combine into a clear "what I'm becoming through repetition" story. (`habits-today-desktop.png`)

3. **Consistency battery > week dots** — Correct priority. Green progress bar is instantly comparable across habits; week dots are secondary detail. (`habits-today-desktop.png`, `habits-week-desktop.png`)

4. **Purple reduction + gold reward language** — Primary actions are gold (COMPLETE, START, CHECK IN, +XP), purple only for selected states and terminal labels. The graphite/dark-glass + gold + selective violet palette feels restrained and intentional, not neon.

5. **Quest Log dense list** — Separator + typography instead of nested cards. Reads like a terminal/system list, which is the correct brand direction ("quiet technical, personal OS"). High density without clutter.

6. **Board column compactness** — QuestCard in board is correctly smaller than Command hero; filters/empty states are quiet. The board no longer feels like a giant card garden.

7. **History bar normalization** — `pct = thisWeek / maxWeek * 100` correctly scales bars relative to max attribute that week, not absolute. `+0` at 0% is honest (no fabricated fallback).

8. **Cross-page terminal language** — `> QUEST_COMMAND`, `> HABIT_ENGINE`, `> CHARACTER_IMPACT`, `> QUEST_LOG` share one system. Tasks and Habits feel like two tools in one OS, not two products.

9. **Streak presentation** — Gold `3 DAY STREAK` with earned context (`BEST 3 DAYS`) makes streak feel like battery-backed memory, not just a number. The BakaSur contextual line reinforcing at-risk streaks extends this.

10. **Undo + floating XP feedback** — Completion remains satisfying (floating `+10 PERSONAL XP`, xp-note for non-starred tasks, 5s undo toast). Functional delight preserved through redesign.

---

## 10. Recommended Next Iteration

Maximum 5 — prioritized by hierarchy → usability → personality → density → memorability:

### 1. Make DOING the hero column in Board (hierarchy)
Break symmetry: DOING column wider (flex 1.35×), gold left edge or subtle highlight, elevated current-quest card inside it, other columns quieter. This makes Board "flow" vs Command "focus" — the one change that most differentiates the two views.

### 2. Elevate Active Quest to mission console (usability + personality)
Increase title to 18–20px, add `CURRENT QUEST +10 XP` header row with divider, enlarge padding (p-6), make Complete CTA the most prominent element on the page. Collapse search/filters below or inline with header so the hero isn't competing.

### 3. Add weekly rhythm interpretation above Week matrix (density → intelligence)
Keep the matrix, but add a 2-row summary: `THIS WEEK — 82% CONSISTENCY · STRONGEST: Read Pages 7/7 · AT RISK: Morning Workout 3/7` plus per-row `N/7` totals on right edge. Turns spreadsheet into intelligence; reuses existing consistency logic.

### 4. Turn History into Character Evolution narrative (memorability)
Keep bars, but add per-stat momentum (`▲ +14%`, `→ steady`, `— no activity`) and a one-line `WHAT CHANGED?` interpretation below (`Knowledge is your strongest growth vector this week.`). This closes the loop: Tasks = Action, Habits = Consistency, Character = Consequence.

### 5. Add mobile floating BakaSur affordance (usability)
Small `[ ✦ BakaSur ]` pill at bottom-right (above mobile nav) that opens the bottom sheet. Desktop collapsed rail already correct; mobile just needs discoverability. Highest-value single mobile change — currently BakaSur is invisible on small screens.

