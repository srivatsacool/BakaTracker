import React from 'react';
import { WifiOff } from 'lucide-react';
import { PixelBadge } from '../ui';

/**
 * OfflineBanner — a slim designed state for the local-first reality.
 * In the arcade voice: FREE PLAY — the machine keeps your credits.
 */
export const OfflineBanner: React.FC = () => (
  <div className="freeplay-banner" role="status">
    <div className="flex items-center gap-2">
      <WifiOff className="w-4 h-4 shrink-0" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
      <PixelBadge tone="warning">FREE PLAY</PixelBadge>
    </div>
    <p className="m-0">
      <strong>Offline — your observations are safe.</strong> Everything stays on this
      machine and will sync to your Worker when you're back online.
    </p>
  </div>
);
