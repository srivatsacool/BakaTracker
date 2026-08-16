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
import './Landing.css';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const walkthrough = [
  {
    id: 'today',
    label: 'Slot in Today',
    title: 'Start with one clear next move.',
    description: 'Today gathers your starred quests, habits, score, and focus state into one calm command surface.',
    icon: Target,
    accent: '#ff9f43',
  },
  {
    id: 'habits',
    label: 'Build consistency',
    title: 'Small check-ins become visible progress.',
    description: 'Checkboxes, counters, mood, energy, and numeric logs all feed the same XP and character system.',
    icon: Flame,
    accent: '#ffd60a',
  },
  {
    id: 'tasks',
    label: 'Plan the work',
    title: 'Turn the backlog into finishable quests.',
    description: 'Move work through Backlog, Todo, Doing, and Done without turning planning into another project.',
    icon: ListTodo,
    accent: '#2ba0ff',
  },
  {
    id: 'reflect',
    label: 'Reflect quickly',
    title: 'End the day with one honest sentence.',
    description: 'Journal highlights, mood, and energy create a memory of the day instead of another empty archive.',
    icon: BookOpen,
    accent: '#b07de8',
  },
  {
    id: 'journey',
    label: 'See the journey',
    title: 'Progress becomes a story you can read.',
    description: 'Journey turns your activity into levels, attributes, heatmaps, trends, and useful insights.',
    icon: Compass,
    accent: '#6fd08c',
  },
];

const features = [
  { icon: Target, title: 'Today focus', text: 'A small execution surface for the quests that matter now.', accent: '#ff9f43' },
  { icon: Flame, title: 'Habits', text: 'Fast daily tracking across five interaction types and five life attributes.', accent: '#ffd60a' },
  { icon: ListTodo, title: 'Task planner', text: 'A four-column Kanban backlog with areas, due dates, XP, and today stars.', accent: '#2ba0ff' },
  { icon: LayoutGrid, title: 'Priority matrix', text: 'Sort work by urgency and importance when everything feels loud.', accent: '#e05252' },
  { icon: BookOpen, title: 'Journal', text: 'Highlight-first reflection with mood, energy, and quote context.', accent: '#b07de8' },
  { icon: TrendingUp, title: 'Journey', text: 'Character progression, heatmaps, charts, and consistency insights.', accent: '#6fd08c' },
  { icon: NotebookPen, title: 'Visual notes', text: 'Notebooks and Excalidraw pages for thinking, diagrams, and ideas.', accent: '#7dc4ff' },
  { icon: Bot, title: 'BakaSur', text: 'A global assistant surface for reasoning over your own life ledger.', accent: '#ff9f43' },
];

const demoTasks = [
  { title: 'Finish operations report', meta: 'Career · +30 XP', state: 'Doing', accent: '#ff9f43' },
  { title: 'Read 20 pages', meta: 'Knowledge · +10 XP', state: 'Today', accent: '#2ba0ff' },
  { title: 'Plan tomorrow’s focus', meta: 'Personal · +15 XP', state: 'Todo', accent: '#ffd60a' },
];

