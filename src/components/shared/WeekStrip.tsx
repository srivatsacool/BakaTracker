import React from 'react';
import { isHabitCompleted } from '../../lib/utils';
import type { Habit, HabitLog } from '../../types';

/**
 * WeekStrip — 7-day (M T W T F S S) type-aware habit week display.
 * The hero interaction of the Habits pixel tracker.
 * Checkbox: filled/empty cell. Counter: count. Numeric: value.
 * Mood/Energy: semantic representation.
 */
export interface WeekStripProps {
  habit: Habit;
  habitLogs: HabitLog[];
  onDayClick: (habit: Habit, date: string) => void;
}

/** Get the 7 days of the current week (Monday start). */
function getCurrentWeek(): { date: string; label: string; isToday: boolean }[] {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: dateStr, label: labels[i], isToday: dateStr === todayStr });
  }
  return days;
}

/** Render the cell value based on habit type. */
function CellValue({ habit, log, done }: { habit: Habit; log: HabitLog | undefined; done: boolean }) {
  if (habit.type === 'checkbox') {
    return (
      <span
        className="w-4 h-4 rounded-sm"
        style={{
          background: done ? 'var(--bt-success)' : 'transparent',
          border: done ? 'none' : '1px solid rgba(242,242,242,0.2)',
          boxShadow: done ? '0 0 6px var(--bt-success)' : 'none',
        }}
        aria-hidden="true"
      />
    );
  }

  const value = log?.value;
  const displayValue = value != null && value !== '' ? String(value) : '—';

  return (
    <span
      className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] leading-none font-mono font-bold"
      style={{
        background: done ? 'var(--bt-success)' : 'transparent',
        border: done ? 'none' : '1px solid rgba(242,242,242,0.2)',
        color: done ? '#08140c' : 'var(--bt-text-dim)',
      }}
      aria-hidden="true"
    >
      {habit.type === 'mood' ? (value || '—') : displayValue}
    </span>
  );
}

export const WeekStrip: React.FC<WeekStripProps> = ({ habit, habitLogs, onDayClick }) => {
  const week = getCurrentWeek();

  return (
    <div className="flex items-end gap-1" aria-label="This week">
      {week.map(day => {
        const log = habitLogs.find(l => l.habit_id === habit.id && l.date === day.date);
        const done = isHabitCompleted(habit, log);
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onDayClick(habit, day.date)}
            className="flex-1 flex flex-col items-center gap-1 rounded-md py-1.5 cursor-pointer transition-all duration-150 hover:scale-105"
            style={{
              background: done ? 'rgba(52,211,153,0.1)' : day.isToday ? 'rgba(139,92,246,0.06)' : 'rgba(242,242,242,0.025)',
              border: `1px solid ${done ? 'rgba(52,211,153,0.3)' : day.isToday ? 'rgba(139,92,246,0.2)' : 'var(--bt-border-soft)'}`,
              boxShadow: day.isToday ? '0 0 8px rgba(139,92,246,0.15)' : 'none',
            }}
            aria-label={`${habit.name} on ${day.date} — ${done ? 'completed' : 'not completed'}`}
            aria-pressed={done}
          >
            <span
              className="font-mono text-[9px] font-bold"
              style={{ color: day.isToday ? 'var(--bt-primary-bright)' : done ? 'var(--bt-success)' : 'var(--bt-text-muted)' }}
            >
              {day.label}
            </span>
            <CellValue habit={habit} log={log} done={done} />
          </button>
        );
      })}
    </div>
  );
};
