import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Habit, HabitLog, Task, JournalEntry } from '../types';
import { presetValueCounts } from './habitPresets';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Checks if a habit was completed on a given date based on its log value.
 */
export function isHabitCompleted(habit: Habit, log: HabitLog | undefined): boolean {
  if (!log) return false;
  if (habit.type === 'checkbox') {
    return log.value === 1 || log.value === '1' || log.value === 'true' || (log.value as unknown) === true;
  }
  if (habit.type === 'counter' || habit.type === 'numeric') {
    return typeof log.value === 'number' && log.value > 0;
  }
  if (habit.type === 'mood' || habit.type === 'energy') {
    return log.value !== undefined && log.value !== '';
  }
  // V3.5 preset types: encoded strings ('m:20' | 'p:45' | 'w:back:45').
  // Any parsable positive payload counts as done for the day.
  if (habit.type === 'reading' || habit.type === 'workout') {
    return presetValueCounts(habit.type, log.value);
  }
  return false;
}

/**
 * Calculates a consistency score from 0 to 100 for a given date.
 */
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
  let habitScore: number;
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
  let taskScore: number;
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

/**
 * Calculates the current completion streak for a given habit.
 */
export function calculateStreak(habit: Habit, logs: HabitLog[]): number {
  const habitLogs = logs
    .filter(l => l.habit_id === habit.id)
    .sort((a, b) => b.date.localeCompare(a.date)); // Sort descending (newest first)
  
  if (habitLogs.length === 0) return 0;

  const todayStr = getTodayDateString();
  
  // Helper to format date relative to today
  const getRelativeDateStr = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let streak = 0;
  let offset: number;

  // If today is completed, start check from today. Otherwise, start check from yesterday.
  const todayLog = habitLogs.find(l => l.date === todayStr);
  const todayCompleted = isHabitCompleted(habit, todayLog);

  if (todayCompleted) {
    streak = 1;
    offset = 1;
  } else {
    // Check if yesterday was completed. If not, streak is 0.
    const yesterdayStr = getRelativeDateStr(1);
    const yesterdayLog = habitLogs.find(l => l.date === yesterdayStr);
    if (!isHabitCompleted(habit, yesterdayLog)) {
      return 0;
    }
    offset = 1; // start checking from yesterday backwards
  }

  while (true) {
    const dateToCheck = getRelativeDateStr(offset);
    const log = habitLogs.find(l => l.date === dateToCheck);
    
    if (isHabitCompleted(habit, log)) {
      streak++;
      offset++;
    } else {
      break;
    }
    
    // Safety break to prevent infinite loop (cap at 365 days)
    if (offset > 365) break;
  }

  return streak;
}

/**
 * Generates an array of all date strings in the current month.
 */
export function getDaysInCurrentMonth(): string[] {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const numDays = new Date(year, month + 1, 0).getDate();
  
  const days: string[] = [];
  for (let i = 1; i <= numDays; i++) {
    const dayStr = String(i).padStart(2, '0');
    const monthStr = String(month + 1).padStart(2, '0');
    days.push(`${year}-${monthStr}-${dayStr}`);
  }
  return days;
}

/**
 * Generates a unique ID with an optional prefix.
 */
export function generateUUID(prefix: string = ''): string {
  const chars = 'abcdef0123456789';
  let randomStr = '';
  for (let i = 0; i < 12; i++) {
    randomStr += chars[Math.random() * 16 | 0];
  }
  return `${prefix}${randomStr}`;
}
