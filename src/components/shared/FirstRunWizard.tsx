import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { useAppTour } from '../../lib/useAppTour';
import { Sparkles, ChevronRight, ChevronLeft, Plus, X, Flame, Zap } from 'lucide-react';
import type { HabitType, StatType, TaskArea } from '../../types';

type WizardStep = 1 | 2 | 3 | 4;

export const FirstRunWizard: React.FC = () => {
  const { addHabit, addTask, loadDemoData, habits } = useStore();
  const navigate = useNavigate();
  const { startTour } = useAppTour(navigate);

  const isFirstRun = localStorage.getItem('bt_first_run') !== 'done';
  const [visible, setVisible] = useState(isFirstRun);
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);

  // Habits form state
  const [habitName, setHabitName] = useState('');
  const [habitType, setHabitType] = useState<HabitType>('checkbox');
  const [habitIcon, setHabitIcon] = useState('💪');
  const [habitXP, setHabitXP] = useState(5);
  const [habitStat, setHabitStat] = useState<StatType>('health');
  const [addedHabits, setAddedHabits] = useState<{ name: string; icon: string; type: string; stat: string; xp: number }[]>([]);

  // Tasks form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskArea, setTaskArea] = useState<TaskArea>('personal');
  const [taskXP, setTaskXP] = useState(10);
  const [addedTasks, setAddedTasks] = useState<{ title: string; area: string; xp: number }[]>([]);

  if (!visible) return null;

  const finishWizard = (startTourAfter: boolean) => {
    localStorage.setItem('bt_first_run', 'done');
    setVisible(false);
    if (startTourAfter) {
      setTimeout(() => startTour(), 300);
    }
  };

  const handleAddHabit = () => {
    if (!habitName.trim()) return;
    addHabit({ name: habitName, type: habitType, icon: habitIcon, xp: habitXP, stat: habitStat });
    setAddedHabits(prev => [...prev, { name: habitName, icon: habitIcon, type: habitType, stat: habitStat, xp: habitXP }]);
    setHabitName('');
  };

  const handleAddTask = () => {
    if (!taskTitle.trim()) return;
    addTask(taskTitle, '', taskArea, taskXP, false);
    setAddedTasks(prev => [...prev, { title: taskTitle, area: taskArea, xp: taskXP }]);
    setTaskTitle('');
  };

  const handleDemoData = async () => {
    setLoading(true);
    await loadDemoData();
    setLoading(false);
    setStep(4);
  };


  const quickIcons = ['💪', '📖', '😊', '🌙', '🧘', '🎯', '💧', '🏃', '✍️', '🎨'];

  return (
    <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-surface border-4 border-black rounded-2xl shadow-[8px_8px_0px_black] overflow-hidden">

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-accent-pink transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-6 py-3 border-b-2 border-black bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black text-accent-pink rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black text-sm">BakaTracker Setup</span>
          </div>
          <span className="font-mono text-xs font-bold text-gray-500">Step {step} of 4</span>
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">

          {/* ─── STEP 1: WELCOME ─── */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="text-5xl animate-bounce">🎮</div>
              <div>
                <h2 className="text-2xl font-black">Welcome to BakaTracker!</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">Your life, gamified. Let's set up your tracking in 60 seconds.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full mt-2">
                {[
                  { icon: '🔥', label: 'Track Habits' },
                  { icon: '✅', label: 'Manage Tasks' },
                  { icon: '📈', label: 'Earn XP & Level Up' },
                ].map(f => (
                  <div key={f.label} className="neo-card p-3 bg-accent-pink/10 border-2 border-black flex flex-col items-center gap-1">
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-[10px] font-black font-mono">{f.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  onClick={() => setStep(2)}
                  className="neo-button bg-black text-accent-pink w-full flex items-center justify-center gap-2 py-3"
                >
                  <span className="font-black">Begin Setup</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDemoData}
                  disabled={loading || habits.length >= 2}
                  className="w-full px-4 py-2.5 border-2 border-black rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <><Zap className="w-4 h-4 animate-spin" /> Loading demo data...</>
                  ) : (
                    <><Zap className="w-4 h-4 text-accent-pink" /> Load Demo Data Instead</>
                  )}
                </button>
                {habits.length >= 2 && (
                  <p className="text-[10px] text-gray-400 font-mono text-center">Demo data disabled — you already have habits.</p>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 2: HABITS ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Flame className="w-5 h-5 text-accent-pink" /> Add Your Habits
                </h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">What do you want to track daily? Add at least one habit to get started.</p>
              </div>

              {/* Quick icon picker */}
              <div className="flex flex-wrap gap-1.5">
                {quickIcons.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setHabitIcon(ic)}
                    className={`w-8 h-8 rounded-lg border-2 text-lg transition ${habitIcon === ic ? 'border-black bg-accent-pink/20 shadow-[2px_2px_0px_black]' : 'border-gray-200 hover:border-black'}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Habit name"
                  value={habitName}
                  onChange={e => setHabitName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
                  className="neo-input col-span-2 text-sm"
                />
                <select value={habitType} onChange={e => setHabitType(e.target.value as HabitType)} className="neo-input text-sm font-mono">
                  <option value="checkbox">✅ Checkbox</option>
                  <option value="counter">🔢 Counter</option>
                  <option value="numeric">📊 Numeric</option>
                  <option value="mood">😊 Mood</option>
                  <option value="energy">⚡ Energy</option>
                </select>
                <select value={habitStat} onChange={e => setHabitStat(e.target.value as StatType)} className="neo-input text-sm font-mono">
                  <option value="health">💪 Health</option>
                  <option value="discipline">⚔️ Discipline</option>
                  <option value="knowledge">🧠 Knowledge</option>
                  <option value="creativity">🎨 Creativity</option>
                  <option value="career">💼 Career</option>
                </select>
                <input
                  type="number"
                  value={habitXP}
                  onChange={e => setHabitXP(Number(e.target.value))}
                  min={1}
                  className="neo-input text-sm font-mono"
                  placeholder="XP"
                />
                <button
                  onClick={handleAddHabit}
                  disabled={!habitName.trim()}
                  className="neo-button flex items-center justify-center gap-1 text-sm disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Add Habit
                </button>
              </div>

              {addedHabits.length > 0 && (
                <div className="flex flex-col gap-2 border-t-2 border-black/10 pt-3">
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">Added this session</span>
                  {addedHabits.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-success/10 border border-success/30 rounded-lg text-sm">
                      <span>{h.icon}</span>
                      <span className="font-bold flex-1">{h.name}</span>
                      <span className="text-[10px] font-mono text-gray-500">{h.type} · {h.stat} · +{h.xp}xp</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <button onClick={() => setStep(1)} className="px-3 py-2 border-2 border-black rounded-lg font-bold text-sm flex items-center gap-1 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)} className="neo-button flex-1 flex items-center justify-center gap-2 text-sm">
                  {addedHabits.length > 0 ? 'Next: Tasks' : 'Skip for now'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: TASKS ─── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  ✅ Add Your First Tasks
                </h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Add any to-dos or goals you're working on. You can add more anytime.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                  className="neo-input col-span-2 text-sm"
                />
                <select value={taskArea} onChange={e => setTaskArea(e.target.value as TaskArea)} className="neo-input text-sm font-mono">
                  <option value="health">💪 Health</option>
                  <option value="career">💼 Career</option>
                  <option value="learning">🧠 Learning</option>
                  <option value="personal">⚔️ Personal</option>
                  <option value="creativity">🎨 Creativity</option>
                </select>
                <input
                  type="number"
                  value={taskXP}
                  onChange={e => setTaskXP(Number(e.target.value))}
                  min={5}
                  className="neo-input text-sm font-mono"
                  placeholder="XP"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!taskTitle.trim()}
                  className="neo-button col-span-2 flex items-center justify-center gap-1 text-sm disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>

              {addedTasks.length > 0 && (
                <div className="flex flex-col gap-2 border-t-2 border-black/10 pt-3">
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">Added this session</span>
                  {addedTasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-success/10 border border-success/30 rounded-lg text-sm">
                      <span className="font-bold flex-1">{t.title}</span>
                      <span className="text-[10px] font-mono text-gray-500">{t.area} · +{t.xp}xp</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <button onClick={() => setStep(2)} className="px-3 py-2 border-2 border-black rounded-lg font-bold text-sm flex items-center gap-1 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(4)} className="neo-button flex-1 flex items-center justify-center gap-2 text-sm">
                  {addedTasks.length > 0 ? 'Finish Setup' : 'Skip for now'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: DONE ─── */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="text-5xl">🎉</div>
              <div>
                <h2 className="text-2xl font-black">You're All Set!</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">
                  {addedHabits.length > 0 || addedTasks.length > 0
                    ? `Added ${addedHabits.length} habit${addedHabits.length !== 1 ? 's' : ''} and ${addedTasks.length} task${addedTasks.length !== 1 ? 's' : ''}.`
                    : 'Demo data loaded and ready to explore.'}
                </p>
              </div>

              <div className="neo-card p-4 bg-accent-pink/10 border-2 border-black w-full text-left">
                <p className="font-bold text-sm flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-accent-pink" />
                  Take the App Tour
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  A quick 2-minute guided tour will walk you through every feature of BakaTracker — Habits, Tasks, Eisenhower Matrix, Journal, Journey stats, and Sheets sync.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => finishWizard(true)}
                  className="neo-button bg-black text-accent-pink w-full flex items-center justify-center gap-2 py-3"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="font-black">Start App Tour 🚀</span>
                </button>
                <button
                  onClick={() => finishWizard(false)}
                  className="w-full px-4 py-2 border-2 border-black rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Skip Tour, Start Tracking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
