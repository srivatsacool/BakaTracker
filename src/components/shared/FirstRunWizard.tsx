import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { useAppTour } from '../../lib/useAppTour';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Sparkles, ChevronRight, ChevronLeft, Plus, Flame, Zap } from 'lucide-react';
import type { HabitType, StatType, TaskArea } from '../../types';

type WizardStep = 1 | 2 | 3 | 4;

/**
 * FirstRunWizard — the boot cabinet. Four steps: welcome, habits,
 * tasks, done (tour). For guest/local first runs (authenticated first
 * runs go through FirstRunSetup's persona picker).
 */
export const FirstRunWizard: React.FC = () => {
  const { addHabit, addTask, loadDemoData, habits } = useStore();
  const navigate = useNavigate();
  const { startTour } = useAppTour(navigate);

  const isFirstRun = localStorage.getItem('bt_first_run') !== 'done';
  const [visible, setVisible] = useState(isFirstRun);
  const [closing, setClosing] = useState(false);
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

  // F9 modal a11y: dialog role, focus trap, Esc → skip the tour (same path as
  // the "Skip tour — start tracking" button), focus restore on close. Chrome
  // only — the wizard's add/skip/demo flows are untouched.
  const wizardRef = useFocusTrap<HTMLDivElement>(visible && !closing, {
    onEscape: () => finishWizard(false),
  });

  if (!visible) return null;

  const finishWizard = (startTourAfter: boolean) => {
    localStorage.setItem('bt_first_run', 'done');
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      if (startTourAfter) startTour();
    }, 150);
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
    <div className={`fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div
        ref={wizardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-wizard-title"
        tabIndex={-1}
        className="w-full max-w-lg cabinet cabinet--playing overflow-hidden" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}
      >

        {/* Progress bar — the XP track */}
        <div className="h-1.5" style={{ background: 'var(--obs-glass-8)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%`, background: 'linear-gradient(90deg, var(--arcade-gold-deep), var(--arcade-gold))', boxShadow: '0 0 8px rgba(139, 92, 246,0.5)' }}
          />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(242,242,242,0.1)', background: 'rgba(242,242,242,0.03)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139, 92, 246,0.15)', border: '1px solid rgba(139, 92, 246,0.4)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
            </div>
            <span id="first-run-wizard-title" className="font-bold text-sm" style={{ color: 'var(--arcade-paper)' }}>BakaTracker Setup</span>
          </div>
          <span className="font-mono text-xs font-bold score-readout" style={{ color: 'var(--arcade-gold)' }}>Step {step} of 4</span>
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">

          {/* ─── STEP 1: WELCOME ─── */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="text-5xl" aria-hidden="true">🎮</div>
              <div>
                <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--arcade-paper)' }}>Welcome to BakaTracker!</h2>
                <p className="text-sm font-mono mt-1 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Your life, gamified. Let's set up your tracking in 60 seconds.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full mt-2">
                {[
                  { icon: '🔥', label: 'Track Habits' },
                  { icon: '✅', label: 'Manage Tasks' },
                  { icon: '📈', label: 'Earn XP & Level Up' },
                ].map(f => (
                  <div key={f.label} className="cabinet cabinet--off p-3 flex flex-col items-center gap-1">
                    <span className="text-xl" aria-hidden="true">{f.icon}</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>{f.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  onClick={() => setStep(2)}
                  className="insert-coin w-full justify-center !py-3"
                >
                  <span className="font-bold">Begin Setup</span>
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  onClick={handleDemoData}
                  disabled={loading || habits.length >= 2}
                  className="btn-ghost w-full justify-center !py-2.5 disabled:opacity-50"
                >
                  {loading ? (
                    <><Zap className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading demo data...</>
                  ) : (
                    <><Zap className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" /> Load Demo Data Instead</>
                  )}
                </button>
                {habits.length >= 2 && (
                  <p className="text-[10px] font-mono text-center m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Demo data disabled — you already have habits.</p>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 2: HABITS ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="marquee-title text-xl m-0 flex items-center gap-2" style={{ color: 'var(--arcade-paper)' }}>
                  <Flame className="w-5 h-5" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" /> Add Your Habits
                </h2>
                <p className="text-xs font-mono mt-1 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>What do you want to track daily? Add at least one habit to get started.</p>
              </div>

              {/* Quick icon picker */}
              <div className="flex flex-wrap gap-1.5">
                {quickIcons.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setHabitIcon(ic)}
                    className={`w-8 h-8 rounded-lg text-lg cursor-pointer transition ${habitIcon === ic ? 'chip chip--gold' : 'chip'}`}
                    aria-label={`Use icon ${ic}`}
                    aria-pressed={habitIcon === ic}
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
                  className="arcade-input col-span-2 !text-sm"
                />
                <select value={habitType} onChange={e => setHabitType(e.target.value as HabitType)} className="arcade-input !text-sm font-mono">
                  <option value="checkbox">✅ Checkbox</option>
                  <option value="counter">🔢 Counter</option>
                  <option value="numeric">📊 Numeric</option>
                  <option value="mood">😊 Mood</option>
                  <option value="energy">⚡ Energy</option>
                </select>
                <select value={habitStat} onChange={e => setHabitStat(e.target.value as StatType)} className="arcade-input !text-sm font-mono">
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
                  className="arcade-input !text-sm font-mono"
                  placeholder="XP"
                />
                <button
                  onClick={handleAddHabit}
                  disabled={!habitName.trim()}
                  className="insert-coin flex items-center justify-center gap-1 !text-sm disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add Habit
                </button>
              </div>

              {addedHabits.length > 0 && (
                <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid rgba(242,242,242,0.1)' }}>
                  <span className="text-[10px] font-mono font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Added this session</span>
                  {addedHabits.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-sm" style={{ background: 'rgba(61,220,132,0.07)', border: '1px solid rgba(61,220,132,0.25)' }}>
                      <span aria-hidden="true">{h.icon}</span>
                      <span className="font-bold flex-1" style={{ color: 'var(--arcade-paper)' }}>{h.name}</span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>{h.type} · {h.stat} · +{h.xp}xp</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <button onClick={() => setStep(1)} className="btn-ghost !text-sm flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back
                </button>
                <button onClick={() => setStep(3)} className="insert-coin flex-1 justify-center !text-sm">
                  {addedHabits.length > 0 ? 'Next: Tasks' : 'Skip for now'} <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: TASKS ─── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="marquee-title text-xl m-0 flex items-center gap-2" style={{ color: 'var(--arcade-paper)' }}>
                  ✅ Add Your First Tasks
                </h2>
                <p className="text-xs font-mono mt-1 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Add any to-dos or goals you're working on. You can add more anytime.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                  className="arcade-input col-span-2 !text-sm"
                />
                <select value={taskArea} onChange={e => setTaskArea(e.target.value as TaskArea)} className="arcade-input !text-sm font-mono">
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
                  className="arcade-input !text-sm font-mono"
                  placeholder="XP"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!taskTitle.trim()}
                  className="insert-coin col-span-2 flex items-center justify-center gap-1 !text-sm disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add Task
                </button>
              </div>

              {addedTasks.length > 0 && (
                <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid rgba(242,242,242,0.1)' }}>
                  <span className="text-[10px] font-mono font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Added this session</span>
                  {addedTasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-sm" style={{ background: 'rgba(63,123,255,0.07)', border: '1px solid rgba(63,123,255,0.25)' }}>
                      <span className="font-bold flex-1" style={{ color: 'var(--arcade-paper)' }}>{t.title}</span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>{t.area} · +{t.xp}xp</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <button onClick={() => setStep(2)} className="btn-ghost !text-sm flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back
                </button>
                <button onClick={() => setStep(4)} className="insert-coin flex-1 justify-center !text-sm">
                  {addedTasks.length > 0 ? 'Next: Finish' : 'Skip for now'} <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: FINISH ─── */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="text-5xl" aria-hidden="true">🏆</div>
              <div>
                <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--arcade-gold)' }}>You're all set!</h2>
                <p className="text-sm font-mono mt-1 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Your machines are ready. Insert your first coin and start playing.</p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  onClick={() => finishWizard(true)}
                  className="insert-coin w-full justify-center !py-3"
                >
                  <span>Start the 2-minute tour</span> <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => finishWizard(false)}
                  className="btn-ghost w-full justify-center !py-2.5"
                >
                  Skip tour — start tracking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
