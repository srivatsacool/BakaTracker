import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { authConfig } from '../features/auth/config';
import {
  Flame, ListTodo, Target, BookOpen, Compass, LayoutGrid,
  Zap, Sparkles, ChevronRight, Shield,
  Smartphone, CloudOff, Gamepad2, Star, Code
} from 'lucide-react';

const GithubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const features = [
  {
    icon: Flame,
    title: 'Habits Tracker',
    desc: 'Log daily behaviors with Checkbox, Counter, Numeric, Mood & Energy trackers. See streaks and earn XP.',
    color: '#FF5C5C',
    route: '/habits',
  },
  {
    icon: ListTodo,
    title: 'Kanban Backlog',
    desc: 'Organize tasks across a 4-column board — Backlog → Todo → Doing → Done.',
    color: '#3B82F6',
    route: '/tasks',
  },
  {
    icon: LayoutGrid,
    title: 'Eisenhower Matrix',
    desc: 'Prioritize tasks by urgency and importance: Do, Schedule, Delegate, or Delete.',
    color: '#8B5CF6',
    route: '/eisenhower',
  },
  {
    icon: Target,
    title: 'Today Focus Board',
    desc: 'Star tasks for the day and enter Spotlight Focus Mode to eliminate distractions.',
    color: '#FFBE3C',
    route: '/today',
  },
  {
    icon: BookOpen,
    title: 'Highlight Journal',
    desc: 'Record a daily win plus bullet journal entries. Track your mood over time.',
    color: '#22C55E',
    route: '/journal',
  },
  {
    icon: Compass,
    title: 'Journey Analytics',
    desc: 'View consistency heatmaps, weekly XP charts, RPG character stats, and auto-generated insights.',
    color: '#FF90E8',
    route: '/journey',
  },
];

const techBadges = [
  { icon: Gamepad2, label: 'RPG Leveling', sub: '5 attributes · titles · XP system' },
  { icon: CloudOff, label: 'Local-First', sub: 'Works offline. No server needed.' },
  { icon: Shield, label: 'MCP-Powered', sub: 'AI assistants can read/write your data' },
  { icon: Smartphone, label: 'PWA Ready', sub: 'Install as a desktop/mobile app' },
  { icon: Star, label: 'Zero Cost', sub: 'Google Sheets = free database' },
  { icon: Code, label: 'Open Source', sub: 'MIT · Self-host · Contribute' },
];

