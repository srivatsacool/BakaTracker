import { describe, it, expect } from 'vitest';
import type { Habit, HabitLog } from '../../types';

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

/**
 * Reproduce habitToV2 from stateService.ts:186-208.
 * This is the function that serializes habits + logs for sync.
 */
function habitToV2(habit: Habit, logs: HabitLog[]): Record<string, unknown> {
  return {
    name: habit.name,
    target: 1,
    period: 'day',
    streak: 0,
    log: logs
      .filter((l) => l.habit_id === habit.id)
      .map((l) => {
        const num = Number(l.value);
        const isNumeric = !Number.isNaN(num);
        return {
          date: l.date,
          count: isNumeric ? num : 1,
          ...(isNumeric ? {} : { value: String(l.value) }),
        };
      }),
  };
}

describe('habitToV2', () => {
  it('preserves checkbox value as count', () => {
    const habit = mkHabit({ type: 'checkbox' });
    const logs = [mkLog({ value: 1 })];
    const result = habitToV2(habit, logs);
    expect(result.log).toEqual([{ date: today, count: 1 }]);
  });

  it('preserves counter value as count', () => {
    const habit = mkHabit({ type: 'counter' });
    const logs = [mkLog({ value: 5 })];
    const result = habitToV2(habit, logs);
    expect(result.log).toEqual([{ date: today, count: 5 }]);
  });

  it('preserves numeric value as count', () => {
    const habit = mkHabit({ type: 'numeric' });
    const logs = [mkLog({ value: 42 })];
    const result = habitToV2(habit, logs);
    expect(result.log).toEqual([{ date: today, count: 42 }]);
  });

  it('preserves mood emoji in value field (NOT collapsed to count=1)', () => {
    const habit = mkHabit({ type: 'mood' });
    const logs = [mkLog({ value: '😄' })];
    const result = habitToV2(habit, logs);
    expect(result.log).toEqual([{ date: today, count: 1, value: '😄' }]);
  });

  it('preserves energy label in value field', () => {
    const habit = mkHabit({ type: 'energy' });
    const logs = [mkLog({ value: 'high' })];
    const result = habitToV2(habit, logs);
    expect(result.log).toEqual([{ date: today, count: 1, value: 'high' }]);
  });

  it('preserves energy "low" label', () => {
    const habit = mkHabit({ type: 'energy' });
    const logs = [mkLog({ value: 'low' })];
    const result = habitToV2(habit, logs);
    expect(result.log).toEqual([{ date: today, count: 1, value: 'low' }]);
  });

  it('preserves energy "med" label', () => {
    const habit = mkHabit({ type: 'energy' });
    const logs = [mkLog({ value: 'med' })];
    const result = habitToV2(habit, logs);
    expect(result.log).toEqual([{ date: today, count: 1, value: 'med' }]);
  });

  it('preserves all mood emojis', () => {
    const habit = mkHabit({ type: 'mood' });
    const moods = ['😞', '😐', '🙂', '😄'];
    for (const mood of moods) {
      const logs = [mkLog({ value: mood })];
      const result = habitToV2(habit, logs);
      expect(result.log).toEqual([{ date: today, count: 1, value: mood }]);
    }
  });

  it('filters logs to only matching habit_id', () => {
    const habit = mkHabit({ id: 'h1' });
    const logs = [
      mkLog({ habit_id: 'h1', value: 1 }),
      mkLog({ id: 'l2', habit_id: 'h2', value: 5 }),
    ];
    const result = habitToV2(habit, logs);
    expect(result.log).toHaveLength(1);
    expect((result.log as any[])[0].count).toBe(1);
  });

  it('returns empty log array when no matching logs', () => {
    const habit = mkHabit({ id: 'h1' });
    const logs = [mkLog({ habit_id: 'h2' })];
    const result = habitToV2(habit, logs);
    expect(result.log).toEqual([]);
  });
});
