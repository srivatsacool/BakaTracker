# BAKSUR — TECHNICAL INTEGRATION (CURRENT ARCHITECTURE)

**Status:** V3.4.0 research. FACT sections are verified against the
repository at `a9dbdc0`. Nothing here is implemented; "normalized state" is
a PROPOSAL and must not be created in this phase.

---

## 1. Where Baksur attaches

### 1.1 Host surfaces (FACT)

| Surface | File | Role |
|---|---|---|
| Desktop/tablet dock + expanded rail | `src/components/shell/BakaSurRail.tsx` (503 lines) | collapsed orb (52px dock) ⇄ 320px column / tablet overlay / mobile sheet |
| Dedicated page | `src/pages/BakaSurPage.tsx` (264 lines) | `/bakasur` full-page terminal (near-duplicate of rail logic) |
| Orchestration | `src/components/shared/Layout.tsx` (228 lines) | owns `assistantCollapsedEffective`, mobile pill (`bottom-[88px] right-4`), renders `<BakaSurRail collapsed onToggle />` |
| Toggle state | `src/components/shared/layout/useRailChrome.ts` (106 lines) | 3-tier precedence: persisted `bt_assistant_collapsed` > tablet transient > editor flush |
| Mobile chrome | `src/components/shared/layout/MobileChrome.tsx` | bottom nav (pill floats above it) |
| Assistant backend | `POST /api/v1/assistant/chat` via `useApiClient()` (`src/api/`) | worker endpoint; history slice `-6`, context facts |

**PROPOSAL.** Baksur's first home is *inside* `BakaSurRail`'s collapsed
branch (desktop/tablet) and the `Layout.tsx` mobile pill (static mini
render). He is a *visual replacement for the orb*, not a new floating
component with its own layer. Click keeps calling the existing
`toggleAssistant()`.

### 1.2 State the character may observe

**FACT.** BakaSur already derives facts per route
(`BakaSurRail.tsx` — `buildRouteSuggestions`, and the `ask()` context
payload):

```
open, doneToday, overdue, habitsDone, atRiskStreaks,
level, xp, journalToday, route, route_name, date, pageId?
```

from store slices:

```ts
const { tasks, habits, habitLogs, stats, journal } = useStore(useShallow(...))
```

**FACT.** Supporting services: `calculateDailyXP` / `sumDailyXP`
(`src/services/stats/calculateDailyXP.ts`, V3.3 canonical), `isHabitCompleted`,
`calculateHabitStreak` (`src/services/habits/`), `getTodayDateString`
(`src/lib/utils.ts`), `EventLog` types (`src/types/index.ts:82-92`: only
`habit_completed | task_completed | journal_created` exist today — streak
milestones and level-ups are **derived**, not stored).

### 1.3 Minimum normalized view model (PROPOSAL — do not create yet)

A derived, read-only selector (pure function + `useMemo`), **not** a store:

```ts
interface BaksurView {
  route: string
  level: number; xp: number; xpPerLevel: number
  open: number; overdue: number; doing: boolean
  habitsDone: number; habitsActive: number; atRiskStreaks: number
  journalToday: boolean
  topStreak: number
  dailyXP: number
  levelUpJustHappened: boolean   // derived from stats.level change
  streakMilestone: number | null // derived: topStreak ∈ {7,14,30,60,100…}
  isLateNight: boolean           // derived from clock → SLEEP window
}
```

**Ownership rules (normative):**

1. Baksur consumes existing store slices read-only (`useStore(useShallow)`).
2. Baksur owns **no** application state: no new Zustand store, no Context,
   no localStorage keys, no persistence.
3. The only state Baksur may own is *presentation-local*: current visual
   state machine (IDLE/THINKING/HAPPY/ALERT/SLEEP), reaction queue, bubble
   text — all inside the character component, reset on unmount.
4. Event detection: `useEffect` comparing previous/next relevant slices
   (e.g. `tasks` done-count, `habitLogs` today-count, `journal` today-entry,
   `stats.level`). This derives QUEST_COMPLETED / HABIT_COMPLETED /
   JOURNAL_LOGGED / STREAK_MILESTONE / LEVEL_UP without touching the store's
   mutation functions. *(Alternative — an emitter inside store mutations —
   is rejected for V1: it modifies `useStore.ts`, violating minimal blast
   radius.)*

## 2. Bloub runtime: reuse vs reimplement

**FACT (Bloub audit):** `src/bot/` is framework-free, clock-free pure TS
(enforced by its architecture doc); the Vue layer is only `BloubBot.vue` +
editor UI. Rendering is one SVG `<mask>`: body path (white) + eye capsules
(black holes), `engine.sample(t) → {bodyPath, eyes[], …}`.

### 2.1 Copy verbatim into `src/lib/bloub/` (MIT; attribution required)

