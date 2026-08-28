import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle2, Circle, Trophy, X } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * OnboardingBanner — the tutorial pane. Four steps to a working
 * observatory: add a habit, star a task, complete your first check-in.
 * machine: create a habit, add tasks, write a journal entry, earn XP.
 * Dismissible; stored in bt_onboarding_dismissed.
 */
export const OnboardingBanner: React.FC = () => {
  const { habits, tasks, journal, stats } = useStore(useShallow(s => ({
    habits: s.habits,
    tasks: s.tasks,
    journal: s.journal,
    stats: s.stats,
  })));
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('bt_onboarding_dismissed') === 'true';
  });

  const steps = [
    {
      id: 1,
      title: 'Create a Habit',
      completed: habits.length >= 1,
      link: '/habits',
      label: habits.length >= 1 ? 'Created!' : '0/1 created'
    },
    {
      id: 2,
      title: 'Add 2 Tasks',
      completed: tasks.length >= 2,
      link: '/tasks',
      label: `${Math.min(tasks.length, 2)}/2 added`
    },
    {
      id: 3,
      title: 'Write First Journal Entry',
      completed: journal.length >= 1,
      link: '/journal',
      label: journal.length >= 1 ? 'Logged' : '0/1 written'
    },
    {
      id: 4,
      title: 'Earn First XP',
      completed: stats.xp > 0 || stats.level > 1,
      link: '/habits',
      label: stats.xp > 0 || stats.level > 1 ? 'Earned!' : '0 XP'
    },
  ];

  if (dismissed) return null;

  const allCompleted = steps.every(s => s.completed);

  return (
    <div className="cabinet cabinet--attract mb-5" role="region" aria-label="Getting started">
      <div className="cabinet-marquee">
        <span className="cabinet-led" aria-hidden="true" />
        <span className="cabinet-marquee-title">How to observe</span>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('bt_onboarding_dismissed', 'true');
            setDismissed(true);
          }}
          className="icon-button icon-button-small !ml-auto"
          aria-label="Dismiss onboarding"
          title="Dismiss"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div className="cabinet-screen !py-3 md:!py-4">
        {allCompleted ? (
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 shrink-0" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
            <p className="m-0 font-mono text-xs" style={{ color: 'var(--arcade-paper-dim)' }}>
              <strong style={{ color: 'var(--arcade-paper)' }}>First light!</strong> You've completed every starter step. Keep the observations coming.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
            {steps.map(step => (
              <Link
                key={step.id}
                to={step.link}
                className={`flex items-start gap-2 md:gap-2.5 p-2 md:p-2.5 rounded-lg no-underline transition hover:scale-[1.02] ${step.completed ? '' : ''}`}
                style={{
                  background: step.completed ? 'rgba(61,220,132,0.07)' : 'rgba(242,242,242,0.03)',
                  border: `1px solid ${step.completed ? 'rgba(61,220,132,0.25)' : 'var(--obs-glass-8)'}`,
                }}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 mt-0.5" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" />
                ) : (
                  <Circle className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 mt-0.5" style={{ color: 'var(--arcade-paper-disabled)' }} aria-hidden="true" />
                )}
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] md:text-[11px] font-bold leading-tight" style={{ color: 'var(--arcade-paper)' }}>{step.title}</span>
                  <span className="font-mono text-[8px] md:text-[9px]" style={{ color: step.completed ? 'var(--arcade-green)' : 'var(--arcade-paper-muted)' }}>
                    {step.label}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
