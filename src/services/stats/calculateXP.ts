import type { Habit, HabitLog, Task, JournalEntry, StatType, TaskArea } from '../../types';

export function areaToStat(area: TaskArea): StatType {
  switch (area) {
    case 'health': return 'health';
    case 'career': return 'career';
    case 'learning': return 'knowledge';
    case 'personal': return 'discipline';
    case 'creativity': return 'creativity';
    default: return 'discipline';
  }
}

export function calculateXP(
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

  // 1. Process Habit Logs
  habitLogs.forEach(log => {
    const habit = habits.find(h => h.id === log.habit_id);
    if (!habit) return;

    let xpEarned = 0;
    if (habit.type === 'checkbox' && (log.value === 1 || log.value === '1' || log.value === 'true' || (log.value as any) === true)) {
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

  // 2. Process Completed Tasks (ONLY if completed via Today board, i.e., task.today is true)
  tasks.forEach(task => {
    if (task.status === 'done' && task.xp > 0 && task.today) {
      const statName = areaToStat(task.area);
      xpMap[statName] += task.xp;
    }
  });

  // 3. Process Journal Entries
  journal.forEach(entry => {
    if (entry.highlight && entry.highlight.trim()) {
      xpMap.discipline += 10; // 10 XP for writing highlight
    }
  });

  return xpMap;
}