const demoHabits = [
  { label: 'Morning workout', value: '5 / 7', accent: '#ffd60a' },
  { label: 'Read pages', value: '20', accent: '#2ba0ff' },
  { label: 'Energy', value: 'High', accent: '#6fd08c' },
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
    { label: 'Daily score', value: '78%', accent: '#ff9f43' },
    { label: 'Quests left', value: '3', accent: '#2ba0ff' },
    { label: 'XP earned', value: '+185', accent: '#ffd60a' },
  ], []);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a href="#top" className="landing-brand" aria-label="BakaTracker home">
          <img src="/logo.png" alt="BakaTracker" />
          <span><b>BakaTracker</b><small>Personal life OS</small></span>
        </a>
        <nav className="landing-links" aria-label="Landing page navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#ownership">Ownership</a>
        </nav>
        <div className="landing-nav-actions">
          <button type="button" className="landing-text-button" onClick={launchLogin} disabled={!isAuthConfigured}>
            {isAuthConfigured ? 'Sign in' : 'Sign in unavailable'}
          </button>
          <button type="button" className="landing-mini-cta" onClick={launchDemo}><Play aria-hidden="true" /> Demo</button>
        </div>
      </header>

      <main id="top">
        <section className="landing-hero-section">
          <div className="landing-hero-copy">
            <div className="landing-status-line"><span className="status-pulse" /> Local-first life RPG · open source · ready for today</div>
            <h1>Your life, one cartridge at a time.</h1>
            <p className="landing-hero-lede">
              BakaTracker turns habits, tasks, reflection, notes, and progress into a shelf of slot-in games—so the daily check-in is one click of insertion, and showing up feels lighter than organizing your life.
            </p>
            <div className="landing-hero-actions">
              <button type="button" className="landing-primary-cta" onClick={launchDemo}><Play aria-hidden="true" /> Explore the live demo <ArrowRight aria-hidden="true" /></button>
              <button type="button" className="landing-secondary-cta" onClick={launchLogin} disabled={!isAuthConfigured}><Shield aria-hidden="true" /> {isAuthConfigured ? 'Sign in to save your journey' : 'Configure sign-in to continue'}</button>
            </div>
            <div className="landing-proof-row">
              <span><CloudOff aria-hidden="true" /> Works locally first</span>
              <span><LockKeyhole aria-hidden="true" /> Your data stays yours</span>
              <span><Sparkles aria-hidden="true" /> AI-ready by design</span>
            </div>
          </div>

          <div className="landing-hero-demo" aria-label="BakaTracker interactive product preview">
            <div className="preview-window-bar">
              <span className="preview-dots"><i /><i /><i /></span>
              <span className="preview-route">today / slot-01</span>
              <span className="preview-live"><span /> live demo</span>
            </div>
            <div className="preview-app-grid">
              <aside className="preview-side-rail">
                <img src="/logo.png" alt="" />
                <span className="preview-side-active"><Target aria-hidden="true" /></span>
                <span><ListTodo aria-hidden="true" /></span>
                <span><Flame aria-hidden="true" /></span>
                <span><NotebookPen aria-hidden="true" /></span>
                <span><Compass aria-hidden="true" /></span>
              </aside>
              <div className="preview-workspace">
                <div className="preview-context"><span>Thursday · Aug 15</span><b>09:42</b><em>LVL 14 · save ok</em></div>
                <div className="preview-heading"><div><small>Today focus</small><h2>Make the next move obvious.</h2></div><span className="preview-score">78%</span></div>
                <div className="preview-stats">
                  {heroStats.map(stat => <div key={stat.label} className="preview-stat"><small>{stat.label}</small><strong style={{ color: stat.accent }}>{stat.value}</strong></div>)}
                </div>
                <div className="preview-panels">
                  <div className="preview-panel preview-task-panel"><div className="preview-panel-title"><span>Priority quests</span><small>view all</small></div>{demoTasks.map(task => <div className="preview-task" key={task.title}><span className="preview-task-mark" style={{ background: task.accent }} /><div><b>{task.title}</b><small>{task.meta}</small></div><em>{task.state}</em></div>)}</div>
                  <div className="preview-panel"><div className="preview-panel-title"><span>Habits</span><small>today</small></div>{demoHabits.map(habit => <div className="preview-habit" key={habit.label}><span style={{ background: habit.accent }} /><b>{habit.label}</b><em>{habit.value}</em></div>)}</div>
                </div>
              </div>
              <aside className="preview-ai-panel"><div className="preview-ai-title"><span className="preview-ai-orb"><i /></span><div><b>BakaSur</b><small>global assistant</small></div></div><p>“Three quests left in the slot. Start with the operations report while your energy is high.”</p><span className="preview-source">Today · demo data</span><div className="preview-ai-input">Ask BakaSur… <ArrowRight aria-hidden="true" /></div></aside>
            </div>
          </div>
        </section>

        <section className="landing-section landing-loop-section" id="how-it-works">
          <div className="section-heading-row"><div><span className="section-kicker">The daily loop</span><h2>One system, from first check-in to weekly review.</h2></div><p>BakaTracker keeps the pieces connected without making you maintain a complicated productivity machine.</p></div>
          <div className="loop-grid">
            {[
              { title: 'Capture', text: 'Log the habit, task, thought, or sketch that is actually in front of you.', icon: CircleDot, color: '#7dc4ff' },
              { title: 'Commit', text: 'Choose a small number of quests for today so the board stays actionable.', icon: Target, color: '#ff9f43' },
              { title: 'Check in', text: 'Complete the next step, earn XP, and let consistency—not perfection—compound.', icon: Check, color: '#6fd08c' },
              { title: 'Understand', text: 'Use Journey and BakaSur to see patterns, recover context, and plan better.', icon: TrendingUp, color: '#ffd60a' },
            ].map(step => { const Icon = step.icon; return <article className="loop-card" key={step.title}><span className="loop-icon" style={{ color: step.color, borderColor: `${step.color}55`, background: `${step.color}14` }}><Icon aria-hidden="true" /></span><h3>{step.title}</h3><p>{step.text}</p></article>; })}
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="section-heading-row"><div><span className="section-kicker">The shelf</span><h2>Every tool is a cartridge in reach.</h2></div><p>Each surface has one job. Together they make a lightweight personal operating system.</p></div>
          <div className="feature-map">
            {features.map(feature => { const Icon = feature.icon; return <article className="feature-map-item" key={feature.title}><span className="feature-map-icon" style={{ color: feature.accent, borderColor: `${feature.accent}44`, background: `${feature.accent}12` }}><Icon aria-hidden="true" /></span><div><h3>{feature.title}</h3><p>{feature.text}</p></div><ArrowRight className="feature-map-arrow" aria-hidden="true" /></article>; })}
          </div>
        </section>

        <section className="landing-section walkthrough-section">
          <div className="walkthrough-shell">
            <div className="walkthrough-intro"><span className="section-kicker">Walk through the real app</span><h2>See the loop before you sign in.</h2><p>Use the seeded demo to click through the same core surfaces a new user meets on day one.</p><button type="button" className="landing-primary-cta" onClick={launchDemo}>Open the live demo <ArrowRight aria-hidden="true" /></button></div>
            <div className="walkthrough-stage">
              <div className="walkthrough-stage-header"><span><ActiveIcon aria-hidden="true" style={{ color: activeWalkthrough.accent }} /> {activeWalkthrough.label}</span><span>{activeStep + 1} / {walkthrough.length}</span></div>
              <div className="walkthrough-stage-body"><h3>{activeWalkthrough.title}</h3><p>{activeWalkthrough.description}</p><div className="walkthrough-visual"><div className="walkthrough-visual-line" style={{ background: activeWalkthrough.accent }} /><div><b>{activeStep === 0 ? '3 quests waiting' : activeStep === 1 ? '6 habits in motion' : activeStep === 2 ? '4 columns, one board' : activeStep === 3 ? 'One sentence is enough' : 'Level 14 · Pathfinder'}</b><span>{activeStep === 0 ? 'Focus · tasks · score' : activeStep === 1 ? 'Streaks · counters · XP' : activeStep === 2 ? 'Backlog · Doing · Done' : activeStep === 3 ? 'Mood · energy · memory' : 'Heatmap · stats · insights'}</span></div></div></div>
              <div className="walkthrough-controls"><button type="button" className="icon-button" onClick={previousStep} aria-label="Previous walkthrough step"><ChevronLeft aria-hidden="true" /></button><div className="walkthrough-dots">{walkthrough.map((step, index) => <button type="button" key={step.id} className={index === activeStep ? 'is-active' : ''} onClick={() => setActiveStep(index)} aria-label={`Open ${step.label}`} />)}</div><button type="button" className="icon-button" onClick={nextStep} aria-label="Next walkthrough step"><ChevronRight aria-hidden="true" /></button></div>
            </div>
          </div>
        </section>

        <section className="landing-section ownership-section" id="ownership">
          <div className="ownership-copy"><span className="section-kicker">Built around ownership</span><h2>Your save file should belong to you.</h2><p>BakaTracker is designed to be self-hostable, local-first, and open source. The frontend talks to the REST layer; AI and MCP stay behind controlled application boundaries.</p><div className="ownership-list"><span><Check aria-hidden="true" /> Local-first daily interaction</span><span><Check aria-hidden="true" /> Cloudflare Worker + D1/R2/KV architecture</span><span><Check aria-hidden="true" /> Controlled AI actions with explicit boundaries</span><span><Check aria-hidden="true" /> MIT-licensed and self-hostable</span></div></div><div className="ownership-card"><LockKeyhole aria-hidden="true" /><strong>Your instance. Your data. Your pace.</strong><span>No subscription wall. No productivity guilt. Just a clear place to continue.</span><a href="https://github.com/srivatsacool/BakaTracker" target="_blank" rel="noreferrer"><GithubIcon aria-hidden="true" /> View the repository <ArrowRight aria-hidden="true" /></a></div>
        </section>

        <section className="landing-final-cta"><img src="/logo.png" alt="BakaTracker" /><h2>Start with one small cartridge.</h2><p>Open the live demo, walk the system, and decide if it earns a place in your day.</p><div className="landing-hero-actions"><button type="button" className="landing-primary-cta" onClick={launchDemo}><Play aria-hidden="true" /> Explore the demo</button><button type="button" className="landing-secondary-cta" onClick={launchLogin} disabled={!isAuthConfigured}><Shield aria-hidden="true" /> {isAuthConfigured ? 'Sign in' : 'Sign-in unavailable'}</button></div></section>
      </main>

      <footer className="landing-footer"><span>Built with care by build.srivatsa</span><span>·</span><a href="https://github.com/srivatsacool/BakaTracker" target="_blank" rel="noreferrer"><GithubIcon aria-hidden="true" /> Open source on GitHub</a></footer>
    </div>
  );
};
