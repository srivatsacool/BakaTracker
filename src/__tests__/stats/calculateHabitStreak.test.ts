import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateHabitStreak } from '../../services/habits/calculateHabitStreak';
import type { Habit, HabitLog } from '../../types';

function getDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

const mkHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1', name: 'Test', type: 'checkbox', icon: '✅', xp: 10,
  stat: 'discipline', active: true,
  created_at: getDateStr(30), updated_at: getDateStr(0),
  ...overrides,
});

const mkLog = (dateOffset: number, overrides: Partial<HabitLog> = {}): HabitLog => ({
  id: `l-${dateOffset}`, date: getDateStr(dateOffset), habit_id: 'h1',
  value: 1, xp_earned: 10, created_at: getDateStr(dateOffset),
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('calculateHabitStreak', () => {
  it('returns 0 when no logs exist', () => {
    expect(calculateHabitStreak(mkHabit(), [])).toBe(0);
  });

  it('returns 1 when only today is completed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00'));
    expect(calculateHabitStreak(mkHabit(), [mkLog(0)])).toBe(1);
  });

  it('returns 2 for today + yesterday streak', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00'));
    expect(calculateHabitStreak(mkHabit(), [mkLog(0), mkLog(1)])).toBe(2);
  });

  it('returns 3 for a 3-day streak', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00'));
    expect(calculateHabitStreak(mkHabit(), [mkLog(0), mkLog(1), mkLog(2)])).toBe(3);
  });

  it('returns 1 when today not completed but yesterday is (grace window)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00'));
    // The function allows yesterday-only as a 1-day streak
    expect(calculateHabitStreak(mkHabit(), [mkLog(1)])).toBe(1);
  });

  it('breaks streak at a gap', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00'));
    // Today + yesterday done, day before yesterday missing
    expect(calculateHabitStreak(mkHabit(), [mkLog(0), mkLog(1), mkLog(3)])).toBe(2);
  });

  it('counts mood habits as completed when value is non-empty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00'));
    const habit = mkHabit({ type: 'mood' });
    const logs = [mkLog(0, { value: '😄' }), mkLog(1, { value: '😐' })];
    expect(calculateHabitStreak(habit, logs)).toBe(2);
  });

  it('counts energy habits as completed when value is non-empty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00'));
    const habit = mkHabit({ type: 'energy' });
    const logs = [mkLog(0, { value: 'high' }), mkLog(1, { value: 'med' })];
    expect(calculateHabitStreak(habit, logs)).toBe(2);
  });
});
