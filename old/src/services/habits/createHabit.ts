import type { Habit, HabitType, StatType } from '../../types';
import { generateUUID } from '../../lib/utils';

export function createHabit(
  name: string,
  type: HabitType,
  icon: string,
  xp: number,
  stat: StatType
): Habit {
  const now = new Date().toISOString();
  return {
    id: generateUUID('habit_'),
    name,
    type,
    icon,
    xp,
    stat,
    active: true,
    created_at: now,
    updated_at: now
  };
}
