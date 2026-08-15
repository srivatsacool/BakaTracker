import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Cloud, CloudOff, Moon, Sun, Target, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../features/auth';
import { calculateDailyScore, getTodayDateString } from '../../lib/utils';

interface ContextBarProps {
  isOffline: boolean;
  onToggleAssistant: () => void;
  assistantCollapsed: boolean;
}

export const ContextBar: React.FC<ContextBarProps> = ({
  isOffline,
  onToggleAssistant,
  assistantCollapsed,
}) => {
  const { stats, settings, habits, habitLogs, tasks, journal, theme, toggleTheme, syncStatus } = useStore();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const dailyScore = calculateDailyScore(getTodayDateString(), habits, habitLogs, tasks, journal);
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(now),
    [now],
  );
  const timeLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(now),
    [now],
  );
  const xpProgress = Math.min(100, Math.max(0, (stats.xp / Math.max(1, settings.xp_per_level)) * 100));
  const pendingQuests = tasks.filter(task => task.today && task.status !== 'done').length;
  const syncLabel = isOffline ? 'Offline' : syncStatus === 'loading' ? 'Syncing' : 'Local-first';
  const isGuest = user?.provider === 'guest';

  return (
    <header className="context-bar" aria-label="Current life context">
      <div className="context-time">
        <Clock3 className="context-icon context-icon-violet" aria-hidden="true" />
        <div>
          <strong>{timeLabel}</strong>
          <span>{dateLabel}</span>
        </div>
      </div>

      <div className="context-metrics" role="group" aria-label="Daily progress">
        <span className="context-chip">
          <Target className="context-chip-icon context-icon-cyan" aria-hidden="true" />
          <span><b>{dailyScore}%</b> today</span>
        </span>
        <span className="context-chip">
          <Zap className="context-chip-icon context-icon-gold" aria-hidden="true" />
          <span><b>{stats.xp}</b> / {settings.xp_per_level} XP</span>
        </span>
        <span className="context-chip context-chip-quiet">
          <CalendarDays className="context-chip-icon" aria-hidden="true" />
          <span><b>{pendingQuests}</b> quests left</span>
        </span>
      </div>

      <div className="context-actions">
        <span className={`context-status ${isOffline ? 'is-warning' : 'is-success'}`} title={syncLabel}>
          {isOffline ? <CloudOff aria-hidden="true" /> : <Cloud aria-hidden="true" />}
          <span>{syncLabel}</span>
        </span>
        {isGuest && <span className="context-demo">Demo</span>}
        <div className="context-xp" aria-label={`Level ${stats.level}, ${Math.round(xpProgress)} percent to next level`}>
          <span>LVL {stats.level}</span>
          <span className="context-xp-track"><span style={{ width: `${xpProgress}%` }} /></span>
        </div>
        <button
          type="button"
          className="icon-button icon-button-small"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'day' : 'night'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'day' : 'night'} mode`}
        >
          {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={`assistant-toggle ${assistantCollapsed ? '' : 'is-open'}`}
          onClick={onToggleAssistant}
          aria-expanded={!assistantCollapsed}
          aria-controls="bakasur-rail"
        >
          <span className="assistant-orb" aria-hidden="true"><span /></span>
          <span>BakaSur</span>
        </button>
      </div>
    </header>
  );
};
