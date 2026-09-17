import type { Habit, HabitType, StatType, HabitPresetId } from '../../types';
import { generateUUID } from '../../lib/utils';

export function createHabit(
  name: string,
  type: HabitType,
  icon: string,
  xp: number,
  stat: StatType,
  preset?: HabitPresetId,
  target?: { value: number; unit: string; step?: number }
): Habit {
  const now = new Date().toISOString();
  return {
    id: generateUUID('habit_'),
    name,
    type,
    icon,
    xp,
    stat,
    preset,
    target,
    active: true,
    archived: false,
    created_at: now,
    updated_at: now
  };
}
