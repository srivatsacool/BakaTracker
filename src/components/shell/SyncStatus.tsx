import React from 'react';
import { Check, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../../features/auth';

interface SyncStatusProps {
  /** compact = LED-only, for the collapsed rail */
  compact?: boolean;
}

/**
 * SyncStatus — the save lamp. The backend's truth in one LED, in the
 * observatory grammar: a status light. OBSERVING / RECORDING… / OFFLINE /
 * OUT OF ORDER
 * OUT OF ORDER. Error state is actionable: click retries the sync.
 */
export const SyncStatus: React.FC<SyncStatusProps> = ({ compact = false }) => {
  const { syncStatus, syncError, pushSync } = useStore(useShallow(s => ({
    syncStatus: s.syncStatus,
    syncError: s.syncError,
    pushSync: s.pushSync,
  })));
  const { user } = useAuth();
  const [isOffline, setIsOffline] = React.useState(() => !navigator.onLine);

  React.useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const isGuest = user?.provider === 'guest';

  if (isGuest) {
    const title = 'Local save only — sign in to carry your save file across devices';
    return (
      <span className={`save-lamp is-local${compact ? ' save-lamp-compact' : ''}`} title={title} aria-label={title}>
        <span className="lamp-dot" aria-hidden="true" />
        {!compact && <span>Offline · local</span>}
      </span>
    );
  }

  const state: 'synced' | 'syncing' | 'offline' | 'error' = isOffline
    ? 'offline'
    : syncStatus === 'loading'
      ? 'syncing'
      : syncStatus === 'error'
        ? 'error'
        : 'synced';

  const config = {
    synced: { Icon: Check, label: 'Observing', cls: 'is-saved' },
    syncing: { Icon: RefreshCw, label: 'Recording…', cls: 'is-syncing' },
    offline: { Icon: WifiOff, label: 'Offline — saved here', cls: 'is-offline' },
    error: { Icon: CloudOff, label: 'Out of order — retry', cls: 'is-error' },
  }[state];

  const { Icon, label, cls } = config;
  const title =
    state === 'error'
      ? `Save failed — ${syncError ?? 'unknown reason'}. Click to try again.`
      : state === 'offline'
        ? 'The machine keeps your credits locally — they will sync to your Worker when you are back online.'
        : label;
  const clsName = `save-lamp ${cls}${compact ? ' save-lamp-compact' : ''}`;

  if (state === 'error') {
    return (
      <button type="button" className={clsName} onClick={() => pushSync()} title={title} aria-label={title}>
        <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
        {!compact && <span>{label}</span>}
      </button>
    );
  }

  return (
    <span className={clsName} title={title} aria-label={title}>
      {compact ? (
        <span className="lamp-dot" aria-hidden="true" />
      ) : (
        <>
          <Icon className={state === 'syncing' ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </span>
  );
};
