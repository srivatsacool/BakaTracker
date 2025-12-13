// Stats Page
import { useApp } from '../context/AppContext';
import { BottomNav, TopBar } from '../components';

export const Stats = () => {
  const { habits, habitLogs, tasks } = useApp();
  
  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = habitLogs.filter(log => log.date === today && log.completed === 'true');
  const todayProgress = habits.length > 0 ? Math.round((todayLogs.length / habits.length) * 100) : 0;
  
  // Calculate weekly stats
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  
  const weeklyData = last7Days.map(date => {
    const dayLogs = habitLogs.filter(log => log.date === date && log.completed === 'true');
    return habits.length > 0 ? (dayLogs.length / habits.length) * 100 : 0;
  });
  
  const weeklyAvg = weeklyData.length > 0 ? Math.round(weeklyData.reduce((a, b) => a + b, 0) / weeklyData.length) : 0;
  
  // Task stats
  const completedTasks = tasks.filter(t => t.completed === 'true').length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const sortedDates = [...new Set(habitLogs.filter(l => l.completed === 'true').map(l => l.date))].sort().reverse();
    
    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];
      
      if (sortedDates[i] === expected) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };
  
  const currentStreak = calculateStreak();
  
  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden antialiased">
      <TopBar title="Your Progress" backPath="/dashboard" />
      
      <main className="flex-1 w-full max-w-md mx-auto p-4 space-y-6 pb-24">
        {/* Time Period Toggle */}
        <div className="bg-slate-200 dark:bg-surface-dark p-1.5 rounded-xl flex shadow-inner">
          <label className="flex-1 cursor-pointer">
            <input defaultChecked className="peer sr-only" name="timeframe" type="radio" />
            <div className="py-2 text-sm font-bold text-center rounded-lg text-slate-500 dark:text-text-secondary peer-checked:bg-white dark:peer-checked:bg-background-dark peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm transition-all duration-200">
              Daily
            </div>
          </label>
          <label className="flex-1 cursor-pointer">
            <input className="peer sr-only" name="timeframe" type="radio" />
            <div className="py-2 text-sm font-medium text-center rounded-lg text-slate-500 dark:text-text-secondary peer-checked:bg-white dark:peer-checked:bg-background-dark peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm transition-all duration-200">
              Weekly
            </div>
          </label>
        </div>
        
        {/* Focus Score Card */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Focus Score</h3>
            <div className="relative size-48 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-slate-100 dark:text-background-dark/50"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="12"
                />
                <circle
                  className="drop-shadow-[0_0_10px_rgba(19,236,128,0.4)]"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="42"
                  stroke="#13ec80"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - todayProgress / 100)}
                  strokeLinecap="round"
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {todayProgress}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-text-secondary mt-1">
                  {todayProgress >= 80 ? 'Excellent' : todayProgress >= 60 ? 'Good' : todayProgress >= 40 ? 'Fair' : 'Getting Started'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-orange-500">local_fire_department</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Streak</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{currentStreak}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">days</p>
          </div>
          
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-blue-500">trending_up</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Weekly Avg</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{weeklyAvg}%</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">completion</p>
          </div>
          
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-green-500">check_circle</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tasks Done</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{completedTasks}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">of {tasks.length}</p>
          </div>
          
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-purple-500">calendar_month</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Habits</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{habits.length}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">tracked</p>
          </div>
        </div>
        
        {/* Weekly Chart */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">This Week</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden h-24 flex flex-col justify-end">
                  <div
                    className="bg-primary rounded-full transition-all duration-500"
                    style={{ height: `${weeklyData[i] || 0}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Stats;
