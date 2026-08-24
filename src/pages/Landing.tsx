import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { authConfig } from '../features/auth/config';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Habit, Task } from '../types';
import { calculateDailyScore, getTodayDateString, isHabitCompleted } from '../lib/utils';
import { calculateHabitStreak } from '../services/habits/calculateHabitStreak';
import { EmptyState, GlassPane } from '../components/ui';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CloudOff,
  Compass,
  Flame,
  LayoutGrid,
  ListTodo,
  LockKeyhole,
  NotebookPen,
  Play,
  Shield,
  Sparkles,
  Square,
  Target,
  TrendingUp,
} from 'lucide-react';

type GlassTone = React.ComponentProps<typeof GlassPane>['tone'];

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

/** Tool → cabinet marquee color */
const CABINET_COLORS: Record<string, string> = {
  today: 'var(--arcade-gold)',
  habits: 'var(--arcade-green)',
  tasks: 'var(--arcade-red)',
  eisenhower: 'var(--arcade-orange)',
  journal: 'var(--arcade-magenta)',
  journey: 'var(--arcade-cobalt)',
  notes: 'var(--arcade-magenta)',
};

/** Accent CSS var → GlassPane tone (the marquee LED + title accent). */
const ACCENT_TO_TONE: Record<string, GlassTone> = {
  'var(--arcade-gold)': 'aurora',
  'var(--arcade-green)': 'teal',
  'var(--arcade-red)': 'coral',
  'var(--arcade-orange)': 'amber',
  'var(--arcade-magenta)': 'rose',
  'var(--arcade-cobalt)': 'cobalt',
};
const accentTone = (accent: string): GlassTone => ACCENT_TO_TONE[accent] ?? 'aurora';

const features = [
  { icon: Target, title: 'Today focus', text: 'A small execution pane for the quests that matter now — star quests, one lit board, one clear next move.', accent: CABINET_COLORS.today },
  { icon: Flame, title: 'Habits', text: 'Fast daily tracking across five interaction types, feeding five life attributes with every check-in.', accent: CABINET_COLORS.habits },
  { icon: ListTodo, title: 'Task planner', text: 'A four-column Kanban backlog with areas, due dates, XP, and today-stars. Planning stays separate from doing.', accent: CABINET_COLORS.tasks },
  { icon: LayoutGrid, title: 'Priority matrix', text: 'Sort work by urgency and importance when everything feels loud.', accent: CABINET_COLORS.eisenhower },
  { icon: BookOpen, title: 'Journal', text: 'Highlight-first reflection with mood and quote context. One honest sentence is enough.', accent: CABINET_COLORS.journal },
  { icon: TrendingUp, title: 'Journey', text: 'Character progression, heatmaps, charts, streaks, and consistency insights drawn from your real ledger.', accent: CABINET_COLORS.journey },
  { icon: NotebookPen, title: 'Visual notes', text: 'Notebooks and Excalidraw pages for thinking, diagrams, and ideas.', accent: CABINET_COLORS.notes },
  { icon: Bot, title: 'BakaSur', text: 'The attendant — it reasons over your own quests, habits, and journal, so context never gets lost.', accent: 'var(--arcade-gold)' },
];

const getAreaEmoji = (area: string) => {
  switch (area) {
    case 'health': return '💪';
    case 'career': return '💼';
    case 'learning': return '🧠';
    case 'personal': return '⚔️';
    case 'creativity': return '🎨';
    default: return '🎯';
  }
};

