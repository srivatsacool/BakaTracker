import React from 'react';
import type { Habit, HabitLog, StatType } from '../../types';
import { isHabitCompleted, type WeekDayInfo } from '../../lib/utils';
import { calculateHabitStreak, calculateBestStreak } from '../../services/habits/calculateHabitStreak';
import { PixelIcon } from '../ui';
import {
  MoodInstrument,
  WaterInstrument,
  SleepInstrument,
  ReadingInstrument,
  WorkoutInstrument,
} from './HabitInstruments';

export const STAT_LABELS: Record<StatType, { label: string; icon: string; color: string }> = {
  discipline: { label: 'DISCIPLINE', icon: 'sword', color: 'var(--obs-coral, #f87171)' },
  health: { label: 'HEALTH', icon: 'fire', color: 'var(--obs-teal, #3dca84)' },
  knowledge: { label: 'KNOWLEDGE', icon: 'book', color: 'var(--obs-cobalt, #3f7bff)' },
  creativity: { label: 'CREATIVITY', icon: 'brush', color: 'var(--obs-rose, #fb7185)' },
  career: { label: 'CAREER', icon: 'briefcase', color: 'var(--obs-amber, #f59e0b)' },
};

interface HabitCardProps {
  habit: Habit;
  log: HabitLog | undefined;
  habitLogs: HabitLog[];
  weekDays: WeekDayInfo[];
  todayStr: string;
  onRecord: (habit: Habit, date: string, value: number | string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  onArchive?: (habit: Habit) => void;
  onSelectDate?: (habit: Habit, date: string) => void;
}

const ENERGY_LEVELS = [
  { val: 'low', label: 'LOW', icon: '⚡' },
  { val: 'med', label: 'MED', icon: '⚡⚡' },
  { val: 'high', label: 'HIGH', icon: '⚡⚡⚡' },
  { val: 'max', label: 'MAX', icon: '🔥' },
];

const MOOD_EMOJIS = ['😞', '😐', '🙂', '😄'];

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  log,
  habitLogs,
  weekDays,
  todayStr,
  onRecord,
  onEdit,
  onDelete,
  onArchive,
  onSelectDate,
}) => {
  const completed = isHabitCompleted(habit, log);
  const streak = calculateHabitStreak(habit, habitLogs);
  const bestStreak = calculateBestStreak(habit, habitLogs);
  const statInfo = STAT_LABELS[habit.stat] || STAT_LABELS.discipline;

  // Completion in current week
  const weekCompletedCount = weekDays.filter((d) => {
    const l = habitLogs.find((entry) => entry.habit_id === habit.id && entry.date === d.date);
    return isHabitCompleted(habit, l);
  }).length;
  const weekPct = Math.round((weekCompletedCount / 7) * 100);

  // Counter & Numeric values
  const currentNumVal = typeof log?.value === 'number' ? log.value : 0;
  const targetVal = habit.target?.value;
  const targetUnit = habit.target?.unit || '';
  const hasTarget = typeof targetVal === 'number' && targetVal > 0;
  const targetProgress = hasTarget ? Math.min(100, Math.round((currentNumVal / targetVal) * 100)) : 0;

  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3.5 transition-all duration-300 relative group"
      style={{
        background: completed ? 'rgba(61,220,132,0.03)' : 'rgba(233,230,242,0.02)',
        borderColor: completed ? 'rgba(61,220,132,0.22)' : 'rgba(233,230,242,0.07)',
        boxShadow: completed ? '0 4px 20px rgba(61,220,132,0.06)' : 'none',
      }}
    >
      {/* ─── TOP ROW: Icon, Title, Stat Badge, XP, Streaks ─── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
            style={{
              background: 'rgba(233,230,242,0.04)',
              borderColor: 'rgba(233,230,242,0.1)',
            }}
          >
            {habit.icon}
          </div>
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className="font-bold text-sm tracking-wide truncate"
                style={{ color: completed ? 'var(--bt-success)' : 'var(--bt-text)' }}
              >
                {habit.name}
              </span>
              {habit.preset && (
                <span
                  className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    color: 'var(--arcade-gold, #e8b45a)',
                    background: 'rgba(232,180,90,0.1)',
                    border: '1px solid rgba(232,180,90,0.25)',
                  }}
                >
                  PRESET
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <PixelIcon name={statInfo.icon as never} size={11} color={statInfo.color} />
                <span className="font-mono text-[9px] font-bold" style={{ color: statInfo.color }}>
                  {statInfo.label}
                </span>
              </div>
              <span className="font-mono text-[9px]" style={{ color: 'var(--obs-gold, #e8b45a)' }}>
                +{habit.xp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Streaks badge */}
        <div className="flex flex-col items-end shrink-0">
          {streak > 0 && (
            <span className="font-mono text-[10px] font-bold flex items-center gap-1" style={{ color: 'var(--obs-gold, #e8b45a)' }}>
              <span>🔥</span> {streak} DAY{streak > 1 ? 'S' : ''}
            </span>
          )}
          {bestStreak > 0 && (
            <span className="font-mono text-[9px]" style={{ color: 'var(--bt-text-muted)' }}>
              BEST {bestStreak}d
            </span>
          )}
        </div>
      </div>

      {/* ─── WEEKLY DATE STRIP (Mon - Sun) ─── */}
      <div className="flex items-center justify-between gap-1 p-2 rounded-xl bg-[rgba(233,230,242,0.02)] border border-[rgba(233,230,242,0.04)]">
        {weekDays.map((day) => {
          const dayLog = habitLogs.find((l) => l.habit_id === habit.id && l.date === day.date);
          const isDone = isHabitCompleted(habit, dayLog);
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate?.(habit, day.date)}
              className="flex-1 flex flex-col items-center gap-1 py-1 rounded-lg transition cursor-pointer hover:bg-[rgba(233,230,242,0.04)]"
              title={`${day.date}: ${isDone ? 'Completed' : 'Not completed'}`}
            >
              <span className="font-mono text-[8px] font-bold uppercase" style={{ color: day.isToday ? 'var(--bt-text)' : 'var(--bt-text-muted)' }}>
                {day.dayLabel}
              </span>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] transition"
                style={{
                  background: isDone
                    ? 'var(--bt-success)'
                    : day.isToday
                    ? 'rgba(233,230,242,0.08)'
                    : 'transparent',
                  color: isDone ? '#000' : 'var(--bt-text-muted)',
                  border: day.isToday
                    ? '1.5px solid var(--bt-success)'
                    : isDone
                    ? '1px solid var(--bt-success)'
                    : '1px solid rgba(233,230,242,0.08)',
                  boxShadow: isDone ? '0 0 8px rgba(61,220,132,0.35)' : 'none',
                }}
              >
                {isDone ? '✓' : day.dayNumber}
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── TARGET & PROGRESS READOUT ─── */}
      {hasTarget && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span style={{ color: 'var(--bt-text-muted)' }}>
              TODAY: {currentNumVal} / {targetVal} {targetUnit}
            </span>
            <span style={{ color: completed ? 'var(--bt-success)' : statInfo.color }}>
              {targetProgress}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-[rgba(233,230,242,0.08)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${targetProgress}%`,
                background: completed ? 'var(--bt-success)' : statInfo.color,
              }}
            />
          </div>
        </div>
      )}

      {/* ─── INTERACTIVE LOGGER / INSTRUMENT AREA ─── */}
      <div className="pt-1">
        {habit.preset ? (
          <div className="flex flex-col gap-2">
            {habit.preset === 'mood' && <MoodInstrument habit={habit} log={log} />}
            {habit.preset === 'water' && <WaterInstrument habit={habit} log={log} />}
            {habit.preset === 'sleep' && <SleepInstrument habit={habit} log={log} />}
            {habit.preset === 'reading' && <ReadingInstrument habit={habit} log={log} />}
            {habit.preset === 'workout' && <WorkoutInstrument habit={habit} log={log} />}
          </div>
        ) : habit.type === 'checkbox' ? (
          <button
            type="button"
            onClick={() => onRecord(habit, todayStr, completed ? 0 : 1)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase cursor-pointer transition active:scale-[0.98]"
            style={{
              color: completed ? 'var(--bt-success)' : 'var(--obs-gold, #e8b45a)',
              background: completed ? 'rgba(61,220,132,0.1)' : 'rgba(232,180,90,0.1)',
              border: `1px solid ${completed ? 'rgba(61,220,132,0.25)' : 'rgba(232,180,90,0.25)'}`,
            }}
          >
            <span>{completed ? '✓' : '⚡'}</span>
            <span>{completed ? 'COMPLETED TODAY' : 'CHECK IN'}</span>
          </button>
        ) : habit.type === 'counter' ? (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onRecord(habit, todayStr, Math.max(0, currentNumVal - 1))}
              disabled={currentNumVal <= 0}
              className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-base font-bold cursor-pointer transition disabled:opacity-30 border"
              style={{
                background: 'rgba(233,230,242,0.04)',
                borderColor: 'rgba(233,230,242,0.1)',
                color: 'var(--bt-text)',
              }}
            >
              -
            </button>
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="font-mono text-lg font-bold" style={{ color: currentNumVal > 0 ? 'var(--bt-success)' : 'var(--bt-text-muted)' }}>
                {currentNumVal} {targetUnit}
              </span>
              {hasTarget && (
                <span className="font-mono text-[9px]" style={{ color: 'var(--bt-text-muted)' }}>
                  target: {targetVal} {targetUnit}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRecord(habit, todayStr, currentNumVal + 1)}
              className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-base font-bold cursor-pointer transition border"
              style={{
                background: 'rgba(139,92,246,0.18)',
                borderColor: 'rgba(139,92,246,0.4)',
                color: 'var(--bt-text)',
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => onRecord(habit, todayStr, currentNumVal + 5)}
              className="px-2.5 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-bold cursor-pointer transition border"
              style={{
                background: 'rgba(233,230,242,0.04)',
                borderColor: 'rgba(233,230,242,0.1)',
                color: 'var(--bt-text-muted)',
              }}
              title="Add 5"
            >
              +5
            </button>
          </div>
        ) : habit.type === 'numeric' ? (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onRecord(habit, todayStr, Math.max(0, Number((currentNumVal - 1).toFixed(1))))}
              disabled={currentNumVal <= 0}
              className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-base font-bold cursor-pointer transition disabled:opacity-30 border"
              style={{
                background: 'rgba(233,230,242,0.04)',
                borderColor: 'rgba(233,230,242,0.1)',
                color: 'var(--bt-text)',
              }}
            >
              -
            </button>
            <div className="flex-1 flex items-center justify-center gap-1.5">
              <input
                type="number"
                step="any"
                min="0"
                value={currentNumVal || ''}
                placeholder="0"
                onChange={(e) => onRecord(habit, todayStr, Math.max(0, Number(e.target.value) || 0))}
                className="arcade-input !text-center font-mono font-bold !text-base w-24 !py-1.5"
              />
              {targetUnit && (
                <span className="font-mono text-xs" style={{ color: 'var(--bt-text-muted)' }}>
                  {targetUnit}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRecord(habit, todayStr, Number((currentNumVal + 1).toFixed(1)))}
              className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-base font-bold cursor-pointer transition border"
              style={{
                background: 'rgba(139,92,246,0.18)',
                borderColor: 'rgba(139,92,246,0.4)',
                color: 'var(--bt-text)',
              }}
            >
              +
            </button>
          </div>
        ) : habit.type === 'mood' ? (
          <div className="flex items-center justify-between gap-2">
            {MOOD_EMOJIS.map((face) => {
              const isActive = log?.value === face;
              return (
                <button
                  key={face}
                  type="button"
                  onClick={() => onRecord(habit, todayStr, isActive ? '' : face)}
                  className="flex-1 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition"
                  style={{
                    background: isActive ? 'rgba(139,92,246,0.2)' : 'rgba(233,230,242,0.04)',
                    border: `1px solid ${isActive ? 'rgba(139,92,246,0.5)' : 'rgba(233,230,242,0.08)'}`,
                    boxShadow: isActive ? '0 0 10px rgba(139,92,246,0.2)' : 'none',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {face}
                </button>
              );
            })}
          </div>
        ) : habit.type === 'energy' ? (
          <div className="grid grid-cols-4 gap-1.5">
            {ENERGY_LEVELS.map((lvl) => {
              const isActive = log?.value === lvl.val;
              return (
                <button
                  key={lvl.val}
                  type="button"
                  onClick={() => onRecord(habit, todayStr, isActive ? '' : lvl.val)}
                  className="py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition"
                  style={{
                    background: isActive ? 'rgba(245,158,11,0.18)' : 'rgba(233,230,242,0.04)',
                    border: `1px solid ${isActive ? 'rgba(245,158,11,0.5)' : 'rgba(233,230,242,0.08)'}`,
                  }}
                >
                  <span className="text-xs">{lvl.icon}</span>
                  <span className="font-mono text-[8px] font-bold" style={{ color: isActive ? 'var(--obs-amber, #f59e0b)' : 'var(--bt-text-muted)' }}>
                    {lvl.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ─── FOOTER: Actions ─── */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(233,230,242,0.05)' }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px]" style={{ color: 'var(--bt-text-muted)' }}>
            WEEK: {weekCompletedCount}/7 ({weekPct}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(habit)}
            className="font-mono text-[10px] px-2.5 py-1 rounded-lg cursor-pointer transition border hover:bg-[rgba(233,230,242,0.05)]"
            style={{ color: 'var(--bt-text-muted)', borderColor: 'rgba(233,230,242,0.08)' }}
          >
            EDIT
          </button>
          {onArchive && (
            <button
              type="button"
              onClick={() => onArchive(habit)}
              className="font-mono text-[10px] px-2.5 py-1 rounded-lg cursor-pointer transition border hover:bg-[rgba(233,230,242,0.05)]"
              style={{ color: 'var(--bt-text-muted)', borderColor: 'rgba(233,230,242,0.08)' }}
              title={habit.archived ? 'Unarchive Habit' : 'Archive Habit'}
            >
              {habit.archived ? 'RESTORE' : 'ARCHIVE'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(habit)}
            className="font-mono text-[10px] px-2.5 py-1 rounded-lg cursor-pointer transition border hover:!text-[var(--bt-danger)] hover:!border-[rgba(248,113,113,0.3)]"
            style={{ color: 'var(--bt-text-muted)', borderColor: 'rgba(233,230,242,0.08)' }}
            title="Delete Habit"
          >
            DEL
          </button>
        </div>
      </div>
    </div>
  );
};