export const Landing: React.FC = () => {
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const navigate = useNavigate();

  // If already authenticated (real auth), go straight to app
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.provider !== 'guest') {
      navigate('/journey', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const handleExploreDemo = () => {
    // Set demo mode flag so AuthProvider treats us as guest
    localStorage.setItem('bt_demo_mode', 'true');
    // Full page load to re-mount AuthProvider with demo mode
    window.location.href = '/habits';
  };

  const handleSignIn = () => {
    localStorage.removeItem('bt_demo_mode');
    login();
  };

  const isAuthConfigured = Boolean(authConfig.domain && authConfig.clientId);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans overflow-x-hidden">
      {/* ─── HERO ─── */}
      <section className="relative px-4 py-12 md:py-20 md:px-8 max-w-6xl mx-auto flex flex-col items-center text-center gap-6">
        {/* Logo */}
        <div className="relative">
          <img
            src="/logo.png"
            alt="BakaTracker Logo"
            className="w-24 h-24 md:w-28 md:h-28 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] object-cover"
          />
          <div className="absolute -top-2 -right-2 bg-accent-pink border-2 border-black rounded-full p-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">
            BakaTracker
          </h1>
          <p className="mt-2 font-mono text-sm md:text-base text-gray-500 uppercase tracking-widest">
            Gamified Life RPG Planner
          </p>
        </div>

        <p className="max-w-lg font-mono text-sm md:text-base leading-relaxed text-gray-600 dark:text-gray-400">
          Gamify your habits, tasks, and daily journal highlights. 
          A minimalist, self-hostable personal life operating system 
          powered by Google Sheets and the Model Context Protocol.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
          <button
            onClick={handleExploreDemo}
            className="flex-1 flex items-center justify-center gap-2 bg-accent-pink hover:bg-accent-pink/90 text-black border-3 border-black rounded-xl py-3.5 font-black text-sm shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
          >
            <Zap className="w-5 h-5" />
            <span>EXPLORE DEMO</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {isAuthConfigured ? (
            <button
              onClick={handleSignIn}
              className="flex-1 flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white border-3 border-black rounded-xl py-3.5 font-black text-sm shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
            >
              <Shield className="w-5 h-5" />
              <span>SIGN IN</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl py-3.5 font-mono text-xs text-gray-400 cursor-not-allowed">
              <Shield className="w-4 h-4" />
              <span>Auth not configured</span>
            </div>
          )}
        </div>

        {!isAuthConfigured && (
          <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 max-w-sm">
            Set <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">VITE_AUTH0_DOMAIN</code> &{' '}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">VITE_AUTH0_CLIENT_ID</code> in your{' '}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">.env</code> to enable Sign In.
          </p>
        )}

        {/* Scroll hint */}
        <div className="mt-4 text-gray-400 animate-bounce">
          <ChevronRight className="w-6 h-6 rotate-90" />
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="px-4 py-12 md:py-16 md:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            Everything You Need
          </h2>
          <p className="font-mono text-sm text-gray-500 mt-1">
            Six integrated tools to track your life, gamified.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="neo-card p-5 bg-white dark:bg-surface border-2 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <div
                  className="w-10 h-10 rounded-lg border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  style={{ backgroundColor: f.color + '20' }}
                >
                  <Icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="font-black text-sm">{f.title}</h3>
                  <p className="font-mono text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── TECH & ARCHITECTURE ─── */}
      <section className="px-4 py-12 md:py-16 md:px-8 bg-black/5 dark:bg-white/5 border-y-2 border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Built Different
            </h2>
            <p className="font-mono text-sm text-gray-500 mt-1">
              Local-first, zero-cost, AI-ready architecture.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {techBadges.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.label}
                  className="flex flex-col items-center text-center gap-2 p-4 bg-white dark:bg-surface border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Icon className="w-6 h-6 text-accent-pink" />
                  <div>
                    <p className="font-black text-[11px] leading-tight">{b.label}</p>
                    <p className="font-mono text-[9px] text-gray-500 mt-0.5">{b.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Architecture Diagram */}
          <div className="mt-8 p-5 bg-accent-pink/5 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono text-xs leading-relaxed">
            <p className="font-black text-sm mb-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent-pink" />
              Architecture
            </p>
            <pre className="text-gray-600 dark:text-gray-400 overflow-x-auto">
{`React PWA (Cloudflare)  ←→  FastAPI + FastMCP (Cloud Run)  ←→  Google Sheets (free)
         ↕                              ↕
   LocalStorage                  AI Assistants (Cursor, Claude, ChatGPT)
  (offline-first)                via JSON-RPC / MCP protocol`}
            </pre>
          </div>
        </div>
      </section>

      {/* ─── OPEN SOURCE CTA ─── */}
      <section className="px-4 py-12 md:py-16 md:px-8 max-w-4xl mx-auto text-center">
        <div className="neo-card p-8 bg-white dark:bg-surface border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-5 items-center">
          <div className="p-3 bg-accent-pink/20 border-2 border-black rounded-full shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <GithubIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Open Source
            </h2>
            <p className="font-mono text-sm text-gray-500 mt-2 max-w-md mx-auto">
              BakaTracker is MIT-licensed. Self-host it, fork it, contribute — 
              your data stays yours.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://github.com/srivatsacool/BakaTracker"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-black hover:bg-gray-900 text-white border-3 border-black rounded-xl py-3 px-6 font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              <GithubIcon className="w-5 h-5" />
              <span>VIEW ON GITHUB</span>
            </a>
            <button
              onClick={handleExploreDemo}
              className="flex items-center gap-2 bg-accent-pink hover:bg-accent-pink/90 text-black border-3 border-black rounded-xl py-3 px-6 font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
            >
              <Zap className="w-5 h-5" />
              <span>TRY THE DEMO</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t-2 border-black/10 dark:border-white/10 px-4 py-6 text-center">
        <p className="font-mono text-xs text-gray-500">
          Built with{' '}
          <span className="text-accent-pink">♥</span> by{' '}
          <a href="https://github.com/srivatsacool" target="_blank" rel="noopener noreferrer" className="font-bold text-black dark:text-white hover:text-accent-pink transition">
            build.srivatsa
          </a>
          {' '}· v1.0.1 · MIT License
        </p>
      </footer>
    </div>
  );
};
