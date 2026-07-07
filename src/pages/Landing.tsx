import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { Flame, BookOpen } from 'lucide-react';

const GithubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const Landing: React.FC = () => {
  const { isAuthenticated, login, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/journey', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full border-4 border-black bg-white dark:bg-surface p-8 rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black dark:text-text-primary flex flex-col gap-6 items-center">
        
        {/* Logo and title */}
        <div className="flex flex-col items-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="BakaTracker Logo" 
            className="w-20 h-20 border-3 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] object-cover" 
          />
          <h1 className="text-3xl font-black uppercase tracking-tight text-center mt-2 leading-none">
            BakaTracker
          </h1>
          <span className="font-mono text-xs text-gray-500 uppercase tracking-widest border border-black/10 dark:border-white/10 px-2 py-0.5 rounded bg-gray-50 dark:bg-black/20">
            Life OS & RPG Planner
          </span>
        </div>

        {/* Description */}
        <p className="text-center font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          A minimalist, self-hostable Life RPG planner powered by Google Sheets. 
          Gamify your habits, tasks, and daily journal highlights.
        </p>

        {/* Auth action */}
        <div className="w-full mt-2">
          <button
            onClick={() => login()}
            className="w-full flex items-center justify-center gap-2 bg-accent-pink hover:bg-accent-pink/90 text-black border-3 border-black rounded-lg py-3 font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] cursor-pointer"
          >
            <Flame className="w-5 h-5 shrink-0" />
            <span>CONTINUE WITH AUTH0</span>
          </button>
        </div>

        {/* Minimal links */}
        <div className="flex gap-4 border-t-2 border-black/10 dark:border-white/10 pt-4 w-full justify-center">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono font-bold text-xs hover:text-accent-pink transition"
          >
            <GithubIcon className="w-4 h-4" />
            <span>GITHUB</span>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono font-bold text-xs hover:text-accent-pink transition"
          >
            <BookOpen className="w-4 h-4" />
            <span>DOCS</span>
          </a>
        </div>

        {/* Footer */}
        <div className="text-[10px] font-mono text-gray-400 mt-2">
          v1.0.1 • Self-Hosted Edition
        </div>

      </div>
    </div>
  );
};
