import React from 'react';
import { X } from 'lucide-react';
import { BaksurCharacter } from '../shell/BaksurCharacter';
import { BAKASUR_COLOR_HEXES } from '../../lib/baksurPreferences';
import { TerminalText, SystemLabel } from '../ui';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface VisitorGreetingProps {
  bodyColor?: string
  moodColor?: string
  isAuthConfigured: boolean
  onSignIn: () => void
  onEnterDemo: () => void
  onDismiss: () => void
}

/**
 * VisitorGreeting — V3.5 first-visit moment. HARDCODED and deterministic:
 * BakaSur himself greets the visitor, credits Build.Srivatsa, and offers
 * exactly two doors. No LLM, no randomness, never re-shown once a choice
 * exists (bt_visit_choice — the only gate, replacing all legacy onboarding
 * triggers). Dismiss is honest: closing = "jump straight in" as a visitor,
 * which enters the demo too (a guest IS the demo on this device).
 */
export const VisitorGreeting: React.FC<VisitorGreetingProps> = ({
  bodyColor = BAKASUR_COLOR_HEXES.graphite.body,
  moodColor = BAKASUR_COLOR_HEXES.graphite.mood,
  isAuthConfigured,
  onSignIn,
  onEnterDemo,
  onDismiss,
}) => {
  const dialogRef = useFocusTrap<HTMLDivElement>(true, { onEscape: () => onDismiss() })

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(4,3,10,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-greeting-title"
        tabIndex={-1}
        className="glass-strong w-full max-w-md flex flex-col items-center gap-5 p-7 text-center relative"
        style={{ color: 'var(--bt-text)' }}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="icon-button icon-button-small absolute top-3 right-3"
          aria-label="Close greeting and stay as a visitor"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* The character speaks — not a logo, not an icon. */}
        <BaksurCharacter
          direction="flamehorn"
          state="IDLE"
          size={88}
          bodyColor={bodyColor}
          moodColor={moodColor}
          restExpression="attentif"
          ariaLabel="BakaSur, the BakaTracker companion"
        />

        <div className="flex flex-col gap-1.5">
          <TerminalText tone="primary" prompt>BAKASUR</TerminalText>
          <h2 id="visitor-greeting-title" className="marquee-title text-xl m-0" style={{ color: 'var(--bt-text)' }}>
            Hey. I&apos;m BakaSur.
          </h2>
          <p className="font-mono text-xs leading-relaxed m-0" style={{ color: 'var(--bt-text-dim)' }}>
            Welcome to BakaTracker — a personal life OS built by{' '}
            <strong style={{ color: 'var(--bt-text)' }}>Build.Srivatsa</strong>.
          </p>
          <p className="font-mono text-xs m-0" style={{ color: 'var(--bt-text-muted)' }}>
            I can show you around, or you can jump straight in.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full mt-1">
          <button type="button" onClick={onEnterDemo} className="insert-coin w-full justify-center !py-2.5 !text-sm">
            Enter demo
          </button>
          {isAuthConfigured ? (
            <button type="button" onClick={onSignIn} className="btn-ghost w-full justify-center !py-2.5 !text-sm">
              Sign in to your instance
            </button>
          ) : (
            <SystemLabel tone="muted">Sign-in isn&apos;t configured on this host.</SystemLabel>
          )}
        </div>
      </div>
    </div>
  )
}
