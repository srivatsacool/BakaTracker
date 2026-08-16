import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen — ATTRACT MODE: the cabinet boots before you can play.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Checking session...' }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--arcade-void)', position: 'relative', zIndex: 1 }}>
      <div className="flex flex-col items-center gap-4">
        {/* Cabinet boot spinner */}
        <div className="cabinet cabinet--attract px-5 py-4 flex flex-col items-center gap-3" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
          <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--arcade-gold)', borderTopColor: 'transparent', boxShadow: '0 0 16px rgba(111, 91, 216,0.25)' }} aria-hidden="true" />
          <div className="font-mono font-bold text-xs tracking-wider score-readout" style={{ color: 'var(--arcade-gold)' }}>
            {message}
          </div>
          <div className="attract-dots" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </div>
    </div>
  );
};
