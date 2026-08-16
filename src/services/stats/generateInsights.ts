import type { Habit, HabitLog, Task } from '../../types';
import { isHabitCompleted } from '../../lib/utils';
import { calculateHabitStreak } from '../habits/calculateHabitStreak';

/**
 * generateInsights — honest, data-derived observations for the Journey page.
 *
 * Fixed (F7): the old version hardcoded legacy habit ids (h1/h4/h6) that no
 * longer exist in the store, so its habit insights were dead code and only
 * the task line ever fired. This rewrite derives everything from the REAL
 * habit list + logs: it filters by actual habit ids, never fabricates
 * numbers, and falls back to an honest "not enough data" line when the
 * record is thin. No achievements — that decision is open with the user.
 */
export function generateInsights(habitLogs: HabitLog[], tasks: Task[], habits: Habit[] = []): string[] {
  const insights: string[] = [];

  const activeHabits = habits.filter(h => h.active);
  const logsByHabit = (habitId: string): HabitLog[] =>
    habitLogs.filter(l => l.habit_id === habitId);

  // 1. Most consistent habit — most completed check-ins (real ids only).
  const counts = activeHabits
    .map(h => ({ habit: h, count: logsByHabit(h.id).filter(l => isHabitCompleted(h, l)).length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);

  if (counts.length > 0) {
    const top = counts[0];
    insights.push(
      `Most consistent: ${top.habit.icon} ${top.habit.name} — ${top.count} check-in${top.count === 1 ? '' : 's'} logged.`
    );
  }

  // 2. Longest current streak (only worth saying once it means something).
  const streaks = activeHabits
    .map(h => ({ habit: h, streak: calculateHabitStreak(h, habitLogs) }))
    .filter(s => s.streak >= 2)
    .sort((a, b) => b.streak - a.streak);

  if (streaks.length > 0) {
    const top = streaks[0];
    insights.push(`${top.habit.icon} ${top.habit.name} is on a ${top.streak}-day streak. Keep the rhythm.`);
  }

  // 3. Average for numeric/counter habits — only after enough data points,
  // and the unit is whatever the habit's own name says (no invented units).
  const measuredHabits = activeHabits.filter(h => h.type === 'numeric' || h.type === 'counter');
  for (const h of measuredHabits) {
    const logs = logsByHabit(h.id).filter(l => Number(l.value) > 0);
    if (logs.length >= 3) {
      const avg = (logs.reduce((sum, l) => sum + Number(l.value), 0) / logs.length).toFixed(1);
      insights.push(`Average ${h.name.toLowerCase()}: ${avg} per logged day.`);
      break; // one average insight is enough for the grid
    }
  }

  // 4. Last-7-day pace — check-ins across real habits, trailing week.
  const weekAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // trailing 7 days including today
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const recentCount = activeHabits.reduce((acc, h) => {
    const recent = logsByHabit(h.id).filter(l => l.date >= weekAgo && isHabitCompleted(h, l)).length;
    return acc + recent;
  }, 0);
  if (recentCount > 0) {
    insights.push(`${recentCount} habit check-in${recentCount === 1 ? '' : 's'} in the last 7 days.`);
  }

  // 5. Tasks — kept from the original (honest, data-derived).
  const completedTasksCount = tasks.filter(t => t.status === 'done').length;
  if (completedTasksCount > 0) {
    insights.push(`You cleared 🎯 ${completedTasksCount} goal${completedTasksCount === 1 ? '' : 's'}. Every cleared goal builds self-trust.`);
  }

  // Honest fallback when there isn't enough data yet.
  if (insights.length === 0) {
    insights.push('Not enough data yet — log a few habits or clear a quest and patterns will start to surface here.');
  }

  return insights.slice(0, 5);
}
