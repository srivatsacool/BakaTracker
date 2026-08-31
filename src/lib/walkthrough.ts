/*
 * BAKATRACKER V3.5 — canonical walkthrough (Phase 1)
 *
 * ONE walkthrough system. Entry points:
 *   - visitor entering DEMO mode
 *   - first-time authenticated user after sign-in
 *   - Settings → Replay Walkthrough (resets status, relaunches)
 * Everything reads the same state and the same step catalog. The legacy
 * systems it replaces (intro.js tour, FirstRunWizard, OnboardingBanner,
 * OnboardingChoice) must never mount again — see their deletion in Phase 3.
 *
 * Persistence (single mechanism, device-scoped + auth-scoped like the rest
 * of the app's chrome prefs):
 *   bt_walkthrough:<scope>        → 'done' | 'skipped'   (never re-appears)
 *   bt_walkthrough_progress:<scope> → JSON { step }       (while running)
 * `skipped` and `done` both suppress future auto-launches; the distinction
 * is kept because Settings copy uses "finished" vs "skipped" honestly.
 */

export type WalkthroughStatus = 'unset' | 'running' | 'skipped' | 'done'

const STATUS_KEY = (scope: string) => `bt_walkthrough:${scope}`
const PROGRESS_KEY = (scope: string) => `bt_walkthrough_progress:${scope}`

/** Scopes are stable and environment-honest: demo/guest device state never
 *  leaks into an authenticated account's state (different key). */
export const WALKTHROUGH_SCOPE_DEMO = 'demo'
export function walkthroughScopeForUser(sub: string | undefined | null): string {
  return sub ? `auth:${sub}` : WALKTHROUGH_SCOPE_DEMO
}

export function getWalkthroughStatus(scope: string): WalkthroughStatus {
  try {
    const v = localStorage.getItem(STATUS_KEY(scope))
    if (v === 'done' || v === 'skipped') return v
    if (localStorage.getItem(PROGRESS_KEY(scope))) return 'running'
  } catch { /* storage disabled — behave as unset, app remains usable */ }
  return 'unset'
}

export function isWalkthroughPending(scope: string): boolean {
  return getWalkthroughStatus(scope) === 'unset'
}

export function setWalkthroughStatus(scope: string, status: 'skipped' | 'done'): void {
  try {
    localStorage.setItem(STATUS_KEY(scope), status)
    localStorage.removeItem(PROGRESS_KEY(scope))
  } catch { /* best effort */ }
}

export function getWalkthroughStep(scope: string): number {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(scope))
    if (raw) {
      const n = Number(JSON.parse(raw)?.step)
      if (Number.isInteger(n) && n >= 0) return n
    }
  } catch { /* fall through */ }
  return 0
}

export function setWalkthroughStep(scope: string, step: number): void {
  try {
    localStorage.setItem(PROGRESS_KEY(scope), JSON.stringify({ step }))
  } catch { /* best effort */ }
}

/** Settings → Replay: wipe status + progress so the canonical flow re-launches. */
export function resetWalkthrough(scope: string): void {
  try {
    localStorage.removeItem(STATUS_KEY(scope))
    localStorage.removeItem(PROGRESS_KEY(scope))
  } catch { /* best effort */ }
}

/* ---------------- step catalog ---------------- */

export interface WalkthroughStepDef {
  id: string
  /** Route to navigate to before resolving the target (optional). */
  route?: string
  /** CSS selector of the element to spotlight. Resolved after mount with a
   *  short retry; when it cannot be found the card centers (graceful). */
  target?: string
  title: string
  body: string
}

/**
 * The 12 beats (docs plan §4). Copy is BakaSur-voiced, concise, and honest:
 * every number matches real XP semantics (journal +10, task XP is per-task,
 * habit XP per check-in; level = floor(totalXP / xp_per_level) + 1).
 */
export const WALKTHROUGH_STEPS: WalkthroughStepDef[] = [
  {
    id: 'welcome',
    route: '/today',
    title: 'Welcome to BakaTracker',
    body: 'A personal life OS built by Build.Srivatsa. Habits, quests and journaling earn XP — XP builds a character, and the character is your consistency made visible. Twelve short stops. Skip anytime.',
  },
  {
    id: 'today',
    route: '/today',
    target: '[data-tour="priority-quest"]',
    title: 'Today — your command center',
    body: 'Only starred quests appear here, with the priority one on top. Clear the board and you clear the day. This is where every morning starts.',
  },
  {
    id: 'habits',
    route: '/habits',
    target: '[data-tour="habit-list"]',
    title: 'Habits — the engine',
    body: 'Repeat → streak → attribute XP. Each check-in feeds one of five stats. Streaks survive a bad night\'s sleep; they do not survive skipping.',
  },
  {
    id: 'quests',
    route: '/tasks',
    target: '[data-tour="task-board"]',
    title: 'Quests — the backlog of a life',
    body: 'Backlog → Todo → Doing → Done. Star anything worth doing today and it shows up on Today with its XP price attached.',
  },
  {
    id: 'journal',
    route: '/journal',
    target: '[data-tour="journal-editor"]',
    title: 'Journal — one honest sentence',
    body: 'A highlight, a mood, done. Ten XP each — deliberately cheap. Reflection is the save file; you should always be able to write it.',
  },
  {
    id: 'matrix',
    route: '/eisenhower',
    target: '[data-tour="matrix-grid"]',
    title: 'Matrix — decide before doing',
    body: 'The four quadrants: Do First, Schedule, Delegate, Delete. Unsorted work sits in the inbox until you place it.',
  },
  {
    id: 'journey',
    route: '/journey',
    target: '[data-tour="journey-heatmap"]',
    title: 'Journey — the receipts',
    body: 'Heatmap, XP over time, streaks, stat balance. Everything here is derived from the ledger — no vanity metrics, no guilt charts.',
  },
  {
    id: 'notes',
    route: '/notes',
    target: '[data-tour="notes-grid"]',
    title: 'Notes — the sketchpad',
    body: 'Visual pages for thinking. Rough ideas live here until they graduate into quests.',
  },
  {
    id: 'xp',
    route: '/today',
    target: '[data-tour="xp-hud"]',
    title: 'XP & the level line',
    body: 'Level = total XP across all five stats, divided by your per-level threshold. XP resets never — the only currency that compounds.',
  },
  {
    id: 'baksur',
    route: '/today',
    target: '#baksur-hero',
    title: 'BakaSur — the familiar',
    body: 'He watches the ledger and reacts to real events — quests cleared, streaks, level-ups. Click him to talk. He will not nag you. That is the whole personality.',
  },
  {
    id: 'settings',
    route: '/today',
    target: '[data-tour="settings-entry"]',
    title: 'Settings — tune the machine',
    body: 'BakaSur colors, motion, accent, data, sync. Replay this walkthrough from there. Everything stays on this device until you sign in.',
  },
  {
    id: 'done',
    title: 'That\'s the loop',
    body: 'Quests + habits + journal → XP → stats → character → BakaSur. Go make a boring day count.',
  },
]
