// Task Card Component
import { useState } from 'react';

export const TaskCard = ({ task, onToggle, onEdit }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const isCompleted = task.completed === 'true' || task.completed === true;
  
  const handleToggle = (e) => {
    e.stopPropagation();
    setIsAnimating(true);
    onToggle?.(task.id);
    setTimeout(() => setIsAnimating(false), 300);
  };
  
  const priorityColors = {
    high: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300',
    low: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300',
  };
  
  const categoryColors = {
    work: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
    personal: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300',
    health: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300',
    general: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300',
  };
  
  return (
    <div
      onClick={() => onEdit?.(task)}
      className={`group relative flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-100 dark:border-none transition-all hover:translate-y-[-2px] hover:shadow-md cursor-pointer ${
        isAnimating ? 'scale-95' : ''
      }`}
    >
      {/* Checkbox */}
      <div className="flex-none pt-0.5">
        <button
          onClick={handleToggle}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isCompleted
              ? 'bg-primary border-primary text-white'
              : 'border-slate-300 dark:border-slate-500 hover:border-primary dark:hover:border-primary'
          }`}
        >
          {isCompleted && (
            <span className="material-symbols-outlined text-sm">check</span>
          )}
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <span
            className={`text-base font-semibold ${
              isCompleted
                ? 'text-slate-400 dark:text-slate-500 line-through'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {task.title}
          </span>
          {task.category && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                categoryColors[task.category] || categoryColors.general
              }`}
            >
              {task.category}
            </span>
          )}
        </div>
        
        {task.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {task.dueTime && (
            <div className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-[#11221a] px-2 py-1 rounded">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {task.dueTime}
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-[#11221a] px-2 py-1 rounded">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
          {task.priority && task.priority !== 'medium' && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                priorityColors[task.priority] || ''
              }`}
            >
              {task.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
