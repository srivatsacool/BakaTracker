import { describe, it, expect } from 'vitest';
import { calculateXP, areaToStat } from '../../services/stats/calculateXP';
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

describe('areaToStat', () => {
  it('maps areas to stats correctly', () => {
    expect(areaToStat('health')).toBe('health');
    expect(areaToStat('career')).toBe('career');
    expect(areaToStat('learning')).toBe('knowledge');
    expect(areaToStat('personal')).toBe('discipline');
    expect(areaToStat('creativity')).toBe('creativity');
  });
});

describe('calculateXP', () => {
  it('returns all zeros with no data', () => {
    const result = calculateXP([], [], [], []);
    expect(Object.values(result).every(v => v === 0)).toBe(true);
  });

  it('calculates XP from checkbox habit', () => {
    const habits = [mkHabit({ xp: 25, stat: 'health' })];
    const logs = [mkLog({ value: 1 })];
    const result = calculateXP(habits, logs, [], []);
    expect(result.health).toBe(25);
  });

  it('calculates XP from counter habit (value * xp)', () => {
    const habits = [mkHabit({ type: 'counter', xp: 5, stat: 'knowledge' })];
    const logs = [mkLog({ value: 3 })];
    const result = calculateXP(habits, logs, [], []);
    expect(result.knowledge).toBe(15); // 3 * 5
  });

  it('calculates XP from numeric habit', () => {
    const habits = [mkHabit({ type: 'numeric', xp: 10, stat: 'creativity' })];
    const logs = [mkLog({ value: 42 })];
    const result = calculateXP(habits, logs, [], []);
    expect(result.creativity).toBe(10);
  });

  it('calculates XP from mood habit', () => {
    const habits = [mkHabit({ type: 'mood', xp: 8, stat: 'discipline' })];
    const logs = [mkLog({ value: '😄' })];
    const result = calculateXP(habits, logs, [], []);
    expect(result.discipline).toBe(8);
  });

  it('calculates XP from energy habit', () => {
    const habits = [mkHabit({ type: 'energy', xp: 5, stat: 'career' })];
    const logs = [mkLog({ value: 'high' })];
    const result = calculateXP(habits, logs, [], []);
    expect(result.career).toBe(5);
  });

  it('does not award XP for unchecked checkbox', () => {
    const habits = [mkHabit({ xp: 10 })];
    const logs = [mkLog({ value: 0 })];
    const result = calculateXP(habits, logs, [], []);
    expect(result.discipline).toBe(0);
  });

  it('ignores logs for habits that no longer exist', () => {
    const habits: Habit[] = [];
    const logs = [mkLog()];
    const result = calculateXP(habits, logs, [], []);
    expect(Object.values(result).every(v => v === 0)).toBe(true);
  });

  it('accumulates XP across multiple habits', () => {
    const habits = [
      mkHabit({ id: 'h1', xp: 10, stat: 'health' }),
      mkHabit({ id: 'h2', xp: 20, stat: 'knowledge' }),
    ];
    const logs = [
      mkLog({ habit_id: 'h1', value: 1 }),
      mkLog({ id: 'l2', habit_id: 'h2', value: 1 }),
    ];
    const result = calculateXP(habits, logs, [], []);
    expect(result.health).toBe(10);
    expect(result.knowledge).toBe(20);
  });
});
