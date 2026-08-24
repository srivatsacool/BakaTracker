/**
 * HUD status (sidebar): the same sync-state grammar as the ContextBar's
 * save lamp, condensed to a dot + short label. Extracted verbatim from
 * Layout.tsx — precedence: guest > offline > syncing > error > synced.
 */
export type HudStatus = { label: string; cls: string };

export function getHudStatus(opts: { isGuest: boolean; isOffline: boolean; syncStatus: string }): HudStatus {
  const syncState = opts.isGuest
    ? 'local'
    : opts.isOffline
      ? 'offline'
      : opts.syncStatus === 'loading'
        ? 'syncing'
        : opts.syncStatus === 'error'
          ? 'error'
          : 'synced';
  return {
    local: { label: 'LOCAL', cls: 'is-local' },
    offline: { label: 'OFFLINE', cls: 'is-offline' },
    syncing: { label: 'RECORDING', cls: 'is-syncing' },
    error: { label: 'OUT OF ORDER', cls: 'is-error' },
    synced: { label: 'OBSERVING', cls: 'is-synced' },
  }[syncState];
}
