import { describe, it, expect } from 'vitest';
import { getCurrentWeekDates } from '../../lib/utils';

describe('getCurrentWeekDates', () => {
  it('returns exactly 7 days Monday through Sunday', () => {
    const week = getCurrentWeekDates(new Date('2026-09-17T12:00:00')); // Thursday
    expect(week).toHaveLength(7);
    expect(week.map(d => d.dayLabel)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(week[0].date).toBe('2026-09-14'); // Monday
    expect(week[6].date).toBe('2026-09-20'); // Sunday
  });

  it('correctly handles Sunday reference date without skipping to next week', () => {
    const week = getCurrentWeekDates(new Date('2026-09-20T12:00:00')); // Sunday
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe('2026-09-14'); // Monday of current week
    expect(week[6].date).toBe('2026-09-20'); // Sunday of current week
    expect(week[6].dayNumber).toBe(20);
  });

  it('correctly handles Monday reference date', () => {
    const week = getCurrentWeekDates(new Date('2026-09-14T12:00:00')); // Monday
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe('2026-09-14');
    expect(week[6].date).toBe('2026-09-20');
  });

  it('correctly flags isToday', () => {
    const week = getCurrentWeekDates();
    const todayItems = week.filter(d => d.isToday);
    expect(todayItems).toHaveLength(1);
  });
});
