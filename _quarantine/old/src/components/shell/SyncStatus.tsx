import React from 'react';
import { Check, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../features/auth';

interface SyncStatusProps {
  /** compact = LED-only, for the collapsed rail */
  compact?: boolean;
}

/**
 * SyncStatus — the save lamp. The backend's truth in one small LED.
 * Designed states for the op-log sync: saved / saving / offline / error /
 * local-only (guest). Error state is actionable: click retries the sync.
 */
export const SyncStatus: React.FC<SyncStatusProps> = ({ compact = false }) => {
  const { syncStatus, syncError, syncWithSheets } = useStore();
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
    const cls = `save-lamp save-lamp-local${compact ? ' save-lamp-compact' : ''}`;
    return (
      <span className={cls} title={title} aria-label={title}>
        <CloudOff aria-hidden="true" />
        {!compact && <span>Local save</span>}
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
    synced: { Icon: Check, label: 'Saved', cls: 'is-saved' },
    syncing: { Icon: RefreshCw, label: 'Saving…', cls: 'is-syncing' },
    offline: { Icon: WifiOff, label: 'Cartridge held — saved here', cls: 'is-offline' },
    error: { Icon: CloudOff, label: 'Save failed — retry', cls: 'is-error' },
  }[state];

  const { Icon, label, cls } = config;
  const title =
    state === 'error'
      ? `Save failed — ${syncError ?? 'unknown reason'}. Click to try again.`
      : state === 'offline'
        ? 'The save file stays on this cartridge — it will sync to your Worker when you are back online.'
        : label;
  const clsName = `save-lamp ${cls}${compact ? ' save-lamp-compact' : ''}`;

  if (state === 'error') {
    return (
      <button type="button" className={clsName} onClick={() => syncWithSheets()} title={title} aria-label={title}>
        <Icon aria-hidden="true" />
        {!compact && <span>{label}</span>}
      </button>
    );
  }

  return (
    <span className={clsName} title={title} aria-label={title}>
      <Icon className={state === 'syncing' ? 'animate-spin' : ''} aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </span>
  );
};
