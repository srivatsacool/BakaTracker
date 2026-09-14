/*
 * BAKATRACKER — Error Testing Panel Component (Phase 12.5)
 * Dev-only QA buttons to trigger edge-case error fallbacks cleanly.
 */

import React from 'react'
import type { ErrorInjectState } from './types'

export interface ErrorTestingPanelProps {
  errors: ErrorInjectState
  onToggleError: (key: keyof ErrorInjectState) => void
  onReset: () => void
}

export const ErrorTestingPanel: React.FC<ErrorTestingPanelProps> = ({ errors, onToggleError, onReset }) => {
  const hasActiveErrors = Object.values(errors).some(Boolean)

  return (
    <div className="rounded-xl border border-rose-900/40 bg-zinc-950/80 p-3 text-xs text-rose-200/90 shadow-lg">
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-rose-900/30">
        <span className="font-semibold text-rose-300 text-[11px] tracking-wide">Error Fallback Testing (Dev-only)</span>
        {hasActiveErrors && (
          <button
            type="button"
            onClick={onReset}
            className="px-2 py-0.5 text-[10px] bg-rose-900/50 hover:bg-rose-800 text-rose-200 rounded border border-rose-700/50 transition-colors"
          >
            Reset All
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggleError('invalidPreset')}
          className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
            errors.invalidPreset
              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60'
          }`}
        >
          Invalid Preset
        </button>

        <button
          type="button"
          onClick={() => onToggleError('invalidScene')}
          className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
            errors.invalidScene
              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60'
          }`}
        >
          Invalid Scene
        </button>

        <button
          type="button"
          onClick={() => onToggleError('invalidAnimation')}
          className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
            errors.invalidAnimation
              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60'
          }`}
        >
          Invalid Animation
        </button>

        <button
          type="button"
          onClick={() => onToggleError('invalidExpression')}
          className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
            errors.invalidExpression
              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60'
          }`}
        >
          Invalid Expression
        </button>

        <button
          type="button"
          onClick={() => onToggleError('emptyDialogue')}
          className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
            errors.emptyDialogue
              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60'
          }`}
        >
          Empty Dialogue
        </button>
      </div>
    </div>
  )
}
