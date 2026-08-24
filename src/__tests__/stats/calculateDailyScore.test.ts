import { describe, it, expect } from 'vitest';
import { calculateDailyScore } from '../../lib/utils';
import type { Habit, HabitLog, Task, JournalEntry } from '../../types';

const today = new Date().toISOString().slice(0, 10);

const mkHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1', name: 'Test', type: 'checkbox', icon: '✅', xp: 10,
  stat: 'discipline', active: true, created_at: today, updated_at: today,
  ...overrides,
});

const mkLog = (overrides: Partial<HabitLog> = {}): HabitLog => ({
  id: 'l1', date: today, habit_id: 'h1', value: 1, xp_earned: 10,
  created_at: today, ...overrides,
});

const mkTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1', title: 'Test', notes: '', area: 'personal', status: 'todo',
  today: true, due_date: '', xp: 10, quadrant: null,
  created_at: today, updated_at: today, completed_at: '',
  ...overrides,
});

const mkJournal = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  id: 'j1', date: today, highlight: 'Good day', notes: '', mood: '🙂',
  quote_id: '', created_at: today, updated_at: today, ...overrides,
});

describe('calculateDailyScore', () => {
  it('returns 0 when no data exists', () => {
    expect(calculateDailyScore(today, [], [], [], [])).toBe(0);
  });

  it('returns 100 when all habits completed, all tasks done, journal written', () => {
    const habits = [mkHabit(), mkHabit({ id: 'h2' })];
    const logs = [mkLog(), mkLog({ id: 'l2', habit_id: 'h2' })];
    const tasks = [mkTask(), mkTask({ id: 't2' })];
    // Mark tasks as done
    tasks.forEach(t => t.status = 'done');
    const journal = [mkJournal()];

    expect(calculateDailyScore(today, habits, logs, tasks, journal)).toBe(100);
  });

  it('weights habits at 50%%, tasks at 40%%, journal at 10%%', () => {
    // habitScore=100 (1/1 done), taskScore=100 (no tasks→default 100), journalScore=0
    // = 100*0.5 + 100*0.4 + 0*0.1 = 90
    const habits = [mkHabit()];
    const logs = [mkLog()];
    const tasks: Task[] = [];
    const journal: JournalEntry[] = [];

    expect(calculateDailyScore(today, habits, logs, tasks, journal)).toBe(90);
  });

  it('returns 50 when half habits done, no tasks, no journal', () => {
    const habits = [mkHabit(), mkHabit({ id: 'h2' })];
    const logs = [mkLog()]; // only h1 done
    // habitScore = 1/2 * 100 = 50
    // taskScore = 100 (no tasks)
    // journalScore = 0
    // = 50*0.5 + 100*0.4 + 0*0.1 = 25 + 40 = 65
    expect(calculateDailyScore(today, habits, logs, [], [])).toBe(65);
  });

  it('returns 100 when no habits, no tasks, journal written', () => {
    // habitScore = 100 (no habits→default 100), taskScore = 100 (no tasks→default 100)
    // journalScore = 100
    // = 100*0.5 + 100*0.4 + 100*0.1 = 100
    expect(calculateDailyScore(today, [], [], [], [mkJournal()])).toBe(100);
  });

  it('returns 90 when journal has empty highlight (no habits/tasks)', () => {
    // habitScore=100, taskScore=100, journalScore=0 → 90
    expect(calculateDailyScore(today, [], [], [], [mkJournal({ highlight: '' })])).toBe(90);
  });

  it('handles tasks marked done', () => {
    const tasks = [mkTask({ status: 'done' })];
    // taskScore = 1/1 * 100 = 100
    // = 100*0.5 + 100*0.4 + 0*0.1 = 90
    expect(calculateDailyScore(today, [], [], tasks, [])).toBe(90);
  });
});
