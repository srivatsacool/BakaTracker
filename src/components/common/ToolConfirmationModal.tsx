import React, { useState } from 'react';
import { useConfirmation } from '../../features/tools/useConfirmation';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { AlertTriangle, ShieldAlert, X, Check, Code } from 'lucide-react';

export const ToolConfirmationModal: React.FC = () => {
  const { pendingRequest, approve, deny } = useConfirmation();
  const [showDetails, setShowDetails] = useState(false);

  const isOpen = Boolean(pendingRequest);
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, { onEscape: deny });

  if (!isOpen || !pendingRequest) return null;

  const isCritical = pendingRequest.dangerLevel === 'critical';

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-confirmation-title"
        className="cabinet cabinet--playing max-w-md w-full flex flex-col gap-4 p-6 rounded-xl border border-solid"
        style={{
          borderColor: isCritical ? '#ef4444' : 'var(--arcade-gold)',
          background: 'linear-gradient(180deg, rgba(30,25,48,0.98), rgba(15,12,25,0.98))',
          boxShadow: isCritical ? '0 0 30px rgba(239,68,68,0.3)' : '0 0 30px rgba(245,158,11,0.25)',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-solid border-white/10">
          <div className="flex items-center gap-2">
            {isCritical ? (
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" aria-hidden="true" />
            )}
            <h3
              id="tool-confirmation-title"
              className="text-base font-bold m-0"
              style={{ color: isCritical ? '#ef4444' : 'var(--arcade-gold)' }}
            >
              {pendingRequest.title}
            </h3>
          </div>
          <button
            onClick={deny}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Decline action"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Message */}
        <div className="text-sm leading-relaxed text-slate-200">
          <p className="m-0 whitespace-pre-wrap">{pendingRequest.message}</p>
        </div>

        {/* Parameters Preview Toggle */}
        {pendingRequest.parameters && Object.keys(pendingRequest.parameters).length > 0 && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors self-start"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showDetails ? 'Hide' : 'Inspect'} action parameters</span>
            </button>
            {showDetails && (
              <pre className="mt-1 p-3 rounded bg-black/50 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-36 border border-white/10">
                {JSON.stringify(pendingRequest.parameters, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-solid border-white/10">
          <button
            type="button"
            onClick={deny}
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={approve}
            className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md ${
              isCritical
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/50'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Approve Action</span>
          </button>
        </div>
      </div>
    </div>
  );
};
