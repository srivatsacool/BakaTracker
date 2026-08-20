import React from 'react';
import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner — a slim designed state for the local-first reality.
 * In the arcade voice: FREE PLAY — the machine keeps your credits.
 */
export const OfflineBanner: React.FC = () => (
  <div className="freeplay-banner" role="status">
    <WifiOff className="w-4 h-4 shrink-0" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
    <p className="m-0">
      <strong>Offline — your observations are safe.</strong> Everything stays on this
      machine and will sync to your Worker when you're back online.
    </p>
  </div>
);
