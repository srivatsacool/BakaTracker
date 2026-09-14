/*
 * BAKATRACKER — Debug Overlays Component (Phase 12.5)
 * Non-intrusive SVG/DOM overlay markers for QA visual debugging.
 */

import React from 'react'
import type { DebugOverlays, PreviewMode } from './types'

export interface DebugOverlayProps {
  overlays: DebugOverlays
  width: number | string
  height: number | string
  mode: PreviewMode
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ overlays, width, height, mode }) => {
  const activeCount = Object.values(overlays).filter(Boolean).length
  if (activeCount === 0) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Container Bounds */}
      {overlays.bounds && (
        <div className="absolute inset-0 border-2 border-dashed border-cyan-500/70">
          <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-mono bg-cyan-950/80 text-cyan-300 rounded">
            Container {typeof width === 'number' ? `${width}×${height}` : 'Fluid'}
          </span>
        </div>
      )}

      {/* Actor Center Crosshair */}
      {overlays.actorCenter && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border border-violet-500/80 animate-ping opacity-25" />
          <div className="absolute w-8 h-px bg-violet-400" />
          <div className="absolute h-8 w-px bg-violet-400" />
          <span className="absolute top-3 left-3 text-[9px] font-mono bg-purple-950/90 text-violet-300 px-1 rounded whitespace-nowrap">
            Actor Center (0,0)
          </span>
        </div>
      )}

      {/* Camera Center */}
      {overlays.cameraCenter && mode === 'cinematic' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-24 h-24 border border-amber-400/60 rounded-sm" />
          <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-amber-950/90 text-amber-300 px-1 rounded">
            Camera Target
          </span>
        </div>
      )}

      {/* Portal Center */}
      {overlays.portalCenter && mode === 'cinematic' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-32 h-32 border border-emerald-400/60 rounded-full border-dashed" />
          <span className="absolute top-1 left-1 text-[9px] font-mono bg-emerald-950/90 text-emerald-300 px-1 rounded">
            Portal Field
          </span>
        </div>
      )}

      {/* Dialogue Bounds */}
      {overlays.dialogueBounds && (
        <div className="absolute bottom-4 left-4 right-4 h-20 border border-fuchsia-500/80 border-dotted pointer-events-none">
          <span className="absolute top-1 right-1 text-[9px] font-mono bg-fuchsia-950/90 text-fuchsia-300 px-1 rounded">
            Dialogue Zone
          </span>
        </div>
      )}

      {/* Particle Bounds */}
      {overlays.particleBounds && mode === 'cinematic' && (
        <div className="absolute inset-4 border border-indigo-500/40 pointer-events-none">
          <span className="absolute bottom-1 left-1 text-[9px] font-mono bg-indigo-950/90 text-indigo-300 px-1 rounded">
            Particle Emitter Boundary
          </span>
        </div>
      )}
    </div>
  )
}
