import React from 'react';
import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner — a slim designed state for the local-first reality.
 * Shown while the network is down: everything still works, nothing is lost.
 */
export const OfflineBanner: React.FC = () => (
  <div className="offline-banner" role="status">
    <WifiOff className="offline-banner-icon" aria-hidden="true" />
    <p>
      <strong>You're offline.</strong> Everything you do is saved on this device
      and will sync to your Worker when you're back online.
    </p>
  </div>
);
