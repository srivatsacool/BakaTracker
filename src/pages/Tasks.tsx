import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Task, TaskStatus, TaskArea } from '../types';
import { Plus, Search, Star, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react';

export const Tasks: React.FC = () => {
  const { tasks, addTask, moveTask, toggleTodayTask, deleteTask } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<TaskArea | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] = useState<TaskStatus>('todo');

  // Form states
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [area, setArea] = useState<TaskArea>('personal');
  const [xp, setXp] = useState(10);
  const [today, setToday] = useState(false);
  const [dueDate, setDueDate] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask(title, notes, area, Number(xp) || 10, today, dueDate);
    
    // Reset form
    setTitle('');
    setNotes('');
    setArea('personal');
    setXp(10);
    setToday(false);
    setDueDate('');
    setShowAddForm(false);
  };

  const columns: { id: TaskStatus; label: string; bg: string }[] = [
    { id: 'backlog', label: 'Backlog', bg: 'bg-gray-100' },
    { id: 'todo', label: 'Todo', bg: 'bg-blue-50/50' },
    { id: 'doing', label: 'Doing', bg: 'bg-warning/10' },
    { id: 'done', label: 'Done', bg: 'bg-success/10' }
  ];

  const areas: (TaskArea | 'all')[] = ['all', 'health', 'career', 'learning', 'personal', 'creativity'];

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = selectedArea === 'all' || t.area === selectedArea;
    return matchesSearch && matchesArea;
  });

  const getAreaColor = (area: TaskArea) => {
    switch (area) {
      case 'health': return 'bg-success/20 text-success border-success/30';
      case 'career': return 'bg-warning/20 text-warning-dark border-warning/30';
      case 'learning': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'personal': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'creativity': return 'bg-accent-pink/20 text-accent-pink-dark border-accent-pink/30';
    }
  };

  const shiftStatus = (task: Task, direction: 'left' | 'right') => {
    const statusOrder: TaskStatus[] = ['backlog', 'todo', 'doing', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    let newIndex = currentIndex;
    
    if (direction === 'left' && currentIndex > 0) {
      newIndex--;
    } else if (direction === 'right' && currentIndex < statusOrder.length - 1) {
      newIndex++;
    }
    
    if (newIndex !== currentIndex) {
      moveTask(task.id, statusOrder[newIndex]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black">Master Planner Board</h2>
          <p className="text-xs text-gray-500 font-mono">Brain dump, organize, and map out your tasks.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="neo-button flex items-center gap-2 w-full md:w-auto"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Master Task</span>
        </button>
      </div>

      {/* Task Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="neo-card p-6 bg-white flex flex-col gap-4">
          <h3 className="text-md font-black border-b border-black pb-2">Create Master Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold font-mono">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Update resume"
                className="neo-input"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold font-mono">RPG Area</label>
              <select
                value={area}
                onChange={e => setArea(e.target.value as TaskArea)}
                className="neo-input font-mono"
              >
                <option value="health">💪 Health</option>
                <option value="career">💼 Career</option>
                <option value="learning">🧠 Learning (Knowledge)</option>
                <option value="personal">⚔️ Personal (Discipline)</option>
                <option value="creativity">🎨 Creativity</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold font-mono">Notes / Details</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add details, bullet points, links, etc."
              className="neo-input h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold font-mono">XP Reward</label>
              <input
                type="number"
                value={xp}
                onChange={e => setXp(Number(e.target.value))}
                min={5}
                className="neo-input font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold font-mono">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="neo-input font-mono"
              />
            </div>

            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button
                type="button"
                onClick={() => setToday(!today)}
                className={`neo-button text-xs font-mono font-bold flex-1 flex items-center justify-center gap-2 ${
                  today ? 'bg-amber-400' : 'bg-white'
                }`}
              >
                <Star className={`w-4 h-4 ${today ? 'fill-black' : ''}`} />
                <span>{today ? 'Added to Today' : 'Add to Today'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border-2 border-black font-bold rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button type="submit" className="neo-button bg-success text-white">
              Create Task
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <section className="neo-card p-4 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="neo-input pl-10 w-full py-1.5 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto py-1">
          {areas.map(areaName => (
            <button
              key={areaName}
              onClick={() => setSelectedArea(areaName)}
              className={`px-3 py-1 text-xs font-bold font-mono border-2 border-black rounded-full transition shrink-0 ${
                selectedArea === areaName ? 'bg-accent-pink shadow-gumroad-sm' : 'bg-white hover:bg-gray-50'
              }`}
            >
              {areaName === 'all' ? 'All Areas' : areaName.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Mobile Column Tabs */}
      <div className="md:hidden flex border-2 border-black rounded-lg overflow-hidden bg-white shadow-gumroad-sm">
        {columns.map(col => (
          <button
            key={col.id}
            onClick={() => setActiveMobileColumn(col.id)}
            className={`flex-1 py-2 text-xs font-black font-mono text-center border-r last:border-r-0 border-black transition ${
              activeMobileColumn === col.id ? 'bg-accent-pink text-black' : 'bg-white text-gray-500'
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* Kanban Board Grid */}
      <div id="task-kanban-cols" className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[400px]">
        {columns.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.id);
          
          return (
            <div
              key={col.id}
              className={`flex flex-col neo-card border-2 border-black p-4 bg-white ${
                col.id === activeMobileColumn ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                <span className="font-black text-md font-mono">{col.label}</span>
                <span className="bg-black text-white px-2 py-0.5 rounded font-mono text-xs font-bold">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex flex-col gap-4 flex-1 overflow-y-auto no-scrollbar max-h-[500px]">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs font-mono border-2 border-dashed border-gray-200 rounded-lg">
                    Empty column
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <div
                      key={task.id}
                      className="neo-card p-4 bg-white border-2 border-black shadow-gumroad-sm flex flex-col gap-3 group/card relative"
                    >
                      {/* Star / Today indicator */}
                      <button
                        onClick={() => toggleTodayTask(task.id)}
                        className={`absolute top-3 right-3 p-1 rounded-full border border-black transition-colors ${
                          task.today ? 'bg-amber-400 text-black shadow-gumroad-sm' : 'bg-white text-gray-300'
                        }`}
                        title={task.today ? 'Assigned to Today' : 'Pin to Today Board'}
                      >
                        <Star className={`w-3.5 h-3.5 ${task.today ? 'fill-black' : ''}`} />
                      </button>

                      <div className="pr-6">
                        <h4 className="font-black text-sm text-black leading-snug break-words">
                          {task.title}
                        </h4>
                        {task.notes && (
                          <p className="text-[11px] text-gray-500 font-medium mt-1 whitespace-pre-wrap break-words">
                            {task.notes}
                          </p>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-1.5 items-center mt-1">
                        <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border border-black/10 ${getAreaColor(task.area)}`}>
                          {task.area}
                        </span>
                        <span className="text-[9px] font-bold font-mono bg-bg-primary text-gray-600 px-2 py-0.5 rounded border border-black/10">
                          +{task.xp} XP
                        </span>
                        {task.due_date && (
                          <span className="text-[9px] font-bold font-mono bg-danger/10 text-danger px-2 py-0.5 rounded border border-danger/20 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {task.due_date}
                          </span>
                        )}
                      </div>

                      {/* Board Movement Actions */}
                      <div className="flex justify-between items-center border-t border-black/10 pt-2.5 mt-1">
                        <button
                          onClick={() => shiftStatus(task, 'left')}
                          disabled={task.status === 'backlog'}
                          className="p-1 rounded border border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 bg-white"
                          title="Move Left"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 rounded text-gray-400 hover:text-danger border border-transparent hover:border-black hover:bg-danger/5 transition"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => shiftStatus(task, 'right')}
                          disabled={task.status === 'done'}
                          className="p-1 rounded border border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 bg-white"
                          title="Move Right"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
