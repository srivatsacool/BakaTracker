// Habits Page
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BottomNav, HabitCard, ProgressBar } from '../components';
import { createHabit, logHabitCompletion, deleteHabit } from '../services/sheets';

export const Habits = () => {
  const { habits, setHabits, habitLogs, setHabitLogs, getTodayProgress, getHabitStatus, refreshData } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', icon: 'check_circle' });
  const [isLoading, setIsLoading] = useState(false);
  
  const todayProgress = getTodayProgress();
  
  const handleToggleHabit = async (habitId) => {
    try {
      const isCurrentlyCompleted = getHabitStatus(habitId);
      
      if (!isCurrentlyCompleted) {
        const log = await logHabitCompletion(habitId, true);
        setHabitLogs([...habitLogs, log]);
      }
      // Note: For simplicity, we don't "uncomplete" habits. 
      // In a full implementation, you'd delete the log entry.
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  };
  
  const handleAddHabit = async () => {
    if (!newHabit.name.trim()) return;
    
    setIsLoading(true);
    try {
      const habit = await createHabit(newHabit);
      setHabits([...habits, habit]);
      setNewHabit({ name: '', icon: 'check_circle' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add habit:', error);
    }
    setIsLoading(false);
  };
  
  const handleDeleteHabit = async (habitId) => {
    try {
      await deleteHabit(habitId);
      setHabits(habits.filter(h => h.id !== habitId));
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };
  
  const iconOptions = [
    'check_circle', 'water_drop', 'directions_run', 'menu_book', 'fitness_center',
    'local_cafe', 'bedtime', 'self_improvement', 'favorite', 'spa',
    'restaurant', 'music_note', 'code', 'brush', 'school'
  ];
  
  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col items-center justify-start overflow-x-hidden">
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen relative pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
          <h2 className="text-slate-900 dark:text-white text-2xl font-extrabold leading-tight tracking-tight">
            My Habits
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center size-10 rounded-full bg-primary text-background-dark hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined font-bold">add</span>
          </button>
        </div>
        
        {/* Progress Card */}
        <div className="px-4 py-2 mt-4">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-white/5">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-slate-900 dark:text-white text-base font-bold leading-normal">
                  Daily Progress
                </p>
                <p className="text-slate-500 dark:text-[#92c9ad] text-xs font-medium mt-1">
                  {todayProgress >= 80 ? "Amazing work!" : todayProgress >= 50 ? "Keep it up!" : "You're almost there."}
                </p>
              </div>
              <p className="text-primary text-xl font-bold tracking-tight">{todayProgress}%</p>
            </div>
            <ProgressBar progress={todayProgress} showLabel={false} size="sm" />
          </div>
        </div>
        
        {/* Habits List */}
        <div className="flex flex-col gap-3 px-4 mt-4">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isCompleted={getHabitStatus(habit.id)}
              onToggle={handleToggleHabit}
            />
          ))}
          
          {habits.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <span className="material-symbols-outlined text-5xl mb-3">add_task</span>
              <p className="text-base font-medium">No habits yet</p>
              <p className="text-sm mt-1">Tap + to add your first habit</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Habit</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  placeholder="e.g., Drink 8 glasses of water"
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-background-dark border-0 text-slate-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewHabit({ ...newHabit, icon })}
                      className={`size-10 rounded-lg flex items-center justify-center transition-all ${
                        newHabit.icon === icon
                          ? 'bg-primary text-background-dark'
                          : 'bg-gray-100 dark:bg-background-dark text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleAddHabit}
                disabled={isLoading || !newHabit.name.trim()}
                className="w-full py-4 rounded-xl bg-primary text-background-dark font-bold text-base shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isLoading ? 'Adding...' : 'Add Habit'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
};

export default Habits;
