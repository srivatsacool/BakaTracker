import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, CloudOff, Moon, RefreshCw, Sun, Target, Zap, WifiOff } from 'lucide-react';
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
  const { stats, settings, habits, habitLogs, tasks, journal, theme, toggleTheme, syncStatus, syncError, syncWithSheets } = useStore();
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
  const isGuest = user?.provider === 'guest';
  const syncState = isGuest
    ? 'local'
    : isOffline
      ? 'offline'
      : syncStatus === 'loading'
        ? 'syncing'
        : syncStatus === 'error'
          ? 'error'
          : 'synced';

  const syncMeta = {
    local: { label: 'Local save', Icon: CloudOff, cls: 'is-local' },
    offline: { label: 'Cartridge held', Icon: WifiOff, cls: 'is-warning' },
    syncing: { label: 'Saving…', Icon: RefreshCw, cls: 'is-syncing' },
    error: { label: 'Save failed · Retry', Icon: CloudOff, cls: 'is-error' },
    synced: { label: 'Saved', Icon: Check, cls: 'is-success' },
  }[syncState];
  const { label, Icon, cls } = syncMeta;
  const syncTitle =
    syncState === 'error'
      ? `Save failed — ${syncError ?? 'unknown reason'}. Click to try again.`
      : syncState === 'offline'
        ? 'The save file stays on this cartridge — everything is held here and will sync to your Worker when you are back online.'
        : label;

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
        {syncState === 'error' ? (
          <button
            type="button"
            className={`context-status ${cls}`}
            onClick={() => syncWithSheets()}
            title={syncTitle}
            aria-label={syncTitle}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ) : (
          <span className={`context-status ${cls}`} title={syncTitle} aria-label={syncTitle}>
            <Icon className={syncState === 'syncing' ? 'animate-spin' : ''} aria-hidden="true" />
            <span>{label}</span>
          </span>
        )}
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
