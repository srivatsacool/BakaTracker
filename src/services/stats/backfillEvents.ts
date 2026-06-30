import type { Habit, HabitLog, Task, JournalEntry, EventLog } from '../../types';
import { areaToStat } from './calculateXP';
import { generateUUID } from '../../lib/utils';

export function backfillEvents(
  habits: Habit[],
  habitLogs: HabitLog[],
  tasks: Task[],
  journal: JournalEntry[]
): EventLog[] {
  const events: EventLog[] = [];

  // 1. Backfill Habits Completed
  habitLogs.forEach(log => {
    const habit = habits.find(h => h.id === log.habit_id);
    if (!habit) return;

    let xpEarned = 0;
    let metadataObj: Record<string, any> = {};

    if (habit.type === 'checkbox' && (log.value === 1 || log.value === '1' || log.value === 'true' || (log.value as any) === true)) {
      xpEarned = habit.xp;
    } else if (habit.type === 'counter' && typeof log.value === 'number' && log.value > 0) {
      xpEarned = log.value * habit.xp;
      metadataObj = { value: log.value };
    } else if (habit.type === 'numeric' && typeof log.value === 'number' && log.value > 0) {
      xpEarned = habit.xp;
      metadataObj = { value: log.value };
    } else if ((habit.type === 'mood' || habit.type === 'energy') && log.value) {
      xpEarned = habit.xp;
      metadataObj = { value: log.value };
    }

    if (xpEarned > 0) {
      const logDate = log.date;
      events.push({
        id: log.id ? `evt_${log.id.replace('log_', '')}` : generateUUID('evt_'),
        type: 'habit_completed',
        source: 'habit',
        entity: habit.name,
        entity_id: habit.id,
        xp: xpEarned,
        stat: habit.stat,
        metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : undefined,
        timestamp: new Date(logDate + 'T12:00:00').toISOString()
      });
    }
  });

  // 2. Backfill Tasks Completed
  tasks.forEach(task => {
    if (task.status === 'done' && task.completed_at) {
      const statName = areaToStat(task.area);
      events.push({
        id: `evt_${task.id.replace('task_', '')}`,
        type: 'task_completed',
        source: 'task',
        entity: task.title,
        entity_id: task.id,
        xp: task.xp,
        stat: statName,
        metadata: JSON.stringify({ area: task.area }),
        timestamp: task.completed_at
      });
    }
  });

  // 3. Backfill Journal Highlights Completed
  journal.forEach(entry => {
    if (entry.highlight && entry.highlight.trim()) {
      const entryDate = entry.date;
      events.push({
        id: entry.id ? `evt_${entry.id.replace('journal_', '')}` : generateUUID('evt_'),
        type: 'journal_created',
        source: 'journal',
        entity: 'Daily Reflection Logged',
        entity_id: entry.id,
        xp: 10,
        stat: 'discipline',
        timestamp: new Date(entryDate + 'T12:00:00').toISOString()
      });
    }
  });

  return events;
}
