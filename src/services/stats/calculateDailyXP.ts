import type { Habit, HabitLog, Task, JournalEntry, StatType } from '../../types';

/**
 * Calculate XP earned today from canonical data sources.
 * Pure function — filters habit logs, completed tasks, and journal entries
 * to today's date and sums the XP using the same rules as calculateXP.
 */
export function calculateDailyXP(
  today: string,
  habits: Habit[],
  habitLogs: HabitLog[],
  tasks: Task[],
  journal: JournalEntry[]
): Record<StatType, number> {
  const xpMap: Record<StatType, number> = {
    discipline: 0,
    health: 0,
    knowledge: 0,
    creativity: 0,
    career: 0
  };

  // Habit logs for today
  habitLogs
    .filter(l => l.date === today)
    .forEach(log => {
      const habit = habits.find(h => h.id === log.habit_id);
      if (!habit) return;
      let xpEarned = 0;
      if (habit.type === 'checkbox' && (log.value === 1 || log.value === '1' || log.value === 'true' || (log.value as unknown) === true)) {
        xpEarned = habit.xp;
      } else if (habit.type === 'counter' && typeof log.value === 'number') {
        xpEarned = log.value * habit.xp;
      } else if (habit.type === 'numeric' && typeof log.value === 'number' && log.value > 0) {
        xpEarned = habit.xp;
      } else if ((habit.type === 'mood' || habit.type === 'energy') && log.value) {
        xpEarned = habit.xp;
      }
      if (xpEarned > 0) {
        xpMap[habit.stat] += xpEarned;
      }
    });

  // Tasks completed today (only Today-starred tasks earn XP)
  tasks.forEach(task => {
    if (task.status === 'done' && task.today && task.completed_at && task.completed_at.startsWith(today)) {
      const statName = areaToStat(task.area);
      xpMap[statName] += task.xp;
    }
  });

  // Journal entries with highlight today
  journal.forEach(entry => {
    if (entry.date === today && entry.highlight && entry.highlight.trim()) {
      xpMap.discipline += 10;
    }
  });

  return xpMap;
}

function areaToStat(area: string): StatType {
  switch (area) {
    case 'health': return 'health';
    case 'career': return 'career';
    case 'learning': return 'knowledge';
    case 'personal': return 'discipline';
    case 'creativity': return 'creativity';
    default: return 'discipline';
  }
}

export function sumDailyXP(xpMap: Record<StatType, number>): number {
  return xpMap.discipline + xpMap.health + xpMap.knowledge + xpMap.creativity + xpMap.career;
}
