import React from 'react';
import { Check, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../features/auth';

interface SyncStatusProps {
  /** compact = icon-only, for the collapsed rail */
  compact?: boolean;
}

/**
 * SyncStatus — the backend, made visible.
 * Designed states for the op-log sync: synced / syncing / offline / error /
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
    const title = 'Local-only mode — sign in to sync your data';
    const cls = `sync-status sync-status-local${compact ? ' sync-status-compact' : ''}`;
    return (
      <span className={cls} title={title} aria-label={title}>
        <CloudOff aria-hidden="true" />
        {!compact && <span>Local only</span>}
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
    synced: { Icon: Check, label: 'Synced', cls: 'is-synced' },
    syncing: { Icon: RefreshCw, label: 'Syncing…', cls: 'is-syncing' },
    offline: { Icon: WifiOff, label: 'Offline — saved locally', cls: 'is-offline' },
    error: { Icon: CloudOff, label: 'Sync failed', cls: 'is-error' },
  }[state];

  const { Icon, label, cls } = config;
  const title =
    state === 'error'
      ? `Sync failed — ${syncError ?? 'unknown error'}. Click to retry.`
      : state === 'offline'
        ? 'You are offline — changes are saved locally and will sync when you are back online.'
        : label;
  const clsName = `sync-status ${cls}${compact ? ' sync-status-compact' : ''}`;

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
