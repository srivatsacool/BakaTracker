/*
 * BAKATRACKER — Bakasur Live Preview Types (Phase 12.5)
 */

export type PreviewMode = 'character' | 'cinematic' | 'dialogue'

export type ViewportPresetId = 'desktop' | 'laptop' | 'tablet' | 'portrait' | 'mobile' | 'mobile-small' | 'fit'

export interface ViewportPreset {
  id: ViewportPresetId
  name: string
  width: number | string
  height: number | string
  label: string
}

export const VIEWPORT_PRESETS: Record<ViewportPresetId, ViewportPreset> = {
  desktop: { id: 'desktop', name: 'Desktop', width: 1440, height: 900, label: '1440 × 900' },
  laptop: { id: 'laptop', name: 'Laptop', width: 1280, height: 720, label: '1280 × 720' },
  tablet: { id: 'tablet', name: 'Tablet', width: 1024, height: 768, label: '1024 × 768' },
  portrait: { id: 'portrait', name: 'Portrait', width: 768, height: 1024, label: '768 × 1024' },
  mobile: { id: 'mobile', name: 'Mobile', width: 390, height: 844, label: '390 × 844' },
  'mobile-small': { id: 'mobile-small', name: 'Small Mobile', width: 375, height: 812, label: '375 × 812' },
  fit: { id: 'fit', name: 'Fit Container', width: '100%', height: '100%', label: 'Fluid' }
}

export interface DebugOverlays {
  bounds: boolean
  actorCenter: boolean
  cameraCenter: boolean
  portalCenter: boolean
  dialogueBounds: boolean
  particleBounds: boolean
}

export interface ErrorInjectState {
  invalidPreset: boolean
  invalidScene: boolean
  invalidAnimation: boolean
  invalidExpression: boolean
  emptyDialogue: boolean
}
