import type { Habit, HabitLog } from '../../types';

export function deleteHabit(
  id: string,
  habits: Habit[],
  logs: HabitLog[]
): { habits: Habit[]; logs: HabitLog[] } {
  return {
    habits: habits.filter(h => h.id !== id),
    logs: logs.filter(l => l.habit_id !== id)
  };
}
