// Dashboard Page
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BottomNav, ProgressBar, TaskCard } from '../components';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, habits, tasks, getTodayProgress, getHabitStatus } = useApp();
  
  const todayProgress = getTodayProgress();
  const completedHabits = habits.filter(h => getHabitStatus(h.id)).length;
  
  // Get today's tasks
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => 
    t.dueDate === today || !t.dueDate
  ).slice(0, 3);
  
  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-auto min-h-screen w-full flex flex-col overflow-x-hidden pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-transparent dark:border-white/5 transition-all">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className="bg-center bg-no-repeat bg-cover rounded-full size-10 ring-2 ring-primary/20"
              style={{
                backgroundImage: user?.picture
                  ? `url("${user.picture}")`
                  : 'linear-gradient(135deg, #13ec80 0%, #0d9d5c 100%)',
              }}
            >
              {!user?.picture && (
                <span className="flex items-center justify-center size-full text-white font-bold">
                  {user?.name?.[0] || 'U'}
                </span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 size-3 bg-primary border-2 border-background-light dark:border-background-dark rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-none mb-1">
              {getGreeting()},
            </span>
            <h2 className="text-lg font-bold leading-none tracking-tight">
              {user?.given_name || user?.name || 'User'}
            </h2>
          </div>
        </div>
        <button className="flex items-center justify-center size-10 rounded-full bg-transparent hover:bg-gray-200 dark:hover:bg-white/5 transition-colors relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-background-light dark:border-background-dark" />
        </button>
      </header>
      
      {/* Progress Card */}
      <section className="px-4 pt-6 pb-2">
        <div className="relative w-full overflow-hidden rounded-3xl bg-surface-light dark:bg-surface-dark p-6 shadow-sm border border-gray-200 dark:border-white/5">
          <div className="absolute -top-24 -right-24 size-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Daily Progress
                </p>
                <h3 className="text-2xl font-bold dark:text-white leading-tight">
                  {todayProgress >= 80 ? "You're on fire!" : todayProgress >= 50 ? 'Keep it up!' : "Let's get started!"}
                </h3>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-4xl font-extrabold text-primary tracking-tighter">
                  {todayProgress}%
                </span>
              </div>
            </div>
            <ProgressBar
              progress={todayProgress}
              showLabel={true}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completedHabits} of {habits.length} habits completed
            </p>
          </div>
        </div>
      </section>
      
      {/* Habits Section */}
      <section className="py-4">
        <div className="px-4 mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Habits</h3>
          <button
            onClick={() => navigate('/habits')}
            className="text-primary text-sm font-bold hover:text-primary/80 transition-colors"
          >
            See All
          </button>
        </div>
        <div className="w-full overflow-x-auto no-scrollbar pb-2 pl-4">
          <div className="flex gap-3 min-w-min pr-4">
            {habits.slice(0, 5).map((habit) => {
              const isCompleted = getHabitStatus(habit.id);
              const progress = isCompleted ? 100 : 0;
              const radius = 33;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (progress / 100) * circumference;
              
              return (
                <div key={habit.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="relative size-[76px] rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/5 flex items-center justify-center transition-transform active:scale-95">
                    <svg className="absolute inset-0 size-full -rotate-90 p-1" viewBox="0 0 76 76">
                      <circle
                        className="text-gray-200 dark:text-gray-700/30"
                        cx="38"
                        cy="38"
                        fill="transparent"
                        r="33"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <circle
                        className={`transition-all duration-500 ${isCompleted ? 'text-primary drop-shadow-[0_0_2px_rgba(19,236,128,0.5)]' : 'text-transparent'}`}
                        cx="38"
                        cy="38"
                        fill="transparent"
                        r="33"
                        stroke="currentColor"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        strokeWidth="3"
                      />
                    </svg>
                    <span
                      className={`material-symbols-outlined ${isCompleted ? 'text-primary' : 'text-gray-400 dark:text-white'}`}
                      style={{ fontSize: '28px' }}
                    >
                      {habit.icon || 'check_circle'}
                    </span>
                  </div>
                  <span className={`text-xs ${isCompleted ? 'font-semibold text-gray-600 dark:text-gray-300' : 'font-medium text-gray-500 dark:text-gray-400'}`}>
                    {habit.name}
                  </span>
                </div>
              );
            })}
            {habits.length === 0 && (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <div className="size-[76px] rounded-2xl bg-surface-light dark:bg-surface-dark border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">add</span>
                </div>
                <span className="text-xs">Add Habit</span>
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Screenshot to Alarm Feature */}
      <section className="px-4 pb-4">
        <button
          onClick={() => navigate('/screenshot-upload')}
          className="relative w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden group hover:border-primary/50 dark:hover:border-primary/50 transition-all active:scale-[0.98]"
        >
          <div className="relative shrink-0 flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>add_a_photo</span>
          </div>
          <div className="flex-1 text-left z-10">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Screenshot to Alarm</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-background-dark shadow-sm">
                NEW
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Turn your screenshots into alarms instantly
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center size-8 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-400 group-hover:bg-primary group-hover:text-background-dark transition-colors">
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </div>
          <div className="absolute -right-8 -bottom-8 size-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
        </button>
      </section>
      
      {/* Today's Tasks */}
      <section className="px-4 py-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Today's Tasks</h3>
          <button
            onClick={() => navigate('/tasks')}
            className="text-primary text-sm font-bold hover:text-primary/80 transition-colors"
          >
            See All
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {todayTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => {}}
            />
          ))}
          {todayTasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
              <p className="text-sm">No tasks for today</p>
            </div>
          )}
        </div>
      </section>
      
      {/* Speech Mode FAB */}
      <button
        onClick={() => navigate('/speech-mode')}
        className="fixed bottom-24 right-5 size-14 rounded-full bg-primary text-background-dark shadow-[0_8px_25px_rgba(19,236,128,0.4)] flex items-center justify-center z-40 hover:scale-105 active:scale-90 transition-transform duration-200"
      >
        <span className="material-symbols-outlined text-3xl font-medium">mic</span>
      </button>
      
      <BottomNav />
    </div>
  );
};

export default Dashboard;