export const Landing: React.FC = () => {
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const navigate = useNavigate();
  const { habits, habitLogs, tasks, journal, stats, settings, moveTask, toggleHabit, loadDemoData } = useStore(useShallow(s => ({
    habits: s.habits,
    habitLogs: s.habitLogs,
    tasks: s.tasks,
    journal: s.journal,
    stats: s.stats,
    settings: s.settings,
    moveTask: s.moveTask,
    toggleHabit: s.toggleHabit,
    loadDemoData: s.loadDemoData,
  })));
  const [activeStep, setActiveStep] = useState(0);

  const today = getTodayDateString();
  const todayTasks = useMemo(() => tasks.filter(t => t.today), [tasks]);
  const openTodayTasks = useMemo(() => todayTasks.filter(t => t.status !== 'done'), [todayTasks]);
  const doneTodayTasks = useMemo(() => todayTasks.filter(t => t.status === 'done'), [todayTasks]);
  const dailyScore = useMemo(
    () => calculateDailyScore(today, habits, habitLogs, tasks, journal),
    [today, habits, habitLogs, tasks, journal],
  );
  const xpPct = useMemo(
    () => Math.min(100, settings.xp_per_level > 0 ? (stats.xp / settings.xp_per_level) * 100 : 0),
    [stats.xp, settings.xp_per_level],
  );

  // The hero preview is the REAL application: seed the same demo world the
  // guest demo uses (idempotent — Layout guards identically), so what the
  // visitor plays with here IS the world they enter after TRY LIVE DEMO.
  // Authenticated users are redirected away before this matters.
  useEffect(() => {
    if (isLoading) return;
    if (user?.provider === 'google') return;
    if (habits.length === 0 && tasks.length === 0) {
      loadDemoData();
    }
  }, [isLoading, user, habits.length, tasks.length, loadDemoData]);

  // Post-login / post-demo cockpit: Today is the primary surface.
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.provider !== 'guest') {
      navigate('/today', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const isAuthConfigured = Boolean(authConfig.domain && authConfig.clientId);

  // Preview — real data from the live store, real app grammar.
  const previewQuests = useMemo(
    () => (todayTasks.length > 0 ? todayTasks : tasks.filter(t => t.status !== 'done').slice(0, 4)),
    [todayTasks, tasks],
  );
  const previewHabits = useMemo(() => habits.filter(h => h.active).slice(0, 4), [habits]);
  const habitLogFor = (habit: Habit) => habitLogs.find(l => l.habit_id === habit.id && l.date === today);
  const habitDoneFor = (habit: Habit) => isHabitCompleted(habit, habitLogFor(habit));

  const bakasurLine = useMemo(() => {
    if (openTodayTasks.length > 0) {
      return `“Your best next move is “${openTodayTasks[0].title}”. You have ${openTodayTasks.length} active quest${openTodayTasks.length === 1 ? '' : 's'} today — start with the smallest finishable block.”`;
    }
    return '“The ledger is quiet today. Add one quest or log one habit — every check-in earns XP and feeds your attributes.”';
  }, [openTodayTasks]);

  // The completion moment — the one authored moment, reused verbatim from Today.
  interface FloatingXP { id: number; xp: number; statName: string; x: number; y: number }
  interface StarBurst { id: number; x: number; y: number }
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [starBursts, setStarBursts] = useState<StarBurst[]>([]);
  const [paneLit, setPaneLit] = useState(false);
  // Completion-moment ids (react-hooks/purity: Date.now()/Math.random() are
  // banned in component scope, so ids come from a stable counter).
  const fxIdRef = useRef(0);

  const triggerFloatingXP = (e: React.MouseEvent | null, xp: number, statName: string) => {
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
    const newXP = { id: ++fxIdRef.current, xp, statName, x, y };
    setFloatingXPs(prev => [...prev, newXP]);
    window.setTimeout(() => {
      setFloatingXPs(prev => prev.filter(item => item.id !== newXP.id));
    }, 1000);
  };

  const lightThePane = (e: React.MouseEvent | null, xp: number, statName: string) => {
    triggerFloatingXP(e, xp, statName);
    setPaneLit(false);
    requestAnimationFrame(() => setPaneLit(true));
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && 'clientX' in e && e.clientX) {
      x = e.clientX;
      y = e.clientY;
    }
    const star = { id: ++fxIdRef.current, x, y };
    setStarBursts(prev => [...prev, star]);
    window.setTimeout(() => {
      setStarBursts(prev => prev.filter(s => s.id !== star.id));
    }, 650);
  };

  const toggleQuest = (e: React.MouseEvent | null, task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    moveTask(task.id, nextStatus);
    if (nextStatus === 'done') {
      lightThePane(e, task.xp, task.area);
    }
  };

  const walkthrough = useMemo(() => [
    {
      id: 'today',
      label: 'Raise the shutter on Today',
      title: 'Start with one clear next move.',
      description: 'Today gathers your starred quests, habits, score, and focus state into one lit pane — the instrument you read each morning.',
      icon: Target,
      accent: CABINET_COLORS.today,
      fact: `${openTodayTasks.length} quest${openTodayTasks.length === 1 ? '' : 's'} waiting`,
      factSub: 'Focus · tasks · score',
    },
    {
      id: 'habits',
      label: 'Read the habits instrument',
      title: 'Small check-ins become visible progress.',
      description: 'Checkboxes, counters, mood, energy, and numeric logs all feed the same XP and character system.',
      icon: Flame,
      accent: CABINET_COLORS.habits,
      fact: `${habits.length} habits in motion`,
      factSub: 'Streaks · counters · XP',
    },
    {
      id: 'tasks',
      label: 'Run the task instrument',
      title: 'Turn the backlog into finishable quests.',
      description: 'Move work through Backlog, Todo, Doing, and Done without turning planning into another project.',
      icon: ListTodo,
      accent: CABINET_COLORS.tasks,
      fact: '4 columns, one board',
      factSub: 'Backlog · Doing · Done',
    },
    {
      id: 'reflect',
      label: 'The diary pane',
      title: 'End the day with one honest sentence.',
      description: 'Journal highlights and mood create a memory of the day instead of another empty archive.',
      icon: BookOpen,
      accent: CABINET_COLORS.journal,
      fact: `${journal.length} entr${journal.length === 1 ? 'y' : 'ies'} logged`,
      factSub: 'Mood · highlight · memory',
    },
    {
      id: 'journey',
      label: 'Read the night sky',
      title: 'Progress becomes a story you can read.',
      description: 'Journey turns your activity into levels, attributes, heatmaps, trends, and useful insights.',
      icon: Compass,
      accent: CABINET_COLORS.journey,
      fact: `LVL ${stats.level} · ${stats.xp} XP`,
      factSub: 'Heatmap · stats · insights',
    },
  ], [openTodayTasks.length, habits.length, journal.length, stats.level, stats.xp]);

  const activeWalkthrough = walkthrough[activeStep];
  const ActiveIcon = activeWalkthrough.icon;
  const nextStep = () => setActiveStep(current => (current + 1) % walkthrough.length);
  const previousStep = () => setActiveStep(current => (current - 1 + walkthrough.length) % walkthrough.length);

  const launchDemo = () => {
    localStorage.setItem('bt_demo_mode', 'true');
    // AuthProvider reads demo mode at boot, so use a full navigation intentionally.
    window.location.assign('/today');
  };

  const launchLogin = () => {
    localStorage.removeItem('bt_demo_mode');
    login();
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', color: 'var(--arcade-paper)' }}>
      {/* Floating XP + star bursts — the completion moment, positioned at the viewport */}
      {floatingXPs.map(item => (
        <div
          key={item.id}
          className="float-xp"
          style={{ position: 'fixed', left: `${item.x}px`, top: `${item.y}px`, transform: 'translate(-50%, -50%)', zIndex: 40 }}
        >
          +{item.xp} {item.statName.toUpperCase()} XP
        </div>
      ))}
      {starBursts.map(star => (
        <div
          key={star.id}
          className="star-join fixed z-30 pointer-events-none"
          style={{ left: `${star.x}px`, top: `${star.y}px`, transform: 'translate(-50%, -50%)', color: 'var(--arcade-gold)', fontSize: '20px', lineHeight: 1 }}
          aria-hidden="true"
        >
          ✦
        </div>
      ))}

      {/* Sticky tunnel nav */}
      <header className="w-full sticky top-0 z-50" style={{ background: 'linear-gradient(180deg, rgba(6,7,20,0.92), rgba(6,7,20,0.75))', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(139,92,246,0.16)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 md:px-10 py-3.5">
          <a href="#top" className="flex items-center gap-3 no-underline" aria-label="BakaTracker home">
            <img src="/logo.png" alt="BakaTracker" className="w-9 h-9 rounded-lg object-cover" style={{ border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 16px rgba(139,92,246,0.25)' }} />
            <span className="flex flex-col leading-none">
              <b className="marquee-title" style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--arcade-paper)' }}>BakaTracker</b>
              <small className="font-mono text-[9px] tracking-[0.22em] mt-1" style={{ color: 'var(--arcade-gold)' }}>PERSONAL LIFE OS</small>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-7 font-mono" aria-label="Landing page navigation">
            <a href="#how-it-works" className="landing-anchor landing-nav-link no-underline" style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>How it works</a>
            <a href="#features" className="landing-anchor landing-nav-link no-underline" style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Instruments</a>
            <a href="#ownership" className="landing-anchor landing-nav-link no-underline" style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Your instance</a>
          </nav>
          <div className="flex items-center gap-3">
                      <button type="button" className="landing-signin" onClick={launchLogin} disabled={!isAuthConfigured} title={isAuthConfigured ? 'Sign in or create your own BakaTracker instance' : 'Sign-in is not configured on this deployment'}>
                        <span className="landing-signin-bracket" aria-hidden="true">[</span>
                        <span className="landing-signin-label">{isAuthConfigured ? 'Sign in' : 'Sign-in unavailable'}</span>
                        <span className="landing-signin-cursor" aria-hidden="true" />
                        <span className="landing-signin-bracket" aria-hidden="true">]</span>
                      </button>
                      <button type="button" className="insert-coin !py-2 !px-4 !text-xs insert-coin--blink" onClick={launchDemo}><Play className="w-3.5 h-3.5" aria-hidden="true" /> TRY LIVE DEMO</button>
                    </div>
                  </div>
                </header>

      <main id="top">
        {/* ============ HERO — the real app floating in the tunnel ============ */}
        <section className="px-5 pt-14 pb-10 md:pt-20 md:pb-14 flex flex-col lg:flex-row gap-10 lg:gap-12 max-w-6xl mx-auto">
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 font-mono text-[11px] mb-5" style={{ color: 'rgba(233,230,242,0.7)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--arcade-gold)', boxShadow: '0 0 10px var(--arcade-gold)', animation: 'attract-blink 2s ease-in-out infinite' }} aria-hidden="true" />
              BakaTracker · A personal life operating system
            </div>
            <h1 className="marquee-title" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', color: 'var(--arcade-paper)' }}>
              Your life. Your quests.<br />
              <span className="marquee-title--glow">Your system.</span>
            </h1>
            <p className="landing-hero-copy">
                          A personal life operating system for tasks, habits, notes, journaling, progression, and AI — one calm workspace for
                          the whole day. Capture what is in front of you, complete the next quest, and watch the pattern appear.
                        </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button type="button" className="insert-coin insert-coin--blink" onClick={launchDemo}>
                <span className="coin-slot" aria-hidden="true" /> TRY LIVE DEMO <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button type="button" className="btn-ghost" onClick={launchLogin} disabled={!isAuthConfigured}>
                <Shield className="w-4 h-4" aria-hidden="true" /> {isAuthConfigured ? 'SIGN IN / CREATE YOUR INSTANCE' : 'Configure sign-in to continue'}
              </button>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 font-mono text-[11px]" style={{ color: 'rgba(233,230,242,0.7)' }}>
              <span className="flex items-center gap-1.5"><CloudOff className="w-3.5 h-3.5" style={{ color: 'var(--arcade-cobalt)' }} aria-hidden="true" /> Works locally first</span>
              <span className="flex items-center gap-1.5"><LockKeyhole className="w-3.5 h-3.5" style={{ color: 'var(--arcade-cobalt)' }} aria-hidden="true" /> Your data stays yours</span>
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" /> AI attends, you decide</span>
            </div>
          </div>

          {/* Hero demo pane — the REAL application, live on this page */}
          <div className="lg:w-[460px] shrink-0 landing-preview-float" aria-label="BakaTracker live product preview — the real application running on this page">
            <GlassPane
              as="div"
              state="playing"
              tone="aurora"
              paneTitle="BAKATRACKER · TODAY"
              titleRight={
                <span className="flex items-center gap-1.5 font-mono text-[9px]" style={{ color: 'var(--arcade-green)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--arcade-green)', boxShadow: '0 0 6px var(--arcade-green)' }} aria-hidden="true" /> LIVE
                </span>
              }
              className={paneLit ? 'pane-light' : ''}
              screenClassName="flex flex-col gap-3 [padding:14px]"
            >
                {/* screen header — real daily score from the store */}
                <div className="flex items-center justify-between gap-3">
                  <small className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: 'rgba(233,230,242,0.7)' }}>Today's focus</small>
                  <span className="chip chip--aurora score-readout">{dailyScore}% daily score</span>
                </div>

                {/* Day Line — one unbroken track, real done/total */}
                <div className="day-line">
                  <div className="day-line-track" role="img" aria-label={`${doneTodayTasks.length} of ${todayTasks.length} quests complete`}>
                    <div
                      className="day-line-fill"
                      style={{ '--day-line-progress': todayTasks.length > 0 ? doneTodayTasks.length / todayTasks.length : 0 } as React.CSSProperties}
                    />
                    <div
                      className="day-line-now"
                      style={{ '--day-line-now': `${todayTasks.length > 0 ? (doneTodayTasks.length / todayTasks.length) * 100 : 0}%` } as React.CSSProperties}
                    />
                  </div>
                  <span className="font-mono text-[10px] score-readout shrink-0" style={{ color: 'var(--arcade-gold)' }}>
                    {doneTodayTasks.length}/{todayTasks.length}
                  </span>
                </div>

                {/* Quest list — real Today quest rows, click toggles the real store */}
                <div className="flex flex-col gap-1.5">
                  {previewQuests.length === 0 ? (
                    <EmptyState title="No quests yet" description="The path ahead is waiting." />
                  ) : (
                    previewQuests.map(task => {
                      const isDone = task.status === 'done';
                      return (
                        <div
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isDone}
                          aria-label={`${task.title} — ${isDone ? 'mark as to do' : 'complete quest'}`}
                          onClick={(e) => toggleQuest(e, task)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            e.preventDefault();
                            toggleQuest(null, task);
                          }}
                          className="landing-quest-row flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer select-none border transition-all"
                          style={{
                            background: isDone ? 'rgba(52,211,153,0.05)' : 'rgba(233,230,242,0.03)',
                            borderColor: isDone ? 'rgba(52,211,153,0.3)' : 'rgba(233,230,242,0.1)',
                            opacity: isDone ? 0.72 : 1,
                          }}
                        >
                          {isDone ? (
                            <CheckSquare className="w-4 h-4 shrink-0" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" />
                          ) : (
                            <Square className="w-4 h-4 shrink-0" style={{ color: 'rgba(233,230,242,0.7)' }} aria-hidden="true" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="m-0 text-[11px] font-bold truncate" style={{ color: isDone ? 'var(--arcade-paper-muted)' : 'var(--arcade-paper)', textDecoration: isDone ? 'line-through' : 'none' }}>
                              {task.title}
                            </p>
                            <p className="m-0 font-mono text-[9px] mt-0.5 truncate" style={{ color: 'rgba(233,230,242,0.7)' }}>
                              {getAreaEmoji(task.area)} {task.area} · +{task.xp} XP
                            </p>
                          </div>
                          <em className="shrink-0 font-mono text-[9px] not-italic uppercase" style={{ color: isDone ? 'var(--arcade-green)' : 'var(--arcade-paper-disabled)' }}>
                            {isDone ? 'Done' : 'Open'}
                          </em>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* XP bar — real level from the store */}
                <div className="flex items-center gap-3 rounded-lg px-2.5 py-2" style={{ background: 'rgba(233,230,242,0.03)', border: '1px solid rgba(233,230,242,0.08)' }}>
                  <span className="font-mono text-[10px] score-readout shrink-0" style={{ color: 'var(--arcade-gold)' }}>LVL {stats.level}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-hairline-soft)', overflow: 'hidden' }} role="img" aria-label={`${stats.xp} of ${settings.xp_per_level} XP to the next level`}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${xpPct}%`,
                        background: 'linear-gradient(90deg, var(--obs-aurora-deep), var(--obs-aurora))',
                        boxShadow: '0 0 10px rgba(139,92,246,0.5)',
                        transition: 'width 500ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[9px] score-readout shrink-0" style={{ color: 'rgba(233,230,242,0.7)' }}>{stats.xp} / {settings.xp_per_level} XP</span>
                </div>

                {/* Habit chips — real habits, checkbox ones toggle the real store */}
                {previewHabits.length > 0 && (
                  <div>
                    <small className="block font-mono text-[9px] tracking-[0.18em] uppercase mb-1.5" style={{ color: 'rgba(233,230,242,0.7)' }}>Habits tonight</small>
                    <div className="flex flex-wrap gap-1.5">
                      {previewHabits.map(habit => {
                        const done = habitDoneFor(habit);
                        const streak = calculateHabitStreak(habit, habitLogs);
                        const interactive = habit.type === 'checkbox';
                        const inner = (
                          <>
                            <span aria-hidden="true">{habit.icon}</span>
                            <span className="truncate max-w-[120px]">{habit.name}</span>
                            {streak > 0 && <span className="score-readout" aria-hidden="true">🔥{streak}</span>}
                            {done && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
                          </>
                        );
                        return interactive ? (
                          <button
                            key={habit.id}
                            type="button"
                            aria-pressed={done}
                            aria-label={`${habit.name} — ${done ? 'log as not done' : 'log as done'}`}
                            onClick={() => toggleHabit(habit.id, today)}
                            className={`chip ${done ? 'chip--teal' : 'chip--aurora'} cursor-pointer select-none transition flex items-center gap-1`}
                          >
                            {inner}
                          </button>
                        ) : (
                          <span key={habit.id} className={`chip ${done ? 'chip--teal' : 'chip--aurora'} flex items-center gap-1`}>
                            {inner}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BakaSur — the attendant, reading the real ledger */}
                <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.22)' }}>
                  <span className="landing-orb shrink-0" aria-hidden="true"><Bot className="w-5 h-5" /></span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <b className="text-[10px]" style={{ color: 'var(--arcade-paper)' }}>BakaSur</b>
                      <small className="font-mono text-[8px]" style={{ color: 'rgba(233,230,242,0.7)' }}>attendant · live readout</small>
                    </div>
                    <p className="m-0 text-[10px] leading-relaxed" style={{ color: 'rgba(233,230,242,0.7)' }}>{bakasurLine}</p>
                  </div>
                </div>

                {/* footer — the honesty contract */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="save-lamp is-local" title="Preview data lives in this browser until you sign in"><span className="lamp-dot" aria-hidden="true" /> Offline · local</span>
                  <small className="font-mono text-[8px]" style={{ color: 'rgba(233,230,242,0.7)' }}>This is the real app — click a quest</small>
                </div>
            </GlassPane>
          </div>
        </section>

        {/* ============ WHY / HOW it connects — the daily loop ============ */}
        <section className="px-5 py-14 max-w-6xl mx-auto" id="how-it-works">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-9">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-gold)' }}>Why it exists · the daily loop</span>
              <h2 className="marquee-title mt-2" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>One system, from first light to weekly review.</h2>
            </div>
            <p className="max-w-sm text-sm" style={{ color: 'rgba(233,230,242,0.7)' }}>
              Productivity tools become another project. BakaTracker reduces the day to one quiet loop — capture, commit,
              check in, understand — a minute a day, and forgiving of rest.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Capture', text: 'Log the habit, task, thought, or sketch that is actually in front of you.', icon: CircleDot, color: 'var(--arcade-cobalt)' },
              { title: 'Commit', text: 'Choose a small number of quests for today so the board stays actionable.', icon: Target, color: 'var(--arcade-gold)' },
              { title: 'Check in', text: 'Complete the next step, earn XP, and let consistency — not perfection — compound.', icon: Check, color: 'var(--arcade-green)' },
              { title: 'Understand', text: 'Use Journey and BakaSur to see patterns, recover context, and plan better.', icon: TrendingUp, color: 'var(--arcade-magenta)' },
            ].map(step => {
              const Icon = step.icon;
              return (
                <GlassPane as="article" key={step.title} state="off" screenClassName="!py-5">
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ color: step.color, background: `${step.color}14`, border: `1px solid ${step.color}44` }} aria-hidden="true">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="marquee-title m-0 mb-1.5" style={{ fontSize: '1rem' }}>{step.title}</h3>
                  <p className="m-0 text-[0.8rem] leading-relaxed" style={{ color: 'rgba(233,230,242,0.7)' }}>{step.text}</p>
                </GlassPane>
              );
            })}
          </div>
          {/* The pipeline — how every feature connects */}
          <div className="landing-pipeline mt-8">
            {['Anything you log', 'XP', '5 attributes', 'Level', 'Streaks · heatmaps', 'BakaSur reads the ledger'].map((item, i) => (
              <span key={item} className="flex items-center gap-2">
                <span className="chip chip--aurora">{item}</span>
                {i < 5 && <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(233,230,242,0.7)' }} aria-hidden="true" />}
              </span>
            ))}
          </div>
        </section>

        {/* ============ WHAT it can do — the instrument row ============ */}
        <section className="px-5 py-14 max-w-6xl mx-auto" id="features">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-9">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-gold)' }}>What it can do · the instrument row</span>
              <h2 className="marquee-title mt-2" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>Every tool is a pane in reach.</h2>
            </div>
            <p className="max-w-sm text-sm" style={{ color: 'rgba(233,230,242,0.7)' }}>Each surface has one job. Together they make a lightweight personal operating system.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <GlassPane
                  as="article"
                  key={feature.title}
                  state="off"
                  tone={accentTone(feature.accent)}
                  paneTitle={feature.title}
                  className="transition hover:scale-[1.02]"
                  screenClassName="!py-4"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg mb-2.5" style={{ color: feature.accent, background: `${feature.accent}14`, border: `1px solid ${feature.accent}44` }} aria-hidden="true">
                    <Icon className="w-4 h-4" />
                  </span>
                  <p className="m-0 text-[0.8rem] leading-relaxed" style={{ color: 'rgba(233,230,242,0.7)' }}>{feature.text}</p>
                </GlassPane>
              );
            })}
          </div>
        </section>

        {/* ============ HOW it differs — task manager vs life OS ============ */}
        <section className="px-5 py-14 max-w-6xl mx-auto">
          <div className="text-center mb-9">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-gold)' }}>How it differs</span>
            <h2 className="marquee-title mt-2" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>A task manager tracks your list.<br />BakaTracker runs your system.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <GlassPane as="div" state="off" paneTitle="A task manager answers…" screenClassName="flex flex-col gap-2.5 !py-5">
                <p className="m-0 text-sm font-bold" style={{ color: 'rgba(233,230,242,0.7)' }}>“What's on my list?”</p>
                {[
                  'One more app to maintain, one more inbox to feed',
                  'Completion is a checkbox and the list is the product',
                  'The pattern behind your days stays invisible',
                ].map(item => (
                  <span key={item} className="flex items-center gap-2 font-mono text-xs" style={{ color: 'rgba(233,230,242,0.7)' }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--arcade-paper-disabled)' }} aria-hidden="true" /> {item}
                  </span>
                ))}
            </GlassPane>
            <GlassPane as="div" state="playing" tone="aurora" paneTitle="BakaTracker answers…" screenClassName="flex flex-col gap-2.5 !py-5">
                <p className="m-0 text-sm font-bold" style={{ color: 'var(--arcade-paper)' }}>“What should I do today — and how am I actually doing?”</p>
                {[
                  'Star quests for Today → one lit pane, one clear next move',
                  'Every check-in earns XP that feeds 5 life attributes and your level',
                  'Heatmaps, streaks, and a daily score show the pattern, not just the backlog',
                  'BakaSur reasons over your ledger, so context never gets lost',
                  'Local-first and self-hostable: your records live on your instance',
                ].map(item => (
                  <span key={item} className="flex items-center gap-2 font-mono text-xs" style={{ color: 'rgba(233,230,242,0.7)' }}>
                    <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" /> {item}
                  </span>
                ))}
            </GlassPane>
          </div>
        </section>

        {/* ============ HOW to try it — walkthrough ============ */}
        <section className="px-5 py-14 max-w-6xl mx-auto">
          <GlassPane as="div" state="playing" tone="cobalt" paneTitle="Walkthrough" screenClassName="grid lg:grid-cols-[1fr_1.2fr] gap-8 [padding:24px_32px]">
              <div className="flex flex-col justify-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-cobalt)' }}>See the loop before you sign in</span>
                <h2 className="marquee-title mt-2 mb-3" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}>{activeWalkthrough.title}</h2>
                <p className="m-0 text-sm leading-relaxed mb-5" style={{ color: 'rgba(233,230,242,0.7)' }}>{activeWalkthrough.description}</p>
                <button type="button" className="insert-coin self-start" onClick={launchDemo}>TRY LIVE DEMO <ArrowRight className="w-4 h-4" aria-hidden="true" /></button>
              </div>
              <div>
                <div className="rounded-lg p-4 mb-4 flex items-center justify-between" style={{ background: 'rgba(233,230,242,0.04)', border: '1px solid rgba(233,230,242,0.09)' }}>
                  <span className="flex items-center gap-2 font-mono text-[11px] font-bold" style={{ color: 'var(--arcade-paper)' }}>
                    <ActiveIcon className="w-4 h-4" style={{ color: activeWalkthrough.accent }} aria-hidden="true" /> {activeWalkthrough.label}
                  </span>
                  <span className="font-mono text-[10px] score-readout" style={{ color: 'rgba(233,230,242,0.7)' }}>{activeStep + 1} / {walkthrough.length}</span>
                </div>
                <div className="rounded-lg p-5 flex items-center gap-4" style={{ background: 'rgba(233,230,242,0.03)', border: '1px solid rgba(233,230,242,0.07)' }}>
                  <span className="w-0.5 self-stretch rounded-sm" style={{ background: activeWalkthrough.accent, opacity: 0.8 }} aria-hidden="true" />
                  <div>
                    <b className="block text-sm" style={{ color: 'var(--arcade-paper)' }}>{activeWalkthrough.fact}</b>
                    <span className="font-mono text-[10px]" style={{ color: 'rgba(233,230,242,0.7)' }}>{activeWalkthrough.factSub}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <button type="button" className="icon-button" onClick={previousStep} aria-label="Previous walkthrough step"><ChevronLeft className="w-4 h-4" aria-hidden="true" /></button>
                  <div className="flex gap-1.5">
                    {walkthrough.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        className="w-2 h-2 rounded-full cursor-pointer transition"
                        style={{ background: index === activeStep ? 'var(--arcade-gold)' : 'rgba(233,230,242,0.15)', boxShadow: index === activeStep ? '0 0 8px var(--arcade-gold)' : 'none' }}
                        onClick={() => setActiveStep(index)}
                        aria-label={`Open ${step.label}`}
                      />
                    ))}
                  </div>
                  <button type="button" className="icon-button" onClick={nextStep} aria-label="Next walkthrough step"><ChevronRight className="w-4 h-4" aria-hidden="true" /></button>
                </div>
              </div>
          </GlassPane>
        </section>

        {/* ============ HOW to create your own instance — ownership ============ */}
        <section className="px-5 py-14 max-w-6xl mx-auto" id="ownership">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-gold)' }}>Create your own instance</span>
              <h2 className="marquee-title mt-2 mb-3" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>Your records should belong to you.</h2>
              <p className="m-0 text-sm leading-relaxed mb-6 max-w-md" style={{ color: 'rgba(233,230,242,0.7)' }}>
                BakaTracker is designed to be self-hostable, local-first, and open source. Sign in to create your own instance —
                your records, your storage, your pace.
              </p>
              <div className="flex flex-col gap-2.5 mb-6">
                {[
                  'Local-first daily interaction',
                  'Cloudflare Worker + D1/R2/KV architecture',
                  'Controlled AI actions with explicit boundaries',
                  'MIT-licensed and self-hostable',
                ].map(item => (
                  <span key={item} className="flex items-center gap-2 font-mono text-xs" style={{ color: 'rgba(233,230,242,0.7)' }}>
                    <Check className="w-4 h-4" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" /> {item}
                  </span>
                ))}
              </div>
              <button type="button" className="btn-ghost" onClick={launchLogin} disabled={!isAuthConfigured}>
                <Shield className="w-4 h-4" aria-hidden="true" /> {isAuthConfigured ? 'SIGN IN / CREATE YOUR INSTANCE' : 'Configure sign-in to continue'}
              </button>
            </div>
            <GlassPane
              as="div"
              state="highscore"
              tone="aurora"
              paneTitle="FIRST LIGHT · YOUR INSTANCE"
              screenClassName="flex flex-col items-start gap-4 [padding:24px]"
            >
                <LockKeyhole className="w-7 h-7" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
                <strong className="marquee-title" style={{ fontSize: '1.1rem' }}>Your records. Your data. Your pace.</strong>
                <span className="text-sm leading-relaxed" style={{ color: 'rgba(233,230,242,0.7)' }}>No subscription wall. No productivity guilt. Just a clear place to continue.</span>
                <a href="https://github.com/srivatsacool/BakaTracker" target="_blank" rel="noreferrer" className="btn-ghost no-underline">
                  <GithubIcon className="w-4 h-4" aria-hidden="true" /> View the repository <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
            </GlassPane>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 py-16 text-center">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
            <img src="/logo.png" alt="BakaTracker" className="w-14 h-14 rounded-xl object-cover" style={{ border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 28px rgba(139,92,246,0.3)' }} />
            <h2 className="marquee-title" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>Start with one quest.</h2>
            <p className="text-sm max-w-md" style={{ color: 'rgba(233,230,242,0.7)' }}>Open the live demo, walk the system, and decide if it earns a place in your day.</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button type="button" className="insert-coin insert-coin--blink" onClick={launchDemo}><Play className="w-4 h-4" aria-hidden="true" /> TRY LIVE DEMO</button>
              <button type="button" className="btn-ghost" onClick={launchLogin} disabled={!isAuthConfigured}><Shield className="w-4 h-4" aria-hidden="true" /> {isAuthConfigured ? 'SIGN IN / CREATE YOUR INSTANCE' : 'Sign-in unavailable'}</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
              <span className="landing-footer-kicker">Built with care by build.srivatsa</span>
              <a href="https://github.com/srivatsacool/BakaTracker" target="_blank" rel="noreferrer" className="landing-footer-link">
                <GithubIcon className="w-3.5 h-3.5" aria-hidden="true" /> Open source on GitHub
              </a>
            </footer>
    </div>
  );
};