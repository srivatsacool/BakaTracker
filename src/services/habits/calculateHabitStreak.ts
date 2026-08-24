import type { Habit, HabitLog } from '../../types';
import { isHabitCompleted, getTodayDateString } from '../../lib/utils';

export function calculateHabitStreak(habit: Habit, logs: HabitLog[]): number {
  const habitLogs = logs
    .filter(l => l.habit_id === habit.id)
    .sort((a, b) => b.date.localeCompare(a.date)); // Sort descending (newest first)
  
  if (habitLogs.length === 0) return 0;

  const todayStr = getTodayDateString();
  
  // Helper to format date relative to today
  const getRelativeDateStr = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let streak = 0;
  let offset: number;

  // If today is completed, start check from today. Otherwise, start check from yesterday.
  const todayLog = habitLogs.find(l => l.date === todayStr);
  const todayCompleted = isHabitCompleted(habit, todayLog);

  if (todayCompleted) {
    streak = 1;
    offset = 1;
  } else {
    // Check if yesterday was completed. If not, streak is 0.
    const yesterdayStr = getRelativeDateStr(1);
    const yesterdayLog = habitLogs.find(l => l.date === yesterdayStr);
    if (!isHabitCompleted(habit, yesterdayLog)) {
      return 0;
    }
    offset = 1; // start checking from yesterday backwards
  }

  while (true) {
    const dateToCheck = getRelativeDateStr(offset);
    const log = habitLogs.find(l => l.date === dateToCheck);
    
    if (isHabitCompleted(habit, log)) {
      streak++;
      offset++;
    } else {
      break;
    }
    
    // Safety check to prevent infinite loop
    if (offset > 365) break;
  }

  return streak;
}

/**
 * Longest consecutive-day run ever recorded for a habit (derived from logs).
 * Pure helper — used by the Habits rhythm readout and the Journey
 * streak leaderboard. No store logic.
 */
export function calculateBestStreak(habit: Habit, logs: HabitLog[]): number {
  const dates = logs
    .filter(l => l.habit_id === habit.id && isHabitCompleted(habit, l))
    .map(l => l.date)
    .sort(); // ascending YYYY-MM-DD (lexicographic = chronological)

  if (dates.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(`${dates[i - 1]}T00:00:00`);
    const cur = new Date(`${dates[i]}T00:00:00`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}
