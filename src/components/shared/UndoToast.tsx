import React, { useState, useEffect, useCallback } from 'react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  duration?: number;
  onDone?: () => void;
}

/**
 * UndoToast — a branded 5-second undo bar for destructive actions.
 * Fits the save-file metaphor: "removing — tap Undo to keep" with countdown.
 */
export const UndoToast: React.FC<UndoToastProps> = ({ message, onUndo, duration = 5000, onDone }) => {
  const [visible, setVisible] = useState(true);
  const [remaining, setRemaining] = useState(Math.ceil(duration / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(interval);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [duration, onDone]);

  const handleUndo = useCallback(() => {
    onUndo();
    setVisible(false);
    onDone?.();
  }, [onUndo, onDone]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-lg animate-fade-in"
      style={{
        background: 'rgba(20, 16, 31, 0.95)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
      }}
      role="alert"
      aria-live="polite"
    >
      <span className="font-mono text-xs" style={{ color: 'var(--arcade-paper-dim)' }}>
        {message} <span style={{ color: 'var(--arcade-paper-muted)' }}>({remaining}s)</span>
      </span>
      <button
        type="button"
        onClick={handleUndo}
        className="font-mono text-xs font-bold px-3 py-1 rounded cursor-pointer transition hover:scale-105"
        style={{
          color: 'var(--arcade-gold)',
          border: '1px solid rgba(232, 180, 90, 0.3)',
          background: 'rgba(232, 180, 90, 0.1)',
        }}
      >
        Undo
      </button>
    </div>
  );
};
