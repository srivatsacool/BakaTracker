import React from 'react';
import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner — a slim designed state for the local-first reality.
 * In the cartridge voice: the save file is safe, it just cannot sync yet.
 */
export const OfflineBanner: React.FC = () => (
  <div className="offline-banner" role="status">
    <WifiOff className="offline-banner-icon" aria-hidden="true" />
    <p>
      <strong>The save file is safe.</strong> Everything stays on this cartridge
      and will sync to your Worker when you're back online.
    </p>
  </div>
);
