// Goals Page - Short, Mid, and Long-term goals
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components';

// Goal categories with their metadata
const GOAL_CATEGORIES = [
  { 
    id: 'short', 
    label: 'Short-term', 
    subtitle: 'This week',
    icon: 'sprint', 
    color: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400'
  },
  { 
    id: 'mid', 
    label: 'Mid-term', 
    subtitle: 'This month',
    icon: 'calendar_month', 
    color: 'bg-purple-500',
    lightBg: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400'
  },
  { 
    id: 'long', 
    label: 'Long-term', 
    subtitle: 'This year',
    icon: 'flag', 
    color: 'bg-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400'
  },
];

export const Goals = () => {
  const navigate = useNavigate();
  
  // Goals state - in production this would come from context/sheets
  const [goals, setGoals] = useState({
    short: [
      { id: 'g1', text: 'Complete project documentation', completed: false },
      { id: 'g2', text: 'Exercise 3 times', completed: true },
    ],
    mid: [
      { id: 'g3', text: 'Learn React Native basics', completed: false },
      { id: 'g4', text: 'Read 2 books', completed: false },
    ],
    long: [
      { id: 'g5', text: 'Get promoted to senior developer', completed: false },
      { id: 'g6', text: 'Build and launch a side project', completed: false },
    ],
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ text: '', category: 'short' });
  const [expandedCategory, setExpandedCategory] = useState('short');

  // Add a new goal
  const handleAddGoal = () => {
    if (!newGoal.text.trim()) return;
    
    const goal = {
      id: `goal_${Date.now()}`,
      text: newGoal.text.trim(),
      completed: false,
    };
    
    setGoals(prev => ({
      ...prev,
      [newGoal.category]: [...prev[newGoal.category], goal],
    }));
    
    setNewGoal({ text: '', category: 'short' });
    setShowAddModal(false);
  };

  // Toggle goal completion
  const toggleGoal = (category, goalId) => {
    setGoals(prev => ({
      ...prev,
      [category]: prev[category].map(g =>
        g.id === goalId ? { ...g, completed: !g.completed } : g
      ),
    }));
  };

  // Delete a goal
  const deleteGoal = (category, goalId) => {
    setGoals(prev => ({
      ...prev,
      [category]: prev[category].filter(g => g.id !== goalId),
    }));
  };

  // Get progress for a category
  const getProgress = (category) => {
    const categoryGoals = goals[category];
    if (categoryGoals.length === 0) return 0;
    const completed = categoryGoals.filter(g => g.completed).length;
    return Math.round((completed / categoryGoals.length) * 100);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display antialiased overflow-x-hidden pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
        </button>
        <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">My Goals</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center size-10 rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {/* Goal Categories */}
        <div className="flex flex-col gap-4">
          {GOAL_CATEGORIES.map((category) => {
            const categoryGoals = goals[category.id];
            const progress = getProgress(category.id);
            const isExpanded = expandedCategory === category.id;
            
            return (
              <div
                key={category.id}
                className={`bg-white dark:bg-surface-dark rounded-2xl shadow-sm border transition-all overflow-hidden ${
                  isExpanded 
                    ? 'border-primary/30 ring-2 ring-primary/10' 
                    : 'border-gray-200 dark:border-white/5'
                }`}
              >
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <div className={`size-12 rounded-xl ${category.lightBg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined ${category.textColor}`}>
                      {category.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {category.label}
                      </h3>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {category.subtitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${category.color} rounded-full transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-8">
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* Goals List - Expandable */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {categoryGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          goal.completed 
                            ? 'bg-gray-50 dark:bg-white/5' 
                            : 'bg-gray-100 dark:bg-background-dark'
                        }`}
                      >
                        <button
                          onClick={() => toggleGoal(category.id, goal.id)}
                          className={`size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            goal.completed
                              ? `${category.color} border-transparent`
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {goal.completed && (
                            <span className="material-symbols-outlined text-white text-sm">check</span>
                          )}
                        </button>
                        <span className={`flex-1 text-sm ${
                          goal.completed 
                            ? 'text-slate-400 line-through' 
                            : 'text-slate-700 dark:text-white'
                        }`}>
                          {goal.text}
                        </span>
                        <button
                          onClick={() => deleteGoal(category.id, goal.id)}
                          className="size-7 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>
                    ))}
                    
                    {categoryGoals.length === 0 && (
                      <div className="text-center py-4 text-slate-400 dark:text-slate-500">
                        <p className="text-sm">No goals yet. Add one!</p>
                      </div>
                    )}
                    
                    {/* Quick Add Button */}
                    <button
                      onClick={() => {
                        setNewGoal({ ...newGoal, category: category.id });
                        setShowAddModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 text-slate-400 hover:border-primary hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      <span className="text-sm font-medium">Add Goal</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Goal</h3>
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
                  Goal Description
                </label>
                <input
                  type="text"
                  value={newGoal.text}
                  onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })}
                  placeholder="What do you want to achieve?"
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-background-dark border-0 text-slate-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Timeframe
                </label>
                <div className="flex gap-2">
                  {GOAL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setNewGoal({ ...newGoal, category: cat.id })}
                      className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        newGoal.category === cat.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-white/10'
                      }`}
                    >
                      <span className={`material-symbols-outlined ${
                        newGoal.category === cat.id ? 'text-primary' : 'text-slate-400'
                      }`}>
                        {cat.icon}
                      </span>
                      <span className={`text-xs font-medium ${
                        newGoal.category === cat.id 
                          ? 'text-primary' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleAddGoal}
                disabled={!newGoal.text.trim()}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                Add Goal
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Goals;
