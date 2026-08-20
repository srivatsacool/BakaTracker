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
  let offset = 0;

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
