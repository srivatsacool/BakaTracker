import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { CheckCircle2, Circle, Trophy, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const OnboardingBanner: React.FC = () => {
  const { habits, tasks, journal, stats } = useStore();
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
    {
      id: 5,
      title: 'Reach Level 2',
      completed: stats.level >= 2,
      link: '/journey',
      label: stats.level >= 2 ? 'Lvl 2 Reached!' : `Lvl ${stats.level}`
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const allCompleted = completedCount === steps.length;

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('bt_onboarding_dismissed', 'true');
  };

  return (
    <div className="neo-card p-5 bg-gradient-to-r from-accent-pink/20 via-surface to-accent-pink/10 border-glass-border mb-6 relative overflow-hidden shadow-gumroad">
      <div className="flex justify-between items-start border-b border-glass-border pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-glass-bg-strong text-accent-pink rounded-lg border border-glass-border shadow-gumroad-sm">
            <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <h3 className="font-black text-lg leading-none flex items-center gap-2 text-text-primary">
              <span>Adventurer Onboarding Quest</span>
              <span className="text-xs font-mono font-bold bg-glass-bg-strong text-accent-pink px-2 py-0.5 rounded border border-glass-border shadow-gumroad-sm">
                {completedCount}/5 Quests Cleared
              </span>
            </h3>
            <p className="text-xs text-text-secondary font-mono mt-1 font-medium">
              Master the core progression loop to level up your life.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition border border-transparent hover:border-black cursor-pointer text-gray-500 hover:text-black dark:hover:text-white"
          title="Dismiss Banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-2">
        {steps.map(step => (
          <Link
            key={step.id}
            to={step.link}
            className={`p-3 rounded-lg border-2 flex flex-col justify-between gap-2 transition-all ${
              step.completed
                ? 'border-success bg-success/10 text-black dark:text-white shadow-none opacity-90'
                : 'border-black dark:border-white bg-white dark:bg-surface hover:bg-accent-pink/10 hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-gumroad-sm'
            }`}
          >
            <div className="flex justify-between items-start gap-1">
              <span className="font-mono text-[10px] font-black uppercase text-gray-500">
                Step {step.id}
              </span>
              {step.completed ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </div>

            <div>
              <h4 className="font-black text-xs leading-tight">{step.title}</h4>
              <span className="text-[10px] font-mono font-bold text-gray-500 mt-1 block">
                {step.label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {allCompleted && (
        <div className="mt-4 p-3 bg-success text-white rounded-lg border-2 border-black font-mono font-bold text-xs flex justify-between items-center shadow-gumroad-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-300 animate-bounce" />
            <span>🎉 Onboarding Complete! You have mastered the core loop!</span>
          </div>
          <button
            onClick={handleDismiss}
            className="px-3 py-1 bg-black text-white rounded border border-white text-xs hover:bg-gray-800 transition cursor-pointer"
          >
            Got it!
          </button>
        </div>
      )}
    </div>
  );
};