| Module | Bytes | Why needed |
|---|---|---|
| `math.ts` | 1.6k | easings (`easeOutQuint/Cubic`), `lerp`, `loopNoise`, `mulberry32` |
| `repere.ts` | 1.3k | `RAYON=100`, viewbox constants |
| `shape.ts` | 10.2k | `Silhouette`, `blend()`, `closedPath()`, `capsulePath()`, `radiusAtAngle()` |
| `face.ts` | 5.8k | `eyePoses`, `liveliness`, `blinkScale`, blink schedule, `REST_GAZE` |
| `expressions.ts` | 5.5k | 16 expressions incl. happy + neutral |
| `engine.ts` | 22.2k | `BotEngine.sample(t)` — the whole runtime |
| `states.ts` | 17k | state catalog → **trim to 5** (idle, thinking, wide/alert, sleep) |
| `decor.ts` | 8.7k | only the alert `!` bar/teardrop subset (trim) |

≈ 70KB raw TS (~10–12KB gzip est.), zero runtime dependencies.

### 2.2 Conditionally reuse

| Module | Condition |
|---|---|
| `skins.ts` + `eyefit.ts` | only if a non-circular body shape is chosen (Horned Mochi needs the superellipse profile + eye-offset table). Circle-only (Void Sprite) can skip both |
| `profiles.ts` | only if measured (non-analytic) shapes are wanted — not needed for the 5 chosen states |

### 2.3 Reimplement (React port)

**FACT:** `BloubBot.vue` (21.4KB, Vue SFC) cannot be imported. Port its
~core logic — `<mask>` SVG template + rAF tick + `aim()` pointer follow —
into `src/components/shell/BaksurCharacter.tsx`:

```tsx
// shape of the port (PROPOSAL)
const engine = useMemo(() => new BotEngine(RAYON, 'idle', null, NEUTRE), [])
useEffect(() => { /* rAF loop: dt-clamped clock; respects prefers-reduced-motion; pauses on visibilitychange */ }, [])
useEffect(() => { engine.setState(baksurToBloubState(view), clock) }, [view.state])
useEffect(() => { engine.setExpression(view.state === 'HAPPY' ? HAPPY : NEUTRE, clock) }, [view.state])
return <svg viewBox={VB}><mask>…bodyPath…eye capsules…</mask>…</svg>
```

Props: `view: BaksurView`, `size`, `interactive` (desktop) / `static`
(mobile pill V1). The component is presentation-only; it receives the view
model, it never reads the store itself (parent `BakaSurRail` passes it).

### 2.4 Excluded from Bloub (with reasons)

| Excluded | Reason |
|---|---|
| Vue app / editor / timeline UI | unrelated product surface |
| `cycles.ts` | montage timeline; Baksur states are imperative, not sequenced |
| `capture/anime/video/export.ts` + `mediabunny` | PNG/GIF/MP4 export; +43KB gzip for nothing we need |
| `i18n/`, `stockage.ts` (localStorage), `intro.ts` | app has its own systems; arrival script optional later |

## 3. Data flow (target architecture, PROPOSAL)

```
useStore (Zustand, existing)            ← no changes
  tasks · habits · habitLogs · journal · stats · events
        │  useStore(useShallow)  (read-only)
        ▼
deriveBaksurView()  ── pure selector (+ calculateDailyXP, streak calc)
        │  memoized
        ▼
useBaksurState()  ── hook: diff-detects events, queues reactions,
        │              cooldowns, owns visual state machine (local)
        ▼
BakaSurRail.tsx (existing)  ── passes view to…
        ▼
BaksurCharacter.tsx  ── Bloub engine + SVG render (+ bubble)
        ▼
click → toggleAssistant()  ── existing rail expansion (unchanged)
```

**Blast radius if built per plan:** new files
(`src/lib/bloub/*`, `src/components/shell/BaksurCharacter.tsx`,
`src/hooks/useBaksurState.ts`, `src/lib/baksurView.ts` — names provisional)
+ edits confined to `BakaSurRail.tsx` (collapsed branch) and `Layout.tsx`
(mobile pill glyph). No store/API/page/asset changes.

## 4. Constraints & invariants (normative)

1. No changes to `useStore.ts`, `stateService.ts`, worker/API, or sync.
2. Event derivation is side-effect free; it never writes back to the store.
3. Guest/demo parity: in guest mode Baksur still animates (visual state
   only) but never speaks ambient lines (PERSONALITY silence rules) — demo
   replies remain inside the assistant as today.
4. The character never gates or blocks content; failure to init = invisible.
5. Bundle guard: no new dependency in package.json; the Bloub code is
   vendored with license header; tree-shaken to the 5-state subset.
6. All motion honors `prefers-reduced-motion` (static frame swap).
