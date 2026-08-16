import type { HabitLog } from '../../types';

export function getHabitLogs(
  logs: HabitLog[],
  filter?: { habitId?: string; date?: string }
): HabitLog[] {
  return logs.filter(log => {
    if (filter?.habitId && log.habit_id !== filter.habitId) return false;
    if (filter?.date && log.date !== filter.date) return false;
    return true;
  });
}
