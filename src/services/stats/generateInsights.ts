import type { HabitLog, Task } from '../../types';

export function generateInsights(habitLogs: HabitLog[], tasks: Task[]): string[] {
  const insights: string[] = [];
  
  // Average Sleep Calculation
  const sleepLogs = habitLogs.filter(l => l.habit_id === 'h4' && Number(l.value) > 0);
  if (sleepLogs.length > 0) {
    const totalSleep = sleepLogs.reduce((sum, l) => sum + Number(l.value), 0);
    const avgSleep = (totalSleep / sleepLogs.length).toFixed(1);
    insights.push(`Your average sleep is ${avgSleep} hours per night. ${Number(avgSleep) >= 7 ? 'Great recovery!' : 'Try aiming for 7-8 hours.'}`);
  }

  // Average Screen Time
  const screenLogs = habitLogs.filter(l => l.habit_id === 'h6' && Number(l.value) > 0);
  if (screenLogs.length > 0) {
    const totalScreen = screenLogs.reduce((sum, l) => sum + Number(l.value), 0);
    const avgScreen = (totalScreen / screenLogs.length).toFixed(1);
    insights.push(`Average screen time is ${avgScreen} hours daily. ${Number(avgScreen) < 4 ? 'Excellent screen hygiene!' : 'Try reducing screen duration.'}`);
  }

  // Gym Consistency Check
  const gymLogs = habitLogs.filter(l => l.habit_id === 'h1');
  const gymDaysCount = gymLogs.filter(l => l.value === 1 || l.value === '1' || (l.value as any) === true).length;
  if (gymDaysCount > 0) {
    insights.push(`You worked out 💪 ${gymDaysCount} times in total. Consistent physical activity boosts focus and reduces ADHD restlessness.`);
  }

  // Task completions
  const completedTasksCount = tasks.filter(t => t.status === 'done').length;
  if (completedTasksCount > 0) {
    insights.push(`You cleared 🎯 ${completedTasksCount} goals. Every cleared goal releases visual progress and builds self-trust.`);
  }

  // Default insight if empty
  if (insights.length === 0) {
    insights.push('Log habits and complete tasks for a few days to generate personalized growth insights!');
  }

  return insights;
}
