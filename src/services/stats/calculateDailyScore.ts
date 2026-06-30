import type { Habit, HabitLog, Task, JournalEntry } from '../../types';
import { isHabitCompleted } from '../../lib/utils';

export function calculateDailyScore(
  date: string,
  habits: Habit[],
  habitLogs: HabitLog[],
  tasks: Task[],
  journal: JournalEntry[]
): number {
  const activeHabits = habits.filter(h => h.active);
  if (activeHabits.length === 0 && tasks.length === 0 && journal.length === 0) return 0;

  // 1. Habit Completion (50% weight)
  let habitScore = 0;
  if (activeHabits.length > 0) {
    const logsToday = habitLogs.filter(l => l.date === date);
    let completedCount = 0;
    
    activeHabits.forEach(h => {
      const log = logsToday.find(l => l.habit_id === h.id);
      if (isHabitCompleted(h, log)) {
        completedCount++;
      }
    });
    
    habitScore = (completedCount / activeHabits.length) * 100;
  } else {
    habitScore = 100;
  }

  // 2. Today's Tasks Completion (40% weight)
  let taskScore = 0;
  const todayTasks = tasks.filter(t => t.today);
  if (todayTasks.length > 0) {
    const completedTasks = todayTasks.filter(t => t.status === 'done');
    taskScore = (completedTasks.length / todayTasks.length) * 100;
  } else {
    taskScore = 100;
  }

  // 3. Journal Entry written (10% weight)
  const journalToday = journal.find(j => j.date === date);
  const journalScore = (journalToday && journalToday.highlight.trim()) ? 100 : 0;

  const finalScore = (habitScore * 0.5) + (taskScore * 0.4) + (journalScore * 0.1);
  return Math.round(finalScore);
}
