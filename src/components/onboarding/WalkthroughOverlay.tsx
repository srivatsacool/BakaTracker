import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { TerminalText, SystemLabel, PixelIcon } from '../ui';
import {
  WALKTHROUGH_STEPS, getWalkthroughStep, setWalkthroughStep, setWalkthroughStatus,
} from '../../lib/walkthrough';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface WalkthroughOverlayProps {
  scope: string
  onExit: () => void
}

interface Box { x: number; y: number; w: number; h: number }

/**
 * WalkthroughOverlay — THE canonical walkthrough (V3.5).
 *
 * One implementation for every entry point (visitor→demo, first auth run,
 * Settings → Replay). Steps are the WALKTHROUGH_STEPS catalog: each may
 * navigate to its route and spotlight a [data-tour] element. Everything is
 * deterministic; Skip/Complete persist via lib/walkthrough and nothing can
 * re-show a tour the user ended (legacy systems deleted).
 *
 * Spotlight technique: a full-viewport SVG dim layer with a rounded hole
 * (fill-rule evenodd) punched over the target + a violet ring. The ring
 * tracks resize/scroll via one rAF loop — no library, no intro.js.
 */
export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({ scope, onExit }) => {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(() => getWalkthroughStep(scope))
  const [box, setBox] = useState<Box | null>(null)
  const [closing, setClosing] = useState(false)
  const dialogRef = useFocusTrap<HTMLDivElement>(!closing, {
    onEscape: () => finish('skipped'),
  })
  const step = WALKTHROUGH_STEPS[Math.min(stepIndex, WALKTHROUGH_STEPS.length - 1)]

  const finish = useCallback((status: 'skipped' | 'done') => {
    setWalkthroughStatus(scope, status)
    setClosing(true)
    setTimeout(onExit, 150)
  }, [scope, onExit])

  // Navigate to the step's route when it changes (once per step).
  useEffect(() => {
    if (step.route) navigate(step.route)
  }, [step, navigate])

  // rAF box tracking — resolve the target after navigation/render settles.
  useLayoutEffect(() => {
    const cur = WALKTHROUGH_STEPS[stepIndex]
    let raf = 0
    let attempts = 0
    let lastRect = ''
    const track = () => {
      if (!cur.target) {
        setBox(b => (b === null ? b : null))
        raf = requestAnimationFrame(track)
        return
      }
      const el = document.querySelector(cur.target)
      if (!el) {
        // element may still be mounting after a route change — retry a while
        attempts += 1
        if (attempts < 240) raf = requestAnimationFrame(track) // ~4s
        return
      }
      const r = el.getBoundingClientRect()
      const key = `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`
      if (key !== lastRect) {
        lastRect = key
        setBox({ x: r.left, y: r.top, w: r.width, h: r.height })
      }
      raf = requestAnimationFrame(track)
    }
    raf = requestAnimationFrame(track)
    return () => cancelAnimationFrame(raf)
  }, [stepIndex])

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(next, WALKTHROUGH_STEPS.length - 1))
    setStepIndex(clamped)
    setWalkthroughStep(scope, clamped)
  }
  const isLast = stepIndex >= WALKTHROUGH_STEPS.length - 1

  // Card placement: beside the spotlight when there is room, else bottom-center.
  const cardStyle: React.CSSProperties = box && box.w > 40
    ? (box.y > 200
        ? { position: 'fixed', left: Math.max(16, Math.min(box.x, window.innerWidth - 416)), top: box.y + box.h + 12 }
        : { position: 'fixed', right: Math.max(16, window.innerWidth - box.x - box.w), top: (box.y + box.h) + 12 })
    : { position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 24 }

  const pad = 6
  return (
    <>
      {/* Dim + spotlight hole (non-interactive layer under the card). */}
      <svg className="fixed inset-0 w-full h-full" style={{ zIndex: 2050 }} aria-hidden="true">
        <rect width="100%" height="100%" fill="rgba(4,3,10,0.72)" />
        {box && box.w > 40 && (
          <rect
            x={box.x - pad} y={box.y - pad} width={box.w + pad * 2} height={box.h + pad * 2}
            rx={14} fill="rgba(4,3,10,0)" stroke="rgba(139,92,246,0.85)" strokeWidth={2}
            style={{ filter: 'drop-shadow(0 0 14px rgba(139,92,246,0.35))' }}
          />
        )}
      </svg>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Walkthrough step ${stepIndex + 1} of ${WALKTHROUGH_STEPS.length}: ${step.title}`}
        tabIndex={-1}
        className={`glass-strong w-[min(92vw,400px)] flex flex-col gap-3 p-5 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ ...cardStyle, zIndex: 2100, color: 'var(--bt-text)' }}
      >
        <div className="flex items-center gap-2">
          <PixelIcon name="sparkles" size={14} color="var(--bt-primary-bright)" />
          <TerminalText tone="primary">WALKTHROUGH</TerminalText>
          <SystemLabel tone="muted" className="ml-auto">{String(stepIndex + 1).padStart(2, '0')} / {String(WALKTHROUGH_STEPS.length).padStart(2, '0')}</SystemLabel>
          <button type="button" onClick={() => finish('skipped')} className="icon-button icon-button-small" aria-label="Skip walkthrough" title="Skip walkthrough">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* progress track */}
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(233,230,242,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / WALKTHROUGH_STEPS.length) * 100}%`, background: 'var(--bt-primary)' }}
          />
        </div>

        <h2 className="marquee-title text-lg m-0" style={{ color: 'var(--bt-text)' }}>{step.title}</h2>
        <p className="font-mono text-xs leading-relaxed m-0" style={{ color: 'var(--bt-text-muted)' }}>{step.body}</p>

        <div className="flex gap-2 mt-1">
          {stepIndex > 0 && (
            <button type="button" onClick={() => go(stepIndex - 1)} className="btn-ghost !text-xs">
              ← Back
            </button>
          )}
          <button type="button" onClick={() => finish('skipped')} className="btn-ghost !text-xs ml-auto">
            Skip
          </button>
          <button type="button" onClick={() => (isLast ? finish('done') : go(stepIndex + 1))} className="insert-coin !py-1.5 !text-xs">
            {isLast ? 'Start tracking' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}
