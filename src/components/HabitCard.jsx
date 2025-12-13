// Habit Card Component
import { useState } from 'react';

export const HabitCard = ({ habit, isCompleted, onToggle, showStreak = true }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleClick = () => {
    setIsAnimating(true);
    onToggle?.(habit.id);
    setTimeout(() => setIsAnimating(false), 300);
  };
  
  // Calculate progress ring
  const radius = 33;
  const circumference = 2 * Math.PI * radius;
  const progress = isCompleted ? 100 : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm transition-all active:scale-[0.99] cursor-pointer ${
        isAnimating ? 'scale-95' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center justify-center size-12 rounded-xl shrink-0 ${
            isCompleted
              ? 'bg-primary/20 text-primary'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined">{habit.icon || 'check_circle'}</span>
        </div>
        <div className="flex flex-col">
          <p
            className={`text-base font-bold leading-tight ${
              isCompleted
                ? 'text-slate-400 dark:text-slate-500 line-through decoration-2'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {habit.name}
          </p>
          {showStreak && parseInt(habit.streak) > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">local_fire_department</span>
                {habit.streak} Day Streak
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress Ring */}
      <div className="relative size-10 shrink-0">
        <svg className="size-full -rotate-90" viewBox="0 0 76 76">
          <circle
            className="text-gray-200 dark:text-gray-700/30"
            cx="38"
            cy="38"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            className={`transition-all duration-500 ${isCompleted ? 'text-primary drop-shadow-[0_0_2px_rgba(19,236,128,0.5)]' : 'text-gray-300'}`}
            cx="38"
            cy="38"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        {isCompleted && (
          <span className="absolute inset-0 flex items-center justify-center text-primary material-symbols-outlined text-base">
            check
          </span>
        )}
      </div>
    </div>
  );
};

export default HabitCard;
