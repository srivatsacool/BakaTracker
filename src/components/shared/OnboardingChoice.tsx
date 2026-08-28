import React, { useCallback, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { PixelIcon, PixelBadge, SystemLabel, TerminalText } from '../ui';
import { markOnboardingComplete } from '../../lib/onboarding';

interface OnboardingChoiceProps {
  userId: string;
  onWalkthrough: () => void;
  onSkip: () => void;
}

/**
 * OnboardingChoice — the first-session decision screen.
 * Shows AFTER authenticated login, BEFORE the app shell.
 *
 * Two vertically stacked options:
 * 1. START WALKTHROUGH → launches existing FirstRunSetup
 * 2. SKIP COMPLETELY → permanently dismisses onboarding
 */
export const OnboardingChoice: React.FC<OnboardingChoiceProps> = ({
  userId,
  onWalkthrough,
  onSkip,
}) => {
  const [closing, setClosing] = useState(false);
  const dialogRef = useFocusTrap<HTMLDivElement>(!closing, {
    onEscape: () => handleSkip(),
  });

  const handleSkip = useCallback(() => {
    markOnboardingComplete(userId);
    setClosing(true);
    setTimeout(onSkip, 150);
  }, [userId, onSkip]);

  const handleWalkthrough = useCallback(() => {
    markOnboardingComplete(userId);
    setClosing(true);
    setTimeout(onWalkthrough, 150);
  }, [userId, onWalkthrough]);

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="glass-strong w-full max-w-sm flex flex-col items-center gap-6 p-8 text-center"
        style={{ color: 'var(--bt-text)' }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <PixelIcon name="robot" size={32} color="var(--bt-primary-bright)" />
          <TerminalText tone="primary" prompt>BAKATRACKER</TerminalText>
        </div>

        <div>
          <h2 id="onboarding-title" className="marquee-title text-xl m-0" style={{ color: 'var(--bt-text)' }}>
            First Session
          </h2>
          <SystemLabel tone="muted">Welcome to your personal life OS.</SystemLabel>
        </div>

        {/* Options — vertically stacked */}
        <div className="flex flex-col gap-3 w-full">
          {/* Primary: START WALKTHROUGH */}
          <button
            type="button"
            onClick={handleWalkthrough}
            className="w-full flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition hover:scale-[1.02] text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 100%)',
              borderColor: 'var(--obs-gold, #e8b45a)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
            aria-label="Start the BakaTracker walkthrough"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.2)' }}>
              <PixelIcon name="sparkles" size={20} color="var(--bt-primary-bright)" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm" style={{ color: 'var(--bt-text)' }}>Start Walkthrough</span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--bt-text-muted)' }}>Learn how BakaTracker works</span>
            </div>
            <PixelBadge tone="primary" className="ml-auto shrink-0">✦</PixelBadge>
          </button>

          {/* Secondary: SKIP COMPLETELY */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition hover:scale-[1.02] text-left"
            style={{
              background: 'rgba(242,242,242,0.03)',
              borderColor: 'var(--bt-border-soft)',
            }}
            aria-label="Skip the BakaTracker walkthrough permanently"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(242,242,242,0.06)' }}>
              <PixelIcon name="externalLink" size={20} color="var(--bt-text-muted)" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm" style={{ color: 'var(--bt-text-dim)' }}>Skip Completely</span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--bt-text-muted)' }}>Go straight to BakaTracker</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
