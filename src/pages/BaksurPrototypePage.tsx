/*
 * BAKATRACKER — Baksur visual prototype (V3.4.1) — dev-only fixture.
 *
 * Renders BOTH prototype directions (D Horned Mochi, A Simplified Flamehorn)
 * from the same Bloub-derived runtime, side-by-side and individually, at
 * 320/48/24/16 px, in all five required states, against the real V3.3
 * graphite canvas. `?static=1` renders deterministic frozen poses for
 * comparable screenshots.
 *
 * NOT a production surface: not linked from nav, no store/event wiring.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BaksurCharacter,
} from '../components/shell/BaksurCharacter'
import {
  BAKSUR_DIRECTIONS,
  BAKSUR_STATE_MAP,
  BAKSUR_STATES,
  BAKSUR_POSES,
} from '../components/shell/baksurShared'

const SIZES = [320, 48, 32, 24, 16] as const

/** Animated demo: cycles the five states so motion can be judged live. */
function CyclingPrototype({ direction, size }: { direction: 'mochi' | 'flamehorn'; size: number }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % BAKSUR_STATES.length), 2600)
    return () => clearInterval(t)
  }, [])
  const current = BAKSUR_STATES[i]!
  return (
    <BaksurCharacter
      direction={direction}
      state={current}
      size={size}
      ariaLabel={`Baksur cycling states, showing ${current}`}
    />
  )
}

export function BaksurPrototypePage() {
  const [params] = useSearchParams()
  const isStatic = params.get('static') === '1'

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bt-bg)', color: 'var(--bt-text)' }}>
      <header className="mb-10 max-w-4xl">
        <p
          className="text-[10px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--bt-text-muted)', fontFamily: 'var(--font-plex-mono)' }}
        >
          BAKATRACKER · V3.4.1 · VISUAL PROTOTYPE · DESIGN GATE
        </p>
        <h1 className="mt-2 text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Baksur — direction comparison
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--bt-text-dim)' }}>
          Both directions share one Bloub-derived runtime (SVG mask, measured blink/gaze/morph).
          Differences below are character design, not animation systems.
          {isStatic ? ' STATIC MODE: deterministic poses (reduced-motion equivalent).' : ''}
        </p>
      </header>

      {/* ---- Side-by-side: same state, both directions, 48px ---- */}
      <section className="mb-14">
        <h2
          className="mb-4 text-sm font-semibold uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-plex-mono)', color: 'var(--bt-text-dim)' }}
        >
          Side by side · 48px · state × direction
        </h2>
        <div className="flex flex-col gap-3">
          {BAKSUR_STATES.map((s) => (
            <div key={s} className="flex flex-wrap items-center gap-6">
              <span
                className="w-24 text-xs"
                style={{ fontFamily: 'var(--font-plex-mono)', color: 'var(--bt-text-muted)' }}
              >
                {s}
              </span>
              {BAKSUR_DIRECTIONS.map((d) => (
                <figure key={d.id} className="flex items-center gap-3">
                  <GlassCell size={72}>
                    <BaksurCharacter
                      direction={d.id}
                      state={s}
                      size={48}
                      frozenAt={isStatic ? BAKSUR_POSES[BAKSUR_STATE_MAP[s]] : undefined}
                      ariaLabel={`${d.label} in ${s} state`}
                    />
                  </GlassCell>
                  <figcaption
                    className="text-[10px]"
                    style={{ fontFamily: 'var(--font-plex-mono)', color: 'var(--bt-text-muted)' }}
                  >
                    {d.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---- Per-direction galleries at all sizes ---- */}
      {BAKSUR_DIRECTIONS.map((d) => (
        <section key={d.id} className="mb-14" data-qa-section={d.id}>
          <h2
            className="mb-4 text-sm font-semibold uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-plex-mono)', color: 'var(--bt-text-dim)' }}
          >
            {d.label}
          </h2>
          {SIZES.map((px) => (
            <div key={px} className="mb-6">
              <p
                className="mb-2 text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: 'var(--font-plex-mono)', color: 'var(--bt-text-muted)' }}
              >
                {px}px
              </p>
              <div className="flex flex-wrap items-end gap-6">
                {BAKSUR_STATES.map((s) => (
                  <figure key={s} className="flex flex-col items-center gap-2">
                    <GlassCell size={Math.max(px + 24, 40)}>
                      <BaksurCharacter
                        direction={d.id}
                        state={s}
                        size={px}
                        frozenAt={isStatic ? BAKSUR_POSES[BAKSUR_STATE_MAP[s]] : undefined}
                        ariaLabel={`${d.label} in ${s} state at ${px} pixels`}
                      />
                    </GlassCell>
                    <figcaption
                      className="text-[10px]"
                      style={{ fontFamily: 'var(--font-plex-mono)', color: 'var(--bt-text-muted)' }}
                    >
                      {s}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
          {!isStatic && (
            <div className="mt-2">
              <p
                className="mb-2 text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: 'var(--font-plex-mono)', color: 'var(--bt-text-muted)' }}
              >
                ANIMATED · cycling IDLE→THINKING→HAPPY→ALERT→SLEEP
              </p>
              <GlassCell size={140}>
                <CyclingPrototype direction={d.id} size={96} />
              </GlassCell>
            </div>
          )}
        </section>
      ))}

      <footer
        className="pb-10 text-[10px]"
        style={{ fontFamily: 'var(--font-plex-mono)', color: 'var(--bt-text-muted)' }}
      >
        Runtime: vendored Bloub src/bot subset (MIT © 2026 Jérémy Perret) — see NOTICE and
        docs/baksur/ASSET-LICENSES.md.
      </footer>
    </div>
  )
}

/** Small darkglass cell so the character is judged on the real surface treatment. */
function GlassCell({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        border: '1px solid var(--bt-border)',
        background: 'var(--bt-surface)',
      }}
    >
      {children}
    </div>
  )
}

export default BaksurPrototypePage
