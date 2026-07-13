import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getTodayDateString, calculateDailyScore, isHabitCompleted, getDaysInCurrentMonth, formatDate } from '../lib/utils';
import { calculateHabitStreak } from '../services/habits/calculateHabitStreak';
import { Plus, Trash2, RefreshCw, Activity, Calendar } from 'lucide-react';
import type { HabitType, StatType } from '../types';

export const Habits: React.FC = () => {
  const {
    habits,
    habitLogs,
    currentQuote,
    stats,
    settings,
    tasks,
    journal,
    toggleHabit,
    incrementCounterHabit,
    setNumericHabit,
    setMoodHabit,
    setEnergyHabit,
    addHabit,
    deleteHabit,
    refreshQuote,
    theme
  } = useStore();

  const todayStr = getTodayDateString();
  const dailyScore = calculateDailyScore(todayStr, habits, habitLogs, tasks, journal);

  const getLast5Days = (): { date: string; label: string }[] => {
    const days = [];
    const d = new Date();
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(d.getDate() - i);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'narrow' });
      days.push({ date: dateStr, label: dayLabel });
    }
    return days;
  };

  const [viewMode, setViewMode] = useState<'today' | 'month'>('today');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<HabitType>('checkbox');
  const [newHabitIcon, setNewHabitIcon] = useState('💪');
  const [newHabitXP, setNewHabitXP] = useState(5);
  const [newHabitStat, setNewHabitStat] = useState<StatType>('health');

  // Micro-interactions state
  interface FloatingXP {
    id: number;
    xp: number;
    statName: string;
    x: number;
    y: number;
  }
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);

  interface ConfettiParticle {
    id: number;
    x: number;
    color: string;
    size: number;
    delay: number;
    shape: 'square' | 'circle';
  }
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const prevLevelRef = useRef(stats.level);

  const triggerFloatingXP = (e: React.MouseEvent | React.FocusEvent | null, xp: number, statName: string) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (e && 'clientX' in e && e.clientX) {
      x = e.clientX;
      y = e.clientY;
    } else if (e && e.currentTarget) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const newXP = {
      id: Date.now() + Math.random(),
      xp,
      statName,
      x,
      y
    };
    setFloatingXPs(prev => [...prev, newXP]);
    setTimeout(() => {
      setFloatingXPs(prev => prev.filter(item => item.id !== newXP.id));
    }, 1000);
  };

  const triggerConfetti = () => {
    setShowLevelUpModal(true);
    const activeAccent = theme === 'dark' ? (settings.accent_color_dark || '#FF90E8') : (settings.accent_color_light || '#FF90E8');
    const colors = [activeAccent, '#FF90E8', '#22C55E', '#F59E0B', '#EF4444', '#6366F1', '#3B82F6'];
    const shapes: ('square' | 'circle')[] = ['square', 'circle'];
    const newParticles = Array.from({ length: 80 }).map((_, idx) => ({
      id: idx,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6,
      delay: Math.random() * 1.5,
      shape: shapes[Math.floor(Math.random() * shapes.length)]
    }));
    setConfetti(newParticles);
    setTimeout(() => {
      setConfetti([]);
    }, 5000);
  };

  useEffect(() => {
    if (stats.level > prevLevelRef.current) {
      triggerConfetti();
    }
    prevLevelRef.current = stats.level;
  }, [stats.level]);

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    addHabit({
      name: newHabitName,
      type: newHabitType,
      icon: newHabitIcon,
      xp: Number(newHabitXP) || 5,
      stat: newHabitStat
    });

    setNewHabitName('');
    setShowAddForm(false);
  };

  const statConfig = [
    { name: 'Discipline', icon: '⚔️', value: stats.discipline, color: 'bg-indigo-500', barColor: '#6366F1' },
    { name: 'Health', icon: '💪', value: stats.health, color: 'bg-success', barColor: '#22C55E' },
    { name: 'Knowledge', icon: '🧠', value: stats.knowledge, color: 'bg-blue-500', barColor: '#3B82F6' },
    { name: 'Creativity', icon: '🎨', value: stats.creativity, color: 'bg-accent-pink', barColor: 'var(--accent-pink)' },
    { name: 'Career', icon: '💼', value: stats.career, color: 'bg-warning', barColor: '#F59E0B' }
  ];

  const getLogForToday = (habitId: string) => {
    return habitLogs.find(l => l.habit_id === habitId && l.date === todayStr);
  };

  const daysInMonth = getDaysInCurrentMonth();

  // Helper to render retro pixel block indicator
  const renderRetroHUD = (value: number, barHex: string) => {
    const progress = value % 100;
    const filledBlocks = Math.round(progress / 10);
    return (
      <div className="flex gap-1 items-center">
        {Array.from({ length: 10 }).map((_, i) => {
          const filled = i < filledBlocks;
          return (
            <div
              key={i}
              className="w-3.5 h-3.5 border border-black dark:border-white transition-all"
              style={{
                backgroundColor: filled ? barHex : 'transparent',
                boxShadow: filled ? 'none' : 'inset 1px 1px 0px rgba(0,0,0,0.1)'
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 relative">
      
      {/* Floating XP Elements */}
      {floatingXPs.map(item => (
        <div
          key={item.id}
          className="fixed animate-xp-float z-[9999] pointer-events-none font-black font-mono text-xs bg-black border border-white text-accent-pink px-2 py-0.5 rounded shadow-gumroad-sm flex items-center gap-1"
          style={{ left: `${item.x}px`, top: `${item.y}px`, transform: 'translate(-50%, -50%)' }}
        >
          +{item.xp} {item.statName.toUpperCase()} XP
        </div>
      ))}

      {/* Confetti Celebration Overlay */}
      {confetti.map(p => (
        <div
          key={p.id}
          className="confetti-particle pointer-events-none"
          style={{
            left: `${p.x}vw`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: p.shape === 'circle' ? '50%' : '0px',
            animationDelay: `${p.delay}s`,
            border: '1px solid black'
          }}
        />
      ))}

      {/* Level Up Modal */}
      {showLevelUpModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 animate-fade-in text-black">
          <div className="neo-card p-8 bg-white max-w-sm text-center flex flex-col gap-4 items-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-accent-pink via-success to-warning" />
            <div className="text-6xl animate-bounce mt-2">🎉</div>
            <h2 className="text-3xl font-black italic tracking-wider text-accent-pink">LEVEL UP!</h2>
            <p className="font-bold text-sm">You have progressed to new heights!</p>
            <div className="text-4xl font-black border-4 border-black px-6 py-2 rounded-lg bg-bg-primary shadow-gumroad inline-block my-2">
              LVL {stats.level}
            </div>
            <p className="text-xs text-gray-500 font-mono">Consistency yields growth. Keep building yourself!</p>
            <button
              onClick={() => setShowLevelUpModal(false)}
              className="neo-button bg-success text-white font-bold w-full mt-2 cursor-pointer"
            >
              Let's Go!
            </button>
          </div>
        </div>
      )}
      
      {/* Hero Section Widget */}
      <section className="neo-card p-6 bg-white dark:bg-surface flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent-pink/10 rounded-bl-full pointer-events-none" />
        
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">
              Today / {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-4xl font-black m-0 tracking-tight">Level {stats.level}</h2>
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400 font-bold">
                ({stats.xp} / {settings.xp_per_level} XP)
              </span>
            </div>
            
            {/* XP progress bar */}
            <div className="w-full bg-bg-primary dark:bg-black/35 h-5 rounded-full border-2 border-black dark:border-white overflow-hidden relative mt-3 max-w-md shadow-gumroad-sm">
              <div 
                className="bg-accent-pink h-full border-r-2 border-black dark:border-white transition-all duration-300"
                style={{ width: `${(stats.xp / settings.xp_per_level) * 100}%` }}
              />
            </div>
          </div>

          {/* Quote of the Day */}
          {currentQuote && (
            <div className="border-l-4 border-black dark:border-white pl-4 py-1 max-w-lg mt-1 relative group text-text-primary">
              <p className="text-sm italic font-bold">
                "{currentQuote.quote}"
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 font-bold font-mono">
                  — {currentQuote.author}
                </span>
                <button 
                  onClick={refreshQuote}
                  title="New Quote"
                  className="inline-flex items-center justify-center p-1 rounded-md border border-transparent hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Daily Score Circle */}
        <div className="flex flex-col items-center justify-center neo-card p-6 bg-accent-pink/5 shrink-0 border-2 border-black dark:border-white w-full md:w-48 text-center text-text-primary">
          <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">Day Progress</span>
          <div className="relative flex items-center justify-center my-3 bg-white dark:bg-black/20 rounded-full border-2 border-black w-24 h-24 shadow-gumroad-sm">
            <span className="text-3xl font-black font-mono">{dailyScore}%</span>
          </div>
          <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider font-mono">Completion Score</span>
        </div>
      </section>

      {/* Character HUD Stats */}
      <section className="neo-card p-6 bg-white dark:bg-surface">
        <h3 className="text-md font-black uppercase tracking-wider border-b-2 border-black dark:border-white pb-2 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent-pink" />
          <span>Character Stats</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {statConfig.map(stat => {
            const statLvl = Math.floor(stat.value / 100) + 1;
            const progress = stat.value % 100;
            return (
              <div key={stat.name} className="p-4 bg-bg-primary dark:bg-black/10 rounded-lg border-2 border-black dark:border-white shadow-gumroad-sm flex flex-col gap-2">
                <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-1">
                  <span className="font-black text-sm text-black dark:text-white flex items-center gap-1">
                    <span>{stat.icon}</span>
                    <span className="truncate max-w-[80px]">{stat.name}</span>
                  </span>
                  <span className="text-[10px] font-mono font-black bg-black text-white px-1.5 py-0.2 rounded border border-black shadow-gumroad-sm">
                    Lvl {statLvl}
                  </span>
                </div>
                
                {/* HUD Pixel Block Progression */}
                <div className="py-1">
                  {renderRetroHUD(stat.value, stat.barColor)}
                </div>

                <div className="flex justify-between items-center text-[9px] font-mono font-bold text-gray-500 mt-0.5">
                  <span>Progress</span>
                  <span>{progress} / 100 XP</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* View Toggle and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Toggle View Mode */}
        <div className="flex border-2 border-black dark:border-white rounded-lg overflow-hidden shadow-gumroad-sm bg-white shrink-0">
          <button
            onClick={() => setViewMode('today')}
            className={`px-4 py-2.5 font-bold font-mono text-sm flex items-center justify-center gap-2 border-r-2 border-black dark:border-white transition cursor-pointer flex-1 sm:flex-initial ${
              viewMode === 'today' ? 'bg-accent-pink text-black' : 'hover:bg-gray-100 bg-white text-black'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Today's Trackers</span>
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2.5 font-bold font-mono text-sm flex items-center justify-center gap-2 transition cursor-pointer flex-1 sm:flex-initial ${
              viewMode === 'month' ? 'bg-accent-pink text-black' : 'hover:bg-gray-100 bg-white text-black'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Month View Grid</span>
          </button>
        </div>

        {/* Add Habit Toggle */}
        <button
          id="add-habit-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="neo-button flex items-center justify-center gap-2 py-2.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Tracker</span>
        </button>
      </div>

      {/* Add Custom Habit Form */}
      {showAddForm && (
        <form onSubmit={handleAddHabit} className="neo-card p-6 bg-white dark:bg-surface flex flex-col gap-4 text-text-primary">
          <h4 className="text-md font-black border-b border-black dark:border-white pb-2 uppercase tracking-wide">Create Custom Tracker</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold font-mono">Habit Name</label>
              <input
                type="text"
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                placeholder="e.g. Code portfolio"
                className="neo-input"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold font-mono">Tracker Type</label>
              <select
                value={newHabitType}
                onChange={e => setNewHabitType(e.target.value as HabitType)}
                className="neo-input font-mono bg-surface text-text-primary"
              >
                <option value="checkbox">Checkbox (Check off)</option>
                <option value="counter">Counter (Increments, e.g. Book Pages)</option>
                <option value="numeric">Number (Daily inputs, e.g. Sleep Hours)</option>
                <option value="mood">Mood (😞 😐 🙂)</option>
                <option value="energy">Energy (Low / Med / High)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold font-mono">RPG Stat Tag</label>
              <select
                value={newHabitStat}
                onChange={e => setNewHabitStat(e.target.value as StatType)}
                className="neo-input font-mono bg-surface text-text-primary"
              >
                <option value="discipline">⚔️ Discipline</option>
                <option value="health">💪 Health</option>
                <option value="knowledge">🧠 Knowledge</option>
                <option value="creativity">🎨 Creativity</option>
                <option value="career">💼 Career</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold font-mono">Display Emoji Icon</label>
              <input
                type="text"
                value={newHabitIcon}
                onChange={e => setNewHabitIcon(e.target.value)}
                placeholder="e.g. 💻"
                className="neo-input text-center"
                maxLength={2}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold font-mono">Base XP Reward</label>
              <input
                type="number"
                value={newHabitXP}
                onChange={e => setNewHabitXP(Number(e.target.value))}
                min={1}
                className="neo-input font-mono"
                required
              />
            </div>

            <div className="flex items-end">
              <button type="submit" className="neo-button w-full bg-success text-white">
                Create Tracker
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Trackers View */}
      {viewMode === 'today' ? (
        <div id="habit-list-container" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {habits.map((habit, index) => {
            const todayLog = getLogForToday(habit.id);
            const streak = calculateHabitStreak(habit, habitLogs);
            const completed = isHabitCompleted(habit, todayLog);
            
            return (
              <div 
                key={habit.id} 
                id={index === 0 ? "habit-first-row" : undefined}
                className={`neo-card p-6 flex flex-col justify-between gap-4 text-text-primary transition-all ${
                  completed 
                    ? 'border-success bg-success/5 dark:bg-success/5 shadow-none translate-x-[1px] translate-y-[1px]' 
                    : 'bg-white dark:bg-surface'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl p-2 bg-bg-primary dark:bg-black/25 rounded-lg border-2 border-black text-black dark:text-white shrink-0 shadow-gumroad-sm">
                      {habit.icon}
                    </span>
                    <div>
                      <h4 className="font-black text-lg leading-tight">{habit.name}</h4>
                      <span className="text-[10px] font-mono font-black text-gray-500 dark:text-gray-300 capitalize bg-bg-primary dark:bg-black/35 border border-black dark:border-white/20 px-2 py-0.5 rounded mt-1.5 inline-block text-black">
                        {habit.stat} (+{habit.xp} XP)
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    title="Delete Tracker"
                    className="p-1 rounded text-gray-400 hover:text-danger hover:bg-danger/5 transition border border-transparent hover:border-black dark:hover:border-white cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 5-day mini-timeline streaks */}
                <div className="flex items-center gap-3 py-2 border-y border-black/10 dark:border-white/10">
                  <span className="text-[10px] font-black font-mono text-gray-500 dark:text-gray-400 uppercase">History:</span>
                  <div className="flex gap-2">
                    {getLast5Days().map(({ date, label }) => {
                      const log = habitLogs.find(l => l.habit_id === habit.id && l.date === date);
                      const completedDay = isHabitCompleted(habit, log);
                      return (
                        <div
                          key={date}
                          title={`${formatDate(date)}: ${completedDay ? 'Completed' : 'Incomplete'}`}
                          className={`w-7 h-7 rounded-full border-2 border-black flex items-center justify-center font-mono text-[10px] font-black transition-all shadow-gumroad-sm ${
                            completedDay 
                              ? 'bg-accent-pink text-black' 
                              : 'bg-bg-primary dark:bg-black/35 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Habit Interaction Controls based on Type */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  {habit.type === 'checkbox' && (
                    <button
                      onClick={(e) => {
                        const isCompleted = isHabitCompleted(habit, todayLog);
                        toggleHabit(habit.id, todayStr);
                        if (!isCompleted) {
                          triggerFloatingXP(e, habit.xp, habit.stat);
                        }
                      }}
                      className={`neo-button text-sm w-full font-black min-h-[48px] py-2.5 transition-all cursor-pointer ${
                        completed 
                          ? 'bg-success text-white border-black shadow-none translate-x-[1px] translate-y-[1px]' 
                          : 'bg-white text-black border-black hover:bg-accent-pink'
                      }`}
                    >
                      {completed ? '✓ DONE TODAY' : '[ MARK DONE ]'}
                    </button>
                  )}

                  {habit.type === 'counter' && (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center border-2 border-black dark:border-white rounded-lg overflow-hidden bg-white text-black shadow-gumroad-sm min-h-[48px]">
                        <button
                          onClick={() => incrementCounterHabit(habit.id, todayStr, -1)}
                          className="px-4 py-2.5 font-black bg-bg-primary hover:bg-gray-100 border-r-2 border-black cursor-pointer min-h-[48px] flex items-center justify-center active:scale-95 transition"
                        >
                          -
                        </button>
                        <span className="px-5 font-mono font-black text-sm">
                          {todayLog ? todayLog.value : 0}
                        </span>
                        <button
                          onClick={(e) => {
                            incrementCounterHabit(habit.id, todayStr, 1);
                            triggerFloatingXP(e, habit.xp, habit.stat);
                          }}
                          className="px-4 py-2.5 font-black bg-bg-primary hover:bg-gray-100 border-l-2 border-black cursor-pointer min-h-[48px] flex items-center justify-center active:scale-95 transition"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-mono font-black text-gray-500">
                        Total XP: +{(Number(todayLog?.value) || 0) * habit.xp}
                      </span>
                    </div>
                  )}

                  {habit.type === 'numeric' && (
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="0.0"
                          value={todayLog ? todayLog.value : ''}
                          onChange={e => setNumericHabit(habit.id, todayStr, Number(e.target.value) || 0)}
                          onBlur={(e) => {
                            if (Number(e.target.value) > 0 && !todayLog) {
                              triggerFloatingXP(e, habit.xp, habit.stat);
                            }
                          }}
                          className="neo-input w-24 text-center font-mono py-1.5 px-2"
                        />
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400 font-mono">
                          {habit.id === 'h4' ? 'hours' : 'value'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-gray-500">
                        {todayLog ? `+${habit.xp} XP` : '0 XP'}
                      </span>
                    </div>
                  )}

                  {habit.type === 'mood' && (
                    <div className="flex justify-between items-center w-full">
                      <div className="flex gap-2">
                        {['😞', '😐', '🙂'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              const isCurrentlyEmoji = todayLog?.value === emoji;
                              setMoodHabit(habit.id, todayStr, isCurrentlyEmoji ? '' : emoji);
                              if (!isCurrentlyEmoji) {
                                triggerFloatingXP(e, habit.xp, habit.stat);
                              }
                            }}
                            className={`text-2xl p-2 rounded-lg border-2 border-black transition cursor-pointer ${
                              todayLog?.value === emoji ? 'bg-accent-pink shadow-gumroad-sm translate-x-[-1px] translate-y-[-1px]' : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-mono font-black text-gray-500">
                        {todayLog ? `+${habit.xp} XP` : '0 XP'}
                      </span>
                    </div>
                  )}

                  {habit.type === 'energy' && (
                    <div className="flex justify-between items-center w-full">
                      <div className="flex gap-1.5">
                        {['Low', 'Medium', 'High'].map(level => (
                          <button
                            key={level}
                            onClick={(e) => {
                              const isCurrentlyLevel = todayLog?.value === level;
                              setEnergyHabit(habit.id, todayStr, isCurrentlyLevel ? '' : level);
                              if (!isCurrentlyLevel) {
                                triggerFloatingXP(e, habit.xp, habit.stat);
                              }
                            }}
                            className={`text-xs font-mono font-black px-2.5 py-1.5 rounded border-2 border-black transition text-black cursor-pointer ${
                              todayLog?.value === level ? 'bg-accent-pink shadow-gumroad-sm translate-x-[-1px] translate-y-[-1px]' : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-mono font-black text-gray-500">
                        {todayLog ? `+${habit.xp} XP` : '0 XP'}
                      </span>
                    </div>
                  )}

                  {/* Streak display */}
                  {streak > 0 && (
                    <div className="flex items-center gap-1 bg-orange-100 border-2 border-black text-orange-800 px-2 py-1 rounded font-mono font-black text-xs shadow-gumroad-sm">
                      <span>🔥</span>
                      <span>{streak}d Streak</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Month View Grid */
        <section className="neo-card p-6 bg-white dark:bg-surface overflow-hidden text-text-primary">
          <h3 className="text-md font-black border-b-2 border-black dark:border-white pb-2 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-pink" />
            <span>Monthly Grid Calendar Tracker</span>
          </h3>
          <div className="overflow-x-auto no-scrollbar pb-2">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border-2 border-black bg-bg-primary text-black text-left text-xs font-black font-mono uppercase min-w-[150px]">
                    Habit Trackers
                  </th>
                  {daysInMonth.map(dayStr => {
                    const dateObj = new Date(dayStr);
                    const dayNum = dateObj.getDate();
                    return (
                      <th key={dayStr} className="p-1.5 border-2 border-black bg-bg-primary text-black text-center text-[10px] font-mono font-black w-8">
                        {dayNum}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {habits.map(habit => (
                  <tr key={habit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 border-2 border-black font-bold text-xs flex items-center gap-1.5 bg-white text-black">
                      <span>{habit.icon}</span>
                      <span className="truncate max-w-[120px]">{habit.name}</span>
                    </td>
                    {daysInMonth.map(dayStr => {
                      const log = habitLogs.find(l => l.habit_id === habit.id && l.date === dayStr);
                      const completedDay = isHabitCompleted(habit, log);
                      return (
                        <td 
                          key={dayStr} 
                          title={`${habit.name} - ${formatDate(dayStr)} (Click to toggle)`}
                          onClick={() => toggleHabit(habit.id, dayStr)}
                          className={`p-0 border-2 border-black text-center h-8 transition-colors cursor-pointer select-none ${
                            completedDay ? 'bg-accent-pink' : 'bg-white dark:bg-surface hover:bg-accent-pink/20 dark:hover:bg-accent-pink/30'
                          }`}
                        >
                          {completedDay && <span className="text-[10px] font-black text-black dark:text-black">✓</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs font-mono font-bold text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-accent-pink border border-black rounded" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-white border border-black rounded" />
              <span>Incomplete</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
