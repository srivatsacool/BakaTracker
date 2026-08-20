import type { Habit, HabitLog, Task, JournalEntry, UserStats } from '../../types';
import { calculateXP } from './calculateXP';
import { calculateLevel } from './calculateLevel';

export function calculateCharacterStats(
  habits: Habit[],
  habitLogs: HabitLog[],
  tasks: Task[],
  journal: JournalEntry[],
  xpPerLevel: number = 100
): UserStats {
  const xpMap = calculateXP(habits, habitLogs, tasks, journal);
  
  const totalXp = xpMap.discipline + xpMap.health + xpMap.knowledge + xpMap.creativity + xpMap.career;
  const { level, xp } = calculateLevel(totalXp, xpPerLevel);
  
  return {
    level,
    xp,
    discipline: xpMap.discipline,
    health: xpMap.health,
    knowledge: xpMap.knowledge,
    creativity: xpMap.creativity,
    career: xpMap.career
  };
}
