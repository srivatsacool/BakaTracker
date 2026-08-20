import type { Habit } from '../../types';

export function getHabits(habits: Habit[], activeOnly: boolean = false): Habit[] {
  if (activeOnly) {
    return habits.filter(h => h.active);
  }
  return habits;
}
