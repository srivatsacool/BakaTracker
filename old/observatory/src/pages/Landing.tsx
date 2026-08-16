import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { authConfig } from '../features/auth/config';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
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
  Target,
  TrendingUp,
} from 'lucide-react';

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

const walkthrough = [
  {
    id: 'today',
    label: 'Raise the shutter on Today',
    title: 'Start with one clear next move.',
    description: 'Today gathers your starred quests, habits, score, and focus state into one lit pane — the instrument you read each morning.',
    icon: Target,
    accent: CABINET_COLORS.today,
  },
  {
    id: 'habits',
    label: 'Read the habits instrument',
    title: 'Small check-ins become visible progress.',
    description: 'Checkboxes, counters, mood, energy, and numeric logs all feed the same XP and character system.',
    icon: Flame,
    accent: CABINET_COLORS.habits,
  },
  {
    id: 'tasks',
    label: 'Run the task instrument',
    title: 'Turn the backlog into finishable quests.',
    description: 'Move work through Backlog, Todo, Doing, and Done without turning planning into another project.',
    icon: ListTodo,
    accent: CABINET_COLORS.tasks,
  },
  {
    id: 'reflect',
    label: 'The diary pane',
    title: 'End the day with one honest sentence.',
    description: 'Journal highlights, mood, and energy create a memory of the day instead of another empty archive.',
    icon: BookOpen,
    accent: CABINET_COLORS.journal,
  },
  {
    id: 'journey',
    label: 'Read the night sky',
    title: 'Progress becomes a story you can read.',
    description: 'Journey turns your activity into levels, attributes, heatmaps, trends, and useful insights.',
    icon: Compass,
    accent: CABINET_COLORS.journey,
  },
];

const features = [
  { icon: Target, title: 'Today focus', text: 'A small execution pane for the quests that matter now.', accent: CABINET_COLORS.today },
  { icon: Flame, title: 'Habits', text: 'Fast daily tracking across five interaction types and five life attributes.', accent: CABINET_COLORS.habits },
  { icon: ListTodo, title: 'Task planner', text: 'A four-column Kanban backlog with areas, due dates, XP, and today stars.', accent: CABINET_COLORS.tasks },
  { icon: LayoutGrid, title: 'Priority matrix', text: 'Sort work by urgency and importance when everything feels loud.', accent: CABINET_COLORS.eisenhower },
  { icon: BookOpen, title: 'Journal', text: 'Highlight-first reflection with mood, energy, and quote context.', accent: CABINET_COLORS.journal },
  { icon: TrendingUp, title: 'Journey', text: 'Character progression, heatmaps, charts, and consistency insights.', accent: CABINET_COLORS.journey },
  { icon: NotebookPen, title: 'Visual notes', text: 'Notebooks and Excalidraw pages for thinking, diagrams, and ideas.', accent: CABINET_COLORS.notes },
  { icon: Bot, title: 'BakaSur', text: 'The attendant — reason over your own life ledger.', accent: 'var(--arcade-gold)' },
];

const demoTasks = [
  { title: 'Finish operations report', meta: 'Career · +30 XP', state: 'Doing', accent: CABINET_COLORS.tasks },
  { title: 'Read 20 pages', meta: 'Knowledge · +10 XP', state: 'Today', accent: CABINET_COLORS.journey },
  { title: 'Plan tomorrow’s focus', meta: 'Personal · +15 XP', state: 'Todo', accent: CABINET_COLORS.habits },
];

const demoHabits = [
  { label: 'Morning workout', value: '5 / 7', accent: CABINET_COLORS.habits },
  { label: 'Read pages', value: '20', accent: CABINET_COLORS.journey },
  { label: 'Energy', value: 'High', accent: CABINET_COLORS.habits },
];

