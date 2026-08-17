import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, CloudOff, RefreshCw, Sun, Target, Zap, WifiOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../../features/auth';
import { calculateDailyScore, getTodayDateString } from '../../lib/utils';

interface ContextBarProps {
  isOffline: boolean;
  onToggleAssistant: () => void;
  assistantCollapsed: boolean;
}

/**
 * ContextBar — the observatory's status strip. Time, daily score,
 * XP counter, quests left, the save lamp, level, day/night, BakaSur.
 * Every number is a score readout in tabular mono.
 */
export const ContextBar: React.FC<ContextBarProps> = ({
  isOffline,
  onToggleAssistant,
  assistantCollapsed,
}) => {
  const { stats, settings, habits, habitLogs, tasks, journal, syncStatus, syncError, syncWithSheets } = useStore(useShallow(s => ({
    stats: s.stats,
    settings: s.settings,
    habits: s.habits,
    habitLogs: s.habitLogs,
    tasks: s.tasks,
    journal: s.journal,
    syncStatus: s.syncStatus,
    syncError: s.syncError,
    syncWithSheets: s.syncWithSheets,
  })));
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
    local: { label: 'Offline · local', Icon: CloudOff, cls: 'is-local' },
    offline: { label: 'Offline', Icon: WifiOff, cls: 'is-offline' },
    syncing: { label: 'Recording…', Icon: RefreshCw, cls: 'is-syncing' },
    error: { label: 'Out of order · Retry', Icon: CloudOff, cls: 'is-error' },
    synced: { label: 'Observing', Icon: Check, cls: 'is-saved' },
  }[syncState];
  const { label, Icon, cls } = syncMeta;
  const syncTitle =
    syncState === 'error'
      ? `Save failed — ${syncError ?? 'unknown reason'}. Click to try again.`
      : syncState === 'offline'
        ? 'The machine keeps your credits here — everything syncs to your Worker when you are back online.'
        : label;

  return (
    <header className="context-bar context-bar--floating" aria-label="Current life context">
      <div className="flex items-center gap-3">
        <Clock3 className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
        <div className="flex flex-col leading-tight">
          <strong className="score-readout text-sm">{timeLabel}</strong>
          <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>{dateLabel}</span>
        </div>
      </div>

      <div className="context-metrics" role="group" aria-label="Daily progress">
        <span className="context-metric"><Target className="metric-icon icon-gold" aria-hidden="true" /><b>{dailyScore}%</b> today</span>
        <span className="context-metric"><Zap className="metric-icon icon-cobalt" aria-hidden="true" /><b>{stats.xp}</b> / {settings.xp_per_level} XP</span>
        <span className="context-metric"><CalendarDays className="metric-icon" aria-hidden="true" /><b>{pendingQuests}</b> quests left</span>
      </div>

      <div className="flex items-center gap-2">
        {syncState === 'error' ? (
          <button type="button" className={`save-lamp ${cls}`} onClick={() => syncWithSheets()} title={syncTitle} aria-label={syncTitle}>
            <Icon className="w-3.5 h-3.5" aria-hidden="true" /><span>{label}</span>
          </button>
        ) : (
          <span className={`save-lamp ${cls}`} title={syncTitle} aria-label={syncTitle}>
            <Icon className={syncState === 'syncing' ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} aria-hidden="true" /><span>{label}</span>
          </span>
        )}
        {isGuest && <span className="chip chip--aurora">Demo</span>}
        <div className="flex items-center gap-2" aria-label={`Level ${stats.level}, ${Math.round(xpProgress)} percent to next level`}>
          <span className="score-readout text-xs" style={{ color: 'var(--arcade-gold)' }}>LVL {stats.level}</span>
          <span className="w-14 h-1.5 rounded-full overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139, 92, 246,0.2)' }}>
            <span className="block h-full transition-all duration-300" style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, var(--arcade-gold-deep), var(--arcade-gold))', boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)' }} />
          </span>
        </div>
        <span className="icon-button icon-button-small opacity-40 cursor-default" title="Dark mode (always)" aria-label="Dark mode always on">
          <Sun className="w-4 h-4" aria-hidden="true" />
        </span>
        <button type="button" className="assistant-trigger" onClick={onToggleAssistant} aria-expanded={!assistantCollapsed} aria-controls="bakasur-rail">
          <span className="assistant-trigger-dot" aria-hidden="true" /><span>BakaSur</span>
        </button>
      </div>
    </header>
  );
};
