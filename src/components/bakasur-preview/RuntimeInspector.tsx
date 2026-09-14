/*
 * BAKATRACKER — Runtime Inspector Component (Phase 12.5)
 * Displays real-time inspection metadata from bakasur-ui public API.
 */

import React from 'react'

export interface RuntimeInspectorProps {
  status: 'READY' | 'ERROR'
  mode: string
  intent: string
  resolvedIntent: string
  expression: string | null
  preset: string | null
  theme: string
  personality: string | null
  scene: string | null
  dialogue: string | null
  reducedMotion: {
    system: boolean
    override: boolean | null
    effective: boolean
  }
  viewport: string
  time: number
  className?: string
}

export const RuntimeInspector: React.FC<RuntimeInspectorProps> = ({
  status,
  mode,
  intent,
  resolvedIntent,
  expression,
  preset,
  theme,
  personality,
  scene,
  dialogue,
  reducedMotion,
  viewport,
  time,
  className = ''
}) => {
  return (
    <div className={`rounded-xl border border-purple-900/40 bg-zinc-950/80 p-4 backdrop-blur-md font-mono text-xs text-purple-200/90 shadow-2xl ${className}`}>
      <div className="flex items-center justify-between border-b border-purple-900/40 pb-2 mb-3">
        <span className="font-semibold text-purple-100 uppercase tracking-wider text-[11px]">Runtime Inspector</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status === 'READY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950 text-rose-400 border border-rose-800/60'}`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[11px]">
        <div>
          <span className="text-purple-400/60 block text-[10px]">Renderer</span>
          <span className="text-violet-300 font-medium">bakasur-ui</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Engine</span>
          <span className="text-violet-300 font-medium">Bloub</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Source</span>
          <span className="text-violet-300 font-medium">Public Export Boundary</span>
        </div>

        <div>
          <span className="text-purple-400/60 block text-[10px]">Active Mode</span>
          <span className="text-amber-300 capitalize">{mode}</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Intent (State)</span>
          <span className="text-purple-200">{intent || 'idle'}</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Resolved Intent</span>
          <span className="text-purple-200">{resolvedIntent || intent || 'idle'}</span>
        </div>

        <div>
          <span className="text-purple-400/60 block text-[10px]">Expression</span>
          <span className="text-purple-200">{expression ?? 'none (intent-driven)'}</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Preset</span>
          <span className="text-purple-200">{preset ?? 'custom / direct'}</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Theme</span>
          <span className="text-purple-200">{theme}</span>
        </div>

        <div>
          <span className="text-purple-400/60 block text-[10px]">Personality</span>
          <span className="text-purple-200">{personality ?? 'none'}</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Cinematic Scene</span>
          <span className="text-purple-200">{scene ?? 'N/A'}</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Dialogue Seq</span>
          <span className="text-purple-200">{dialogue ?? 'N/A'}</span>
        </div>

        <div>
          <span className="text-purple-400/60 block text-[10px]">Reduced Motion</span>
          <span className={reducedMotion.effective ? 'text-amber-400 font-semibold' : 'text-zinc-400'}>
            {reducedMotion.effective ? 'ON' : 'OFF'}
            {reducedMotion.override !== null && (
              <span className="text-[9px] opacity-70 ml-1">
                ({reducedMotion.override ? 'forced ON' : 'forced OFF'})
              </span>
            )}
          </span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Viewport</span>
          <span className="text-purple-200">{viewport}</span>
        </div>
        <div>
          <span className="text-purple-400/60 block text-[10px]">Time / Frame</span>
          <span className="text-purple-200">{time.toFixed(2)}s</span>
        </div>
      </div>
    </div>
  )
}
