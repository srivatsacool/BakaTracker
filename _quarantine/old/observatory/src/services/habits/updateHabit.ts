import type { Habit } from '../../types';

export function updateHabit(habit: Habit, updates: Partial<Omit<Habit, 'id' | 'created_at'>>): Habit {
  return {
    ...habit,
    ...updates,
    updated_at: new Date().toISOString()
  };
}
