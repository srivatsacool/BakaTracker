// Tasks Page
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BottomNav, TaskCard } from '../components';
import { createTask, toggleTaskComplete, deleteTask } from '../services/sheets';

export const Tasks = () => {
  const { user, tasks, setTasks } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium',
    category: 'general',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const categories = ['all', 'work', 'personal', 'health', 'general'];
  
  // Get today's date info
  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i);
    return {
      day: days[i],
      date: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
  
  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (selectedCategory === 'all') return true;
    return task.category === selectedCategory;
  });
  
  const incompleteTasks = filteredTasks.filter((t) => t.completed !== 'true');
  const completedTasks = filteredTasks.filter((t) => t.completed === 'true');
  
  const handleToggleTask = async (taskId) => {
    try {
      await toggleTaskComplete(taskId);
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, completed: t.completed === 'true' ? 'false' : 'true' } : t
        )
      );
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };
  
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    
    setIsLoading(true);
    try {
      const task = await createTask(newTask);
      setTasks([...tasks, task]);
      setNewTask({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        priority: 'medium',
        category: 'general',
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
    setIsLoading(false);
  };
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  
  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="pt-8 px-4 pb-2 sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {getGreeting()}, {user?.given_name || 'User'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Here's your plan for today
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-background-dark hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
        
        {/* Week Calendar */}
        <div className="flex justify-between items-center py-2 overflow-x-auto no-scrollbar gap-2">
          {weekDates.map(({ day, date, isToday }) => (
            <button
              key={day}
              className={`flex flex-col items-center justify-center min-w-[50px] h-[70px] rounded-xl transition-all ${
                isToday
                  ? 'bg-primary text-black shadow-lg shadow-primary/20 transform scale-105'
                  : 'bg-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-surface-dark'
              }`}
            >
              <span className={`text-xs mb-1 ${isToday ? 'font-bold' : 'font-semibold'}`}>{day}</span>
              <span className="text-lg font-bold">{date}</span>
            </button>
          ))}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        {/* Category Filters */}
        <div className="flex gap-3 py-4 overflow-x-auto no-scrollbar items-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 flex items-center justify-center h-9 px-4 rounded-lg font-medium text-sm capitalize transition-all active:scale-95 ${
                selectedCategory === category
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-background-dark shadow-sm'
                  : 'bg-slate-200 dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-[#234836]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {/* Tasks List */}
        <div className="flex flex-col gap-3 mt-2">
          {incompleteTasks.length > 0 && (
            <>
              <div className="flex justify-between items-center mt-2 mb-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Up Next</h2>
              </div>
              {incompleteTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={handleToggleTask} />
              ))}
            </>
          )}
          
          {completedTasks.length > 0 && (
            <>
              <div className="flex justify-between items-center mt-6 mb-1">
                <h2 className="text-lg font-bold text-slate-400 dark:text-slate-500">Completed</h2>
              </div>
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={handleToggleTask} />
              ))}
            </>
          )}
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <span className="material-symbols-outlined text-5xl mb-3">task_alt</span>
              <p className="text-base font-medium">No tasks yet</p>
              <p className="text-sm mt-1">Tap + to add your first task</p>
            </div>
          )}
        </div>
      </main>
      
      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Task</h3>
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
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g., Submit project report"
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-background-dark border-0 text-slate-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Description (optional)
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add details..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-background-dark border-0 text-slate-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-background-dark border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newTask.dueTime}
                    onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-background-dark border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Category
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['work', 'personal', 'health', 'general'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewTask({ ...newTask, category: cat })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        newTask.category === cat
                          ? 'bg-primary text-background-dark'
                          : 'bg-gray-100 dark:bg-background-dark text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Priority
                </label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setNewTask({ ...newTask, priority })}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        newTask.priority === priority
                          ? priority === 'high'
                            ? 'bg-red-500 text-white'
                            : priority === 'medium'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-green-500 text-white'
                          : 'bg-gray-100 dark:bg-background-dark text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleAddTask}
                disabled={isLoading || !newTask.title.trim()}
                className="w-full py-4 rounded-xl bg-primary text-background-dark font-bold text-base shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isLoading ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
};

export default Tasks;
