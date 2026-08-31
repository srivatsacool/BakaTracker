/*
 * BAKATRACKER — Baksur reaction mapping board (V3.4.3) — dev-only fixture.
 *
 * Renders each REQUIRED signal through the single source of truth
 * (REACTION_VISUAL) using the SAME approved character runtime as production:
 * pose/expression shown here is exactly what the dock plays. Real end-to-end
 * reaction firing is validated on the live shell (real mutations → store
 * events → watcher) — this page only displays the visual mapping contract.
 *
 * NOT a production surface (hidden route, unlinked from nav).
 */
import { BaksurCharacter } from '../components/shell/BaksurCharacter'
import { REACTION_VISUAL, type BaksurSignal } from '../components/shell/baksurReactions'
import type { BaksurDirection } from '../components/shell/baksurShared'

const SIGNALS: BaksurSignal[] = [
  'QUEST_COMPLETED',
  'HABIT_COMPLETED',
  'JOURNAL_LOGGED',
  'STREAK_MILESTONE',
  'LEVEL_UP',
  'USER_OPENED_BAKSUR',
]

/** State-local date where each pose reads best (POSES convention). */
const FRAME: Record<BaksurSignal, number> = {
  QUEST_COMPLETED: 1,
  HABIT_COMPLETED: 1,
  JOURNAL_LOGGED: 1,
  STREAK_MILESTONE: 0.8,
  LEVEL_UP: 0.8,
  USER_OPENED_BAKSUR: 1,
}

export function BaksurReactionFixturePage() {
  const direction: BaksurDirection = 'flamehorn'
  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bt-bg)', color: 'var(--bt-text)' }}>
      <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--bt-text-muted)', fontFamily: 'var(--font-plex-mono)' }}>
        BAKATRACKER · V3.4.3 · REACTION MAPPING BOARD · DEV FIXTURE
      </p>
      <h1 className="mt-2 text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Baksur reactions — visual contract</h1>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--bt-text-dim)' }}>
        Each cell is REACTION_VISUAL[signal] rendered by the production character runtime —
        identical pose and resting expression to what the dock plays. Escalation is in hold
        time and pose only; no particles, no effects.
      </p>
      <div className="mt-8 flex flex-wrap gap-6">
        {SIGNALS.map(sig => (
          <figure key={sig} className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center rounded-xl border"
              style={{ width: 88, height: 88, borderColor: 'var(--bt-border)', background: 'var(--bt-surface)' }}
            >
              <BaksurCharacter
                direction={direction}
                state={REACTION_VISUAL[sig].state}
                size={48}
                frozenAt={FRAME[sig]}
                restExpression={REACTION_VISUAL[sig].expression}
                ariaLabel={`${sig} reaction pose`}
              />
            </div>
            <figcaption
              className="text-center font-mono text-[9px] leading-relaxed"
              style={{ color: 'var(--bt-text-muted)' }}
            >
              {sig}
              <br />
              {REACTION_VISUAL[sig].state}/{REACTION_VISUAL[sig].expression} · {REACTION_VISUAL[sig].ms}ms
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

export default BaksurReactionFixturePage
