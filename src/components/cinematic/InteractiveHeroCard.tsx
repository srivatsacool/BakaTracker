import React, { useState } from 'react';
import { Check, Sparkles, Flame, Target } from 'lucide-react';

interface Props {
  onQuestComplete?: () => void;
  className?: string;
}

export const InteractiveHeroCard: React.FC<Props> = ({ onQuestComplete, className = '' }) => {
  const [completed, setCompleted] = useState(false);
  const [showXp, setShowXp] = useState(false);

  const toggleQuest = () => {
    const next = !completed;
    setCompleted(next);
    if (next) {
      setShowXp(true);
      if (onQuestComplete) onQuestComplete();
      setTimeout(() => setShowXp(false), 2400);
    }
  };

  return (
    <div
      className={`interactive-hero-card ${completed ? 'is-completed' : ''} ${className}`}
      role="region"
      aria-label="Interactive demo quest card"
    >
      <div className="card-glare" aria-hidden="true" />

      {/* Header telemetry */}
      <div className="card-meta">
        <span className="card-badge">
          <Target className="w-3 h-3 text-[var(--sanctuary-violet-electric)]" aria-hidden="true" />
          <span>TODAY QUEST</span>
        </span>
        <span className="card-xp-tag">+50 XP</span>
      </div>

      {/* Quest item toggle */}
      <div
        role="checkbox"
        aria-checked={completed}
        tabIndex={0}
        onClick={toggleQuest}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggleQuest();
          }
        }}
        className="card-quest-row"
        title="Click to complete this quest and see Bakasur's reaction"
      >
        <button
          type="button"
          tabIndex={-1}
          className={`card-check ${completed ? 'is-checked' : ''}`}
          aria-hidden="true"
        >
          {completed && <Check className="w-3.5 h-3.5" />}
        </button>
        <div className="card-text">
          <span className={`card-title ${completed ? 'line-through opacity-60' : ''}`}>
            Deep Work: Ship BakaTracker v3
          </span>
          <span className="card-sub">⚔️ Career · High impact · 25 min</span>
        </div>
      </div>

      {/* Footer stats feedback */}
      <div className="card-foot">
        <div className="card-stat">
          <span className="card-stat-label">DAILY SCORE</span>
          <span className="card-stat-value">{completed ? '88%' : '78%'}</span>
        </div>
        <div className="card-stat">
          <span className="card-stat-label">STREAK</span>
          <span className="card-stat-value flex items-center gap-1">
            <Flame className="w-3 h-3 text-[var(--sanctuary-gold)]" aria-hidden="true" />
            14 DAYS
          </span>
        </div>
        <div className="card-hint">
          <span>{completed ? '✦ Quest logged to ledger' : 'Click to check in'}</span>
        </div>
      </div>

      {/* Floating XP Burst particle */}
      {showXp && (
        <div className="floating-xp-bubble" aria-live="polite">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>+50 XP FOCUS</span>
        </div>
      )}
    </div>
  );
};