export const Landing: React.FC = () => {
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.provider !== 'guest') {
      navigate('/journey', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const isAuthConfigured = Boolean(authConfig.domain && authConfig.clientId);
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

  const heroStats = useMemo(() => [
    { label: 'Daily score', value: '78%', accent: CABINET_COLORS.today },
    { label: 'Quests left', value: '3', accent: CABINET_COLORS.journey },
    { label: 'XP earned', value: '+185', accent: CABINET_COLORS.habits },
  ], []);

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', color: 'var(--arcade-paper)' }}>
      {/* Sticky observatory nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between gap-4 px-5 py-3"
        style={{ background: 'linear-gradient(180deg, rgba(7,6,12,0.92), rgba(7,6,12,0.75))', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(111,91,216,0.14)' }}
      >
        <a href="#top" className="flex items-center gap-2.5 no-underline" aria-label="BakaTracker home">
          <img src="/logo.png" alt="BakaTracker" className="w-9 h-9 rounded-lg object-cover" style={{ border: '1px solid rgba(111,91,216,0.4)', boxShadow: '0 0 16px rgba(111,91,216,0.25)' }} />
          <span className="flex flex-col leading-none">
            <b className="marquee-title" style={{ fontSize: '1.05rem', color: 'var(--arcade-paper)' }}>BakaTracker</b>
            <small className="font-mono text-[10px]" style={{ color: 'var(--arcade-gold)' }}>OBSERVATORY · LIFE OS</small>
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-6 font-mono text-xs" style={{ color: 'var(--arcade-paper-dim)' }} aria-label="Landing page navigation">
          <a href="#how-it-works" className="no-underline hover:text-arcade-gold" style={{ color: 'inherit' }}>How it works</a>
          <a href="#features" className="no-underline hover:text-arcade-gold" style={{ color: 'inherit' }}>Instruments</a>
          <a href="#ownership" className="no-underline hover:text-arcade-gold" style={{ color: 'inherit' }}>Ownership</a>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-text !text-xs" onClick={launchLogin} disabled={!isAuthConfigured}>
            {isAuthConfigured ? 'Sign in' : 'Sign in unavailable'}
          </button>
          <button type="button" className="insert-coin !py-2 !px-4 !text-xs insert-coin--blink" onClick={launchDemo}><Play className="w-3.5 h-3.5" aria-hidden="true" /> Demo</button>
        </div>
      </header>

      <main id="top">
        {/* Hero — the lit pane in the dark dome */}
        <section className="px-5 pt-14 pb-10 md:pt-20 md:pb-14 flex flex-col lg:flex-row gap-10 lg:gap-12 max-w-6xl mx-auto">
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 font-mono text-[11px] mb-5" style={{ color: 'var(--arcade-paper-muted)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--arcade-gold)', boxShadow: '0 0 10px var(--arcade-gold)', animation: 'attract-blink 2s ease-in-out infinite' }} aria-hidden="true" />
              Local-first life RPG · open source · ready for tonight
            </div>
            <h1 className="marquee-title" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', color: 'var(--arcade-paper)' }}>
              Your life, one<br />
              <span className="marquee-title--glow">OBSERVATION</span> at a time.
            </h1>
            <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed" style={{ color: 'var(--arcade-paper-dim)' }}>
              BakaTracker turns habits, tasks, reflection, notes, and progress into an observatory of glass instruments — so the daily check-in is one quiet observation, and showing up feels lighter than organizing your life.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button type="button" className="insert-coin insert-coin--blink" onClick={launchDemo}>
                <span className="coin-slot" aria-hidden="true" /> Explore the live demo <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button type="button" className="btn-ghost" onClick={launchLogin} disabled={!isAuthConfigured}>
                <Shield className="w-4 h-4" aria-hidden="true" /> {isAuthConfigured ? 'Sign in to save your journey' : 'Configure sign-in to continue'}
              </button>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 font-mono text-[11px]" style={{ color: 'var(--arcade-paper-muted)' }}>
              <span className="flex items-center gap-1.5"><CloudOff className="w-3.5 h-3.5" style={{ color: 'var(--arcade-cobalt)' }} aria-hidden="true" /> Works locally first</span>
              <span className="flex items-center gap-1.5"><LockKeyhole className="w-3.5 h-3.5" style={{ color: 'var(--arcade-cobalt)' }} aria-hidden="true" /> Your data stays yours</span>
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" /> AI-ready by design</span>
            </div>
          </div>

          {/* Hero demo pane */}
          <div className="lg:w-[460px] shrink-0" aria-label="BakaTracker interactive product preview">
            <div className="cabinet cabinet--playing" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
              <div className="cabinet-marquee">
                <span className="cabinet-led" aria-hidden="true" />
                <span className="cabinet-marquee-title">BAKATRACKER · DOME 01</span>
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px]" style={{ color: 'var(--arcade-green)' }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--arcade-green)', boxShadow: '0 0 6px var(--arcade-green)' }} aria-hidden="true" /> live</span>
              </div>
              <div className="cabinet-screen !p-4">
                {/* screen header */}
                <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid rgba(242,242,242,0.08)' }}>
                  <div>
                    <small className="font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }}>TONIGHT'S FOCUS</small>
                    <h2 className="marquee-title m-0 mt-1" style={{ fontSize: '1rem' }}>Make the next move obvious.</h2>
                  </div>
                  <span className="score-readout text-lg" style={{ color: 'var(--arcade-gold)' }}>78%</span>
                </div>
                {/* stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {heroStats.map(stat => (
                    <div key={stat.label} className="rounded-lg p-2.5" style={{ background: 'rgba(242,242,242,0.04)', border: '1px solid rgba(242,242,242,0.08)' }}>
                      <small className="block font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }}>{stat.label}</small>
                      <strong className="score-readout text-base" style={{ color: stat.accent }}>{stat.value}</strong>
                    </div>
                  ))}
                </div>
                {/* task panel */}
                <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid rgba(242,242,242,0.07)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--arcade-paper-dim)' }}>Priority quests</span>
                    <small className="font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }}>view all</small>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {demoTasks.map(task => (
                      <div key={task.title} className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ background: 'rgba(242,242,242,0.03)' }}>
                        <span className="w-0.5 h-4 rounded-sm shrink-0" style={{ background: task.accent, opacity: 0.8 }} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <b className="block text-[11px] truncate" style={{ color: 'var(--arcade-paper)' }}>{task.title}</b>
                          <small className="font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }}>{task.meta}</small>
                        </div>
                        <em className="font-mono text-[9px] not-italic" style={{ color: task.accent }}>{task.state}</em>
                      </div>
                    ))}
                  </div>
                </div>
                {/* habits + AI */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid rgba(242,242,242,0.07)' }}>
                    <span className="font-mono text-[10px] font-bold block mb-2" style={{ color: 'var(--arcade-paper-dim)' }}>Habits · tonight</span>
                    {demoHabits.map(habit => (
                      <div key={habit.label} className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-1.5 text-[10px] min-w-0" style={{ color: 'var(--arcade-paper-dim)' }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: habit.accent }} aria-hidden="true" />
                          <span className="truncate">{habit.label}</span>
                        </span>
                        <em className="font-mono text-[9px] not-italic score-readout" style={{ color: habit.accent }}>{habit.value}</em>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg p-3 flex flex-col" style={{ background: 'rgba(111,91,216,0.05)', border: '1px solid rgba(111,91,216,0.18)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--arcade-gold)', boxShadow: '0 0 8px var(--arcade-gold)' }} aria-hidden="true" />
                      <b className="text-[10px]">BakaSur</b>
                      <small className="font-mono text-[8px]" style={{ color: 'var(--arcade-paper-muted)' }}>attendant</small>
                    </div>
                    <p className="m-0 text-[10px] leading-relaxed" style={{ color: 'var(--arcade-paper-dim)' }}>“Three quests left in the dome. Start with the operations report while your energy is high.”</p>
                    <div className="mt-auto pt-2 font-mono text-[9px] flex items-center justify-between" style={{ color: 'var(--arcade-paper-muted)' }}>
                      <span>Ask BakaSur…</span><ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works — the daily loop */}
        <section className="px-5 py-14 max-w-6xl mx-auto" id="how-it-works">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-9">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-gold)' }}>The daily loop</span>
              <h2 className="marquee-title mt-2" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>One system, from first light to weekly review.</h2>
            </div>
            <p className="max-w-sm text-sm" style={{ color: 'var(--arcade-paper-muted)' }}>BakaTracker keeps the pieces connected without making you maintain a complicated productivity machine.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Capture', text: 'Log the habit, task, thought, or sketch that is actually in front of you.', icon: CircleDot, color: 'var(--arcade-cobalt)' },
              { title: 'Commit', text: 'Choose a small number of quests for today so the board stays actionable.', icon: Target, color: 'var(--arcade-gold)' },
              { title: 'Check in', text: 'Complete the next step, earn XP, and let consistency—not perfection—compound.', icon: Check, color: 'var(--arcade-green)' },
              { title: 'Understand', text: 'Use Journey and BakaSur to see patterns, recover context, and plan better.', icon: TrendingUp, color: 'var(--arcade-magenta)' },
            ].map(step => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="cabinet cabinet--off !overflow-visible">
                  <div className="cabinet-screen !py-5">
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ color: step.color, background: `${step.color}14`, border: `1px solid ${step.color}44` }} aria-hidden="true">
                      <Icon className="w-5 h-5" />
                    </span>
                    <h3 className="marquee-title m-0 mb-1.5" style={{ fontSize: '1rem' }}>{step.title}</h3>
                    <p className="m-0 text-[0.8rem] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>{step.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Features — the instrument map */}
        <section className="px-5 py-14 max-w-6xl mx-auto" id="features">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-9">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-gold)' }}>The instrument row</span>
              <h2 className="marquee-title mt-2" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>Every tool is a pane in reach.</h2>
            </div>
            <p className="max-w-sm text-sm" style={{ color: 'var(--arcade-paper-muted)' }}>Each surface has one job. Together they make a lightweight personal operating system.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(feature => {
              return (
                <article key={feature.title} className="group cabinet cabinet--off transition hover:scale-[1.02]" style={{ '--marquee-color': feature.accent } as React.CSSProperties}>
                  <div className="cabinet-marquee">
                    <span className="cabinet-led" aria-hidden="true" />
                    <span className="cabinet-marquee-title">{feature.title}</span>
                  </div>
                  <div className="cabinet-screen !py-4">
                    <p className="m-0 text-[0.8rem] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>{feature.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Walkthrough */}
        <section className="px-5 py-14 max-w-6xl mx-auto">
          <div className="cabinet cabinet--playing" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
            <div className="cabinet-marquee">
              <span className="cabinet-led" aria-hidden="true" />
              <span className="cabinet-marquee-title">Walkthrough</span>
            </div>
            <div className="cabinet-screen grid lg:grid-cols-[1fr_1.2fr] gap-8 !p-6 md:!p-8">
              <div className="flex flex-col justify-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-cobalt)' }}>See the loop before you sign in</span>
                <h2 className="marquee-title mt-2 mb-3" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}>{activeWalkthrough.title}</h2>
                <p className="m-0 text-sm leading-relaxed mb-5" style={{ color: 'var(--arcade-paper-dim)' }}>{activeWalkthrough.description}</p>
                <button type="button" className="insert-coin self-start" onClick={launchDemo}>Open the live demo <ArrowRight className="w-4 h-4" aria-hidden="true" /></button>
              </div>
              <div>
                <div className="rounded-lg p-4 mb-4 flex items-center justify-between" style={{ background: 'rgba(242,242,242,0.04)', border: '1px solid rgba(242,242,242,0.09)' }}>
                  <span className="flex items-center gap-2 font-mono text-[11px] font-bold" style={{ color: 'var(--arcade-paper)' }}>
                    <ActiveIcon className="w-4 h-4" style={{ color: activeWalkthrough.accent }} aria-hidden="true" /> {activeWalkthrough.label}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>{activeStep + 1} / {walkthrough.length}</span>
                </div>
                <div className="rounded-lg p-5 flex items-center gap-4" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid rgba(242,242,242,0.07)' }}>
                  <span className="w-0.5 self-stretch rounded-sm" style={{ background: activeWalkthrough.accent, opacity: 0.8 }} aria-hidden="true" />
                  <div>
                    <b className="block text-sm" style={{ color: 'var(--arcade-paper)' }}>
                      {activeStep === 0 ? '3 quests waiting' : activeStep === 1 ? '6 habits in motion' : activeStep === 2 ? '4 columns, one board' : activeStep === 3 ? 'One sentence is enough' : 'Level 14 · Pathfinder'}
                    </b>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>
                      {activeStep === 0 ? 'Focus · tasks · score' : activeStep === 1 ? 'Streaks · counters · XP' : activeStep === 2 ? 'Backlog · Doing · Done' : activeStep === 3 ? 'Mood · energy · memory' : 'Heatmap · stats · insights'}
                    </span>
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
                        style={{ background: index === activeStep ? 'var(--arcade-gold)' : 'rgba(242,242,242,0.15)', boxShadow: index === activeStep ? '0 0 8px var(--arcade-gold)' : 'none' }}
                        onClick={() => setActiveStep(index)}
                        aria-label={`Open ${step.label}`}
                      />
                    ))}
                  </div>
                  <button type="button" className="icon-button" onClick={nextStep} aria-label="Next walkthrough step"><ChevronRight className="w-4 h-4" aria-hidden="true" /></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ownership */}
        <section className="px-5 py-14 max-w-6xl mx-auto" id="ownership">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--arcade-gold)' }}>Built around ownership</span>
              <h2 className="marquee-title mt-2 mb-3" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>Your records should belong to you.</h2>
              <p className="m-0 text-sm leading-relaxed mb-6 max-w-md" style={{ color: 'var(--arcade-paper-dim)' }}>
                BakaTracker is designed to be self-hostable, local-first, and open source. The frontend talks to the REST layer; AI and MCP stay behind controlled application boundaries.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  'Local-first daily interaction',
                  'Cloudflare Worker + D1/R2/KV architecture',
                  'Controlled AI actions with explicit boundaries',
                  'MIT-licensed and self-hostable',
                ].map(item => (
                  <span key={item} className="flex items-center gap-2 font-mono text-xs" style={{ color: 'var(--arcade-paper-dim)' }}>
                    <Check className="w-4 h-4" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" /> {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="cabinet cabinet--highscore" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
              <div className="cabinet-marquee">
                <span className="cabinet-led" aria-hidden="true" />
                <span className="cabinet-marquee-title">FIRST LIGHT · YOUR INSTANCE</span>
              </div>
              <div className="cabinet-screen flex flex-col items-start gap-4 !p-6">
                <LockKeyhole className="w-7 h-7" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
                <strong className="marquee-title" style={{ fontSize: '1.1rem' }}>Your records. Your data. Your pace.</strong>
                <span className="text-sm leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>No subscription wall. No productivity guilt. Just a clear place to continue.</span>
                <a href="https://github.com/srivatsacool/BakaTracker" target="_blank" rel="noreferrer" className="btn-ghost no-underline">
                  <GithubIcon className="w-4 h-4" aria-hidden="true" /> View the repository <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 py-16 text-center">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
            <img src="/logo.png" alt="BakaTracker" className="w-14 h-14 rounded-xl object-cover" style={{ border: '1px solid rgba(111,91,216,0.4)', boxShadow: '0 0 28px rgba(111,91,216,0.3)' }} />
            <h2 className="marquee-title" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>Start with one observation.</h2>
            <p className="text-sm max-w-md" style={{ color: 'var(--arcade-paper-muted)' }}>Open the live demo, walk the system, and decide if it earns a place in your day.</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button type="button" className="insert-coin insert-coin--blink" onClick={launchDemo}><Play className="w-4 h-4" aria-hidden="true" /> Explore the demo</button>
              <button type="button" className="btn-ghost" onClick={launchLogin} disabled={!isAuthConfigured}><Shield className="w-4 h-4" aria-hidden="true" /> {isAuthConfigured ? 'Sign in' : 'Sign-in unavailable'}</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-5 py-6 flex items-center justify-center gap-2 font-mono text-[11px]" style={{ color: 'var(--arcade-paper-disabled)', borderTop: '1px solid rgba(242,242,242,0.07)' }}>
        <span>Built with care by build.srivatsa</span>
        <span aria-hidden="true">·</span>
        <a href="https://github.com/srivatsacool/BakaTracker" target="_blank" rel="noreferrer" className="no-underline hover:text-arcade-gold" style={{ color: 'inherit' }}>
          <GithubIcon className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" /> Open source on GitHub
        </a>
      </footer>
    </div>
  );
};
