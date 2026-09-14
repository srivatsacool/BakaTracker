/*
 * BAKATRACKER — Bakasur Live Preview & Cinematic Showcase (Phase 12.5)
 *
 * Polished, stage-dominant cinematic companion showcase for the production
 * Bakasur runtime. Uses REAL production components & APIs via bakasur-ui boundary.
 * NO mock rendering, NO duplicate geometry, NO duplicate engine.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  listBakasurPresets,
  getBakasurPreset,
  resolvePresetDef,
  BAKASUR_THEME_IDS,
  listScenes,
  listDialogueSequences,
  getDialogueSequence,
  type BakasurIntent
} from 'bakasur-ui'

import { BakasurBotAdapter } from '../components/bakasur/BakasurBotAdapter'
import { FlamehornCharacter, type FlamehornMood } from '../components/bakasur/FlamehornCharacter'
import { BakasurSceneAdapter } from '../components/bakasur/BakasurSceneAdapter'
import { CinematicDialoguePlate } from '../components/bakasur/CinematicDialoguePlate'
import { DebugOverlay } from '../components/bakasur-preview/DebugOverlay'
import { RuntimeInspector } from '../components/bakasur-preview/RuntimeInspector'
import { ErrorTestingPanel } from '../components/bakasur-preview/ErrorTestingPanel'
import {
  VIEWPORT_PRESETS,
  type DebugOverlays,
  type ErrorInjectState,
  type PreviewMode,
  type ViewportPresetId
} from '../components/bakasur-preview/types'

// All 18 Bakasur Expressions
const ALL_EXPRESSIONS = [
  'neutral', 'attentive', 'curious', 'suspicious', 'confused',
  'surprised', 'excited', 'happy', 'laughing', 'annoyed',
  'angry', 'sad', 'scared', 'proud', 'unimpressed',
  'sleepy', 'mischievous', 'deadpan'
] as const

// All 15 Bakasur Animation Intents + swirl
const ALL_INTENTS: BakasurIntent[] = [
  'idle', 'thinking', 'wink', 'wide', 'alert',
  'notify', 'exclaim', 'sleep', 'egg', 'hexagon',
  'play', 'orbit', 'burst', 'comet', 'swirl'
]

// All 8 Bakasur Personalities
const ALL_PERSONALITIES = [
  'calm', 'curious', 'suspicious', 'chaotic',
  'smug', 'sleepy', 'excited', 'unimpressed'
] as const

// Mapping personalities to default preset configs
const PERSONALITY_MAP: Record<string, { animation: BakasurIntent; expression: string; theme: string }> = {
  calm: { animation: 'idle', expression: 'neutral', theme: 'void-violet' },
  curious: { animation: 'thinking', expression: 'curious', theme: 'moonlit' },
  suspicious: { animation: 'idle', expression: 'suspicious', theme: 'void-violet' },
  chaotic: { animation: 'play', expression: 'excited', theme: 'ember-violet' },
  smug: { animation: 'egg', expression: 'mischievous', theme: 'moonlit' },
  sleepy: { animation: 'sleep', expression: 'sleepy', theme: 'spectral' },
  excited: { animation: 'orbit', expression: 'excited', theme: 'ember-violet' },
  unimpressed: { animation: 'idle', expression: 'unimpressed', theme: 'spectral' }
}

export const BakasurPreview: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // 1. Mode State
  const initialMode = (searchParams.get('mode') as PreviewMode) || 'flamehorn'
  const [mode, setMode] = useState<PreviewMode>(
    ['flamehorn', 'character', 'cinematic', 'dialogue'].includes(initialMode) ? initialMode : 'flamehorn'
  )

  // Flamehorn Studio Controls State
  const [flamehornMood, setFlamehornMood] = useState<FlamehornMood>('idle')
  const [flamehornColor, setFlamehornColor] = useState<string>('#8B5CF6')
  const [flamehornScale, setFlamehornScale] = useState<number>(320)
  const [tactileTexture, setTactileTexture] = useState<number>(48)
  const [coreDepth, setCoreDepth] = useState<number>(100)
  const [specularSheen, setSpecularSheen] = useState<number>(61)
  const [eyeGlow, setEyeGlow] = useState<number>(85)
  const [socketDepth, setSocketDepth] = useState<number>(85)

  // 2. Character Controls State
  const initialAnimation = (searchParams.get('animation') as BakasurIntent) || 'idle'
  const [state, setState] = useState<BakasurIntent>(
    ALL_INTENTS.includes(initialAnimation) ? initialAnimation : 'idle'
  )

  const initialExpression = searchParams.get('expression') || null
  const [expression, setExpression] = useState<string | null>(
    initialExpression && ALL_EXPRESSIONS.includes(initialExpression as any) ? initialExpression : null
  )

  const initialTheme = searchParams.get('theme') || 'void-violet'
  const [theme, setTheme] = useState<string>(
    BAKASUR_THEME_IDS.includes(initialTheme as any) ? initialTheme : 'void-violet'
  )

  const initialPreset = searchParams.get('preset') || null
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialPreset)

  const [personality, setPersonality] = useState<string | null>(null)
  const [botSize, setBotSize] = useState<number>(280) // Visually prominent default
  const [followPointer, setFollowPointer] = useState<boolean>(true)
  const [isFrozen, setIsFrozen] = useState<boolean>(false)

  // 3. Cinematic Controls State
  const initialScene = searchParams.get('scene') || 'bakasur-awakening'
  const [sceneId, setSceneId] = useState<string>(initialScene)
  const [sceneTime, setSceneTime] = useState<number>(0)
  const [isPlayingScene, setIsPlayingScene] = useState<boolean>(true)

  // 4. Dialogue Controls State
  const [dialogueId, setDialogueId] = useState<string>('awakening-intro')
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0)
  const [customDialogueText, setCustomDialogueText] = useState<string | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)

  // 5. Reduced Motion QA Toggle State
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  })
  const [reducedMotionOverride, setReducedMotionOverride] = useState<boolean | null>(null)
  const effectiveReducedMotion = reducedMotionOverride ?? systemReducedMotion

  // 6. Viewport Preset State (Default: Fluid Container)
  const [viewportPresetId, setViewportPresetId] = useState<ViewportPresetId>('fit')
  const currentViewport = VIEWPORT_PRESETS[viewportPresetId]

  // 7. UI Presentation & Control Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false) // Default CLOSED
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false) // Presentation mode
  const [expandedSection, setExpandedSection] = useState<string | null>('presets')

  // 8. Debug Overlays State (Default: OFF)
  const [debugOverlays, setDebugOverlays] = useState<DebugOverlays>({
    bounds: false,
    actorCenter: false,
    cameraCenter: false,
    portalCenter: false,
    dialogueBounds: false,
    particleBounds: false
  })

  // 9. Error Testing State (Default: OFF)
  const [errors, setErrors] = useState<ErrorInjectState>({
    invalidPreset: false,
    invalidScene: false,
    invalidAnimation: false,
    invalidExpression: false,
    emptyDialogue: false
  })

  // Catalogues from bakasur-ui
  const allPresets = useMemo(() => listBakasurPresets(), [])
  const allScenes = useMemo(() => listScenes(), [])
  const allDialogues = useMemo(() => listDialogueSequences(), [])

  // Sync System Reduced Motion Listener
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Sync URL Query Parameters
  useEffect(() => {
    const params: Record<string, string> = { mode }
    if (selectedPresetId) params.preset = selectedPresetId
    if (sceneId) params.scene = sceneId
    if (expression) params.expression = expression
    if (state !== 'idle') params.animation = state
    if (theme !== 'void-violet') params.theme = theme
    setSearchParams(params, { replace: true })
  }, [mode, selectedPresetId, sceneId, expression, state, theme, setSearchParams])

  // Timer loop for Cinematic Scene scrubbing when playing
  useEffect(() => {
    if (mode !== 'cinematic' || !isPlayingScene || effectiveReducedMotion) return
    let rafId: number
    let lastMs = performance.now()

    const tick = (now: number) => {
      const dt = (now - lastMs) / 1000
      lastMs = now
      setSceneTime((prev) => (prev + dt) % 10)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [mode, isPlayingScene, effectiveReducedMotion])

  // Resolved Preset computation
  const activePreset = useMemo(() => {
    if (errors.invalidPreset) return getBakasurPreset('non-existent-preset-999')
    if (selectedPresetId) return getBakasurPreset(selectedPresetId)
    return undefined
  }, [selectedPresetId, errors.invalidPreset])

  const resolvedPreset = useMemo(() => {
    if (activePreset) {
      return resolvePresetDef(activePreset, {
        expression: errors.invalidExpression ? 'invalid-expr' : (expression ?? undefined),
        theme: theme
      })
    }
    return undefined
  }, [activePreset, expression, theme, errors.invalidExpression])

  // Effective State / Expression / Theme with error injection handling
  const effectiveState = errors.invalidAnimation ? ('invalid-state' as BakasurIntent) : state
  const effectiveExpression = errors.invalidExpression ? 'invalid-expr-xyz' : expression
  const effectiveSceneId = errors.invalidScene ? 'invalid-scene-123' : sceneId

  // Selected Dialogue Sequence
  const activeDialogueSeq = useMemo(() => {
    if (errors.emptyDialogue) return { id: 'empty-seq', lines: [] } as any
    return getDialogueSequence(dialogueId) ?? allDialogues[0]
  }, [dialogueId, allDialogues, errors.emptyDialogue])

  const currentLine = activeDialogueSeq?.lines?.[currentLineIndex]

  // Handlers for Preset selection
  const handleSelectPreset = (pId: string) => {
    setSelectedPresetId(pId)
    const def = getBakasurPreset(pId)
    if (def) {
      if (def.animation) setState(def.animation)
      if (def.expression) setExpression(def.expression)
      if (def.theme) setTheme(def.theme)
    }
  }

  // Handlers for Personality selection
  const handleSelectPersonality = (pId: string) => {
    setPersonality(pId)
    const p = PERSONALITY_MAP[pId]
    if (p) {
      setState(p.animation)
      setExpression(p.expression)
      setTheme(p.theme)
    }
  }

  // Handlers for Error Testing
  const handleToggleError = (key: keyof ErrorInjectState) => {
    setErrors((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleResetErrors = () => {
    setErrors({
      invalidPreset: false,
      invalidScene: false,
      invalidAnimation: false,
      invalidExpression: false,
      emptyDialogue: false
    })
  }

  return (
    <div className="relative w-screen h-screen bg-[#05040a] text-purple-100 flex flex-col select-none font-sans overflow-hidden">
      {/* ────────────────────────────────────────────────────────── FLOATING HEADER */}
      {!isFullscreen && (
        <header className="absolute top-0 left-0 right-0 z-30 px-6 py-4 flex items-center justify-between pointer-events-none">
          {/* LOGO & TITLE */}
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-violet-500/20 shadow-2xl pointer-events-auto">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-900 flex items-center justify-center shadow-lg shadow-violet-950/60 border border-violet-400/40">
              <span className="text-[11px] font-bold text-violet-100">B</span>
            </div>
            <div>
              <span className="text-xs font-semibold tracking-widest text-violet-100 uppercase">
                BAKASUR
              </span>
              <span className="text-[10px] text-purple-400/70 block font-mono">
                cinematic companion showcase
              </span>
            </div>
          </div>

          {/* MODE SELECTOR */}
          <div className="flex items-center bg-black/40 backdrop-blur-md p-1 rounded-full border border-violet-500/20 shadow-2xl pointer-events-auto">
            <button
              type="button"
              onClick={() => setMode('flamehorn')}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                mode === 'flamehorn'
                  ? 'bg-violet-950 text-violet-100 border border-violet-600/60 shadow-lg shadow-violet-950/80 font-bold'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Flamehorn ✨
            </button>
            <button
              type="button"
              onClick={() => setMode('character')}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                mode === 'character'
                  ? 'bg-violet-950 text-violet-100 border border-violet-600/60 shadow-lg shadow-violet-950/80'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Character
            </button>
            <button
              type="button"
              onClick={() => setMode('cinematic')}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                mode === 'cinematic'
                  ? 'bg-violet-950 text-violet-100 border border-violet-600/60 shadow-lg shadow-violet-950/80'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Cinematic
            </button>
            <button
              type="button"
              onClick={() => setMode('dialogue')}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                mode === 'dialogue'
                  ? 'bg-violet-950 text-violet-100 border border-violet-600/60 shadow-lg shadow-violet-950/80'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Dialogue
            </button>
          </div>

          {/* HEADER TOOLBAR BUTTONS */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Reduced Motion Toggle */}
            <button
              type="button"
              title="Toggle Reduced Motion"
              onClick={() => {
                if (reducedMotionOverride === null) setReducedMotionOverride(true)
                else if (reducedMotionOverride === true) setReducedMotionOverride(false)
                else setReducedMotionOverride(null)
              }}
              className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-all bg-black/40 backdrop-blur-md ${
                effectiveReducedMotion
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                  : 'text-purple-300 border-violet-500/20 hover:border-violet-500/40'
              }`}
            >
              RM: {effectiveReducedMotion ? 'ON' : 'OFF'}
            </button>

            {/* Presentation Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-violet-200 bg-black/40 backdrop-blur-md hover:bg-violet-950/60 rounded-full border border-violet-500/20 hover:border-violet-500/40 transition-all shadow-xl"
            >
              Presentation Mode
            </button>

            {/* Open Control Drawer */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen((d) => !d)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all flex items-center gap-1.5 shadow-xl bg-black/40 backdrop-blur-md ${
                isDrawerOpen
                  ? 'bg-violet-900 text-violet-100 border-violet-500'
                  : 'text-purple-200 border-violet-500/20 hover:border-violet-500/40'
              }`}
            >
              <span>Controls</span>
              <span className="text-[10px]">⚙</span>
            </button>
          </div>
        </header>
      )}

      {/* ────────────────────────────────────────────────────────── STAGE STAGE (DOMINANT VIEWPORT) */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* Ambient Dark Void Background Atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.14)_0%,rgba(11,8,20,0.6)_50%,rgba(5,4,10,1)_100%)] pointer-events-none" />

        {/* Viewport Preset Frame Container */}
        <div
          className="relative flex items-center justify-center w-full h-full transition-all duration-300 overflow-hidden"
          style={{
            maxWidth: currentViewport.width,
            maxHeight: currentViewport.height
          }}
        >
          {/* Debug Overlays Layer */}
          <DebugOverlay
            overlays={debugOverlays}
            width={currentViewport.width}
            height={currentViewport.height}
            mode={mode}
          />

          {/* ────────────────────────────────────────────── MODE 0: CANONICAL FLAMEHORN SHOWCASE */}
          {mode === 'flamehorn' && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto relative z-10">
              <div
                className="w-full max-w-[800px] flex flex-col items-center gap-6 rounded-[20px] p-6 border my-auto"
                style={{
                  background: 'rgba(26, 22, 37, 0.45)',
                  borderColor: 'rgba(139, 92, 246, 0.2)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(124, 58, 237, 0.1)'
                }}
              >
                {/* Header Section */}
                <div className="text-center">
                  <span
                    className="inline-block text-[0.7rem] font-semibold tracking-[0.08em] uppercase px-3 py-1 rounded-full mb-2 border"
                    style={{
                      color: '#c4b5fd',
                      background: 'rgba(139, 92, 246, 0.15)',
                      borderColor: 'rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    Canonical BakaTracker Geometry
                  </span>
                  <h1
                    className="text-2xl md:text-3xl font-bold tracking-tight mb-1"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Bakasur — Flamehorn
                  </h1>
                  <p className="text-[#9490a6] text-xs md:text-sm max-w-[500px] mx-auto">
                    Direction A: Mild organic pebble with dual curved horns and central sculptural candle-flame crest. Move cursor over the box to interact with gaze.
                  </p>
                </div>

                {/* Viewport */}
                <div
                  className="relative w-full max-w-[380px] h-[320px] flex items-center justify-center overflow-hidden border rounded-2xl cursor-crosshair"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(30, 24, 46, 0.8) 0%, rgba(6, 7, 20, 0.95) 75%)',
                    borderColor: 'rgba(139, 92, 246, 0.25)',
                    boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.8)'
                  }}
                >
                  <div
                    className="absolute w-[280px] h-[280px] rounded-full border border-dashed pointer-events-none"
                    style={{
                      borderColor: 'rgba(139, 92, 246, 0.18)',
                      animation: 'spin 60s linear infinite'
                    }}
                  />
                  <FlamehornCharacter
                    state={flamehornMood}
                    size={flamehornScale}
                    moodColor={flamehornColor}
                    tactileTexture={tactileTexture}
                    coreDepth={coreDepth}
                    specularSheen={specularSheen}
                    eyeGlow={eyeGlow}
                    socketDepth={socketDepth}
                    followPointer={followPointer && !effectiveReducedMotion}
                    interactive={true}
                  />
                </div>

                {/* Quick Controls Bar */}
                <div className="flex flex-col gap-3.5 w-full">
                  {/* Emotional State */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#a78bfa] uppercase tracking-wider">
                      Emotional State
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(['idle', 'thinking', 'celebrate', 'alert', 'sleep', 'happy'] as FlamehornMood[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFlamehornMood(m)}
                          className={`px-3 py-1 text-xs rounded-lg border transition-all cursor-pointer capitalize ${
                            flamehornMood === m
                              ? 'bg-[#7c3aed] text-white border-[#a78bfa] shadow-[0_0_12px_rgba(124,58,237,0.5)]'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-purple-900/30'
                          }`}
                        >
                          {m === 'celebrate' ? 'Celebrate (Wink)' : m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mood Keylight */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#a78bfa] uppercase tracking-wider">
                      Mood Keylight
                    </span>
                    <div className="flex items-center gap-2">
                      {['#8B5CF6', '#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ffffff'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFlamehornColor(c)}
                          className={`w-4 h-4 rounded-full cursor-pointer transition-transform border-2 ${
                            flamehornColor.toLowerCase() === c.toLowerCase()
                              ? 'border-white scale-125'
                              : 'border-transparent hover:scale-115'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Render Scale */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#a78bfa] uppercase tracking-wider">
                      Render Scale
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { size: 48, label: '48px (Dock)' },
                        { size: 96, label: '96px (Orb)' },
                        { size: 192, label: '192px (Rail)' },
                        { size: 320, label: '320px (Hero)' }
                      ].map((sz) => (
                        <button
                          key={sz.size}
                          type="button"
                          onClick={() => setFlamehornScale(sz.size)}
                          className={`px-3 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                            flamehornScale === sz.size
                              ? 'bg-[#7c3aed] text-white border-[#a78bfa] shadow-[0_0_12px_rgba(124,58,237,0.5)]'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-purple-900/30'
                          }`}
                        >
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-white/5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-mono text-[11px]">Tactile Texture</span>
                      <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={tactileTexture}
                          onChange={(e) => setTactileTexture(Number(e.target.value))}
                          className="w-full h-1 bg-purple-950 rounded appearance-none cursor-pointer accent-[#8b5cf6]"
                        />
                        <span className="font-mono text-[10px] text-purple-300 w-7 text-right">{tactileTexture}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-mono text-[11px]">3D Core Depth</span>
                      <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={coreDepth}
                          onChange={(e) => setCoreDepth(Number(e.target.value))}
                          className="w-full h-1 bg-purple-950 rounded appearance-none cursor-pointer accent-[#8b5cf6]"
                        />
                        <span className="font-mono text-[10px] text-purple-300 w-7 text-right">{coreDepth}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-mono text-[11px]">Specular Sheen</span>
                      <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={specularSheen}
                          onChange={(e) => setSpecularSheen(Number(e.target.value))}
                          className="w-full h-1 bg-purple-950 rounded appearance-none cursor-pointer accent-[#8b5cf6]"
                        />
                        <span className="font-mono text-[10px] text-purple-300 w-7 text-right">{specularSheen}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-mono text-[11px]">Eye Glow Radiance</span>
                      <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={eyeGlow}
                          onChange={(e) => setEyeGlow(Number(e.target.value))}
                          className="w-full h-1 bg-purple-950 rounded appearance-none cursor-pointer accent-[#8b5cf6]"
                        />
                        <span className="font-mono text-[10px] text-purple-300 w-7 text-right">{eyeGlow}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 md:col-span-2">
                      <span className="text-gray-400 font-mono text-[11px]">Socket Depth (Occlusion)</span>
                      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={socketDepth}
                          onChange={(e) => setSocketDepth(Number(e.target.value))}
                          className="w-full h-1 bg-purple-950 rounded appearance-none cursor-pointer accent-[#8b5cf6]"
                        />
                        <span className="font-mono text-[10px] text-purple-300 w-7 text-right">{socketDepth}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────── MODE 1: CHARACTER SHOWCASE */}
          {mode === 'character' && (
            <div className="flex flex-col items-center justify-center gap-8 relative z-10 p-6">
              {/* Character Presence Glow */}
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute rounded-full bg-violet-600/20 blur-3xl transition-all duration-700 pointer-events-none"
                  style={{ width: botSize * 1.6, height: botSize * 1.6 }}
                />
                <BakasurBotAdapter
                  state={effectiveState}
                  expression={effectiveExpression}
                  colour={theme}
                  size={botSize}
                  follow={followPointer && !effectiveReducedMotion}
                  frozenAt={isFrozen || effectiveReducedMotion ? 0 : undefined}
                  label="Bakasur Companion Showcase"
                />
              </div>

              {/* Minimal Intent Indicator */}
              <div className="text-center font-mono text-xs text-purple-300/80 tracking-widest uppercase">
                {selectedPresetId ? (
                  <span>{selectedPresetId}</span>
                ) : (
                  <span>
                    {state} {expression ? `· ${expression}` : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────── MODE 2: CINEMATIC SCENE SHOWCASE */}
          {mode === 'cinematic' && (
            <div className="w-full h-full flex items-center justify-center relative z-10 p-4">
              <BakasurSceneAdapter
                sceneId={effectiveSceneId}
                time={sceneTime}
                autoplay={isPlayingScene && !effectiveReducedMotion}
                loop={true}
                width={1100}
                height={650}
                reduced={effectiveReducedMotion}
                interact={true}
                follow={followPointer}
                className="w-full max-w-5xl h-auto aspect-[16/10] rounded-2xl shadow-2xl border border-violet-500/20"
              />
            </div>
          )}

          {/* ────────────────────────────────────────────── MODE 3: DIALOGUE SCENE SHOWCASE */}
          {mode === 'dialogue' && (
            <div className="flex flex-col items-center justify-center gap-8 relative z-10 w-full max-w-2xl px-6">
              {/* Bakasur Character Above Dialogue */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-48 h-48 rounded-full bg-violet-600/15 blur-2xl pointer-events-none" />
                <BakasurBotAdapter
                  state={state}
                  expression={expression}
                  colour={theme}
                  size={180}
                  follow={followPointer && !effectiveReducedMotion}
                />
              </div>

              {/* REAL Cinematic Dialogue Plate */}
              <div className="w-full">
                <CinematicDialoguePlate
                  text={
                    customDialogueText ??
                    currentLine?.text ??
                    'I was wondering when you would finally come back.'
                  }
                  speaker={currentLine?.speaker ?? 'Bakasur'}
                  source={activeDialogueSeq?.id}
                  className="w-full shadow-2xl"
                />
              </div>

              {/* Real Interactive Dialogue Choices (if present in current line) */}
              {currentLine?.choices && currentLine.choices.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {currentLine.choices.map((c: { id: string; text: string }) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedChoiceId(c.id)}
                      className={`p-3 rounded-xl text-xs font-medium border text-left transition-all backdrop-blur-md ${
                        selectedChoiceId === c.id
                          ? 'bg-violet-950/90 text-violet-100 border-violet-500 shadow-xl shadow-violet-950'
                          : 'bg-black/60 hover:bg-violet-950/40 text-purple-200 border-violet-500/20'
                      }`}
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Compact Dialogue Step Controls */}
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-violet-500/20">
                <button
                  type="button"
                  disabled={currentLineIndex === 0}
                  onClick={() => setCurrentLineIndex((i) => Math.max(0, i - 1))}
                  className="text-xs text-purple-300 hover:text-violet-100 disabled:opacity-30 transition-colors"
                >
                  ◀
                </button>
                <span className="font-mono text-xs text-purple-300/80">
                  {currentLineIndex + 1} / {activeDialogueSeq?.lines?.length ?? 1}
                </span>
                <button
                  type="button"
                  disabled={currentLineIndex >= (activeDialogueSeq?.lines?.length ?? 1) - 1}
                  onClick={() => setCurrentLineIndex((i) => Math.min((activeDialogueSeq?.lines?.length ?? 1) - 1, i + 1))}
                  className="text-xs text-purple-300 hover:text-violet-100 disabled:opacity-30 transition-colors"
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────── EXIT PRESENTATION BUTTON */}
        {isFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 z-50 px-4 py-2 text-xs font-semibold bg-violet-950/80 hover:bg-violet-900 text-violet-100 rounded-full border border-violet-600/50 shadow-2xl backdrop-blur-md transition-all"
          >
            ✕ Exit Presentation Mode
          </button>
        )}
      </main>

      {/* ────────────────────────────────────────────────────────── FLOATING BOTTOM CONTROL DOCK */}
      {!isFullscreen && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 w-full max-w-xl px-4 pointer-events-none">
          {/* FLOATING TRANSLUCENT DOCK */}
          <div className="w-full bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-violet-500/20 shadow-2xl flex items-center justify-between gap-4 pointer-events-auto">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Previous Intent"
                onClick={() => {
                  const idx = ALL_INTENTS.indexOf(state)
                  const prevIdx = (idx - 1 + ALL_INTENTS.length) % ALL_INTENTS.length
                  setState(ALL_INTENTS[prevIdx])
                }}
                className="p-1.5 hover:bg-violet-900/40 rounded-full text-purple-300 transition-colors text-xs"
              >
                ⏮
              </button>
              <button
                type="button"
                title={isFrozen ? 'Play' : 'Pause'}
                onClick={() => {
                  if (mode === 'cinematic') setIsPlayingScene((p) => !p)
                  else setIsFrozen((f) => !f)
                }}
                className="w-7 h-7 bg-violet-900/80 hover:bg-violet-800 text-violet-100 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-lg border border-violet-500/40"
              >
                {mode === 'cinematic' ? (isPlayingScene ? '⏸' : '▶') : isFrozen ? '▶' : '⏸'}
              </button>
              <button
                type="button"
                title="Next Intent"
                onClick={() => {
                  const idx = ALL_INTENTS.indexOf(state)
                  const nextIdx = (idx + 1) % ALL_INTENTS.length
                  setState(ALL_INTENTS[nextIdx])
                }}
                className="p-1.5 hover:bg-violet-900/40 rounded-full text-purple-300 transition-colors text-xs"
              >
                ⏭
              </button>
              <button
                type="button"
                title="Reset Pose"
                onClick={() => {
                  setState('idle')
                  setExpression(null)
                  setIsFrozen(false)
                  setSceneTime(0)
                }}
                className="p-1 hover:bg-violet-900/40 rounded-full text-purple-400 hover:text-purple-200 transition-colors text-xs font-mono ml-1"
              >
                ↻
              </button>
            </div>

            {/* Quick Intent Chips / Timeline Slider */}
            {mode === 'cinematic' ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={sceneTime}
                  onChange={(e) => setSceneTime(parseFloat(e.target.value))}
                  className="flex-1 accent-violet-500 bg-purple-950/60 h-1.5 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-[11px] text-purple-300/80">
                  {sceneTime.toFixed(1)}s
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                {['idle', 'happy', 'curious', 'thinking', 'mischievous'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      if (ALL_EXPRESSIONS.includes(chip as any)) setExpression(chip)
                      else setState(chip as BakasurIntent)
                    }}
                    className={`px-2.5 py-0.5 text-[11px] font-mono rounded-full capitalize transition-colors ${
                      state === chip || expression === chip
                        ? 'bg-violet-900 text-violet-100 border border-violet-500/60'
                        : 'text-purple-300/70 hover:text-purple-100 hover:bg-violet-950/40'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Toggle Control Drawer Button */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen((d) => !d)}
              className="text-xs text-purple-300 hover:text-violet-100 font-mono px-2 py-1 rounded bg-violet-950/40 hover:bg-violet-900/60 border border-violet-500/20 transition-all flex items-center gap-1"
            >
              <span>Controls</span>
              <span>⚙</span>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── COLLAPSIBLE CONTROL DRAWER */}
      {isDrawerOpen && !isFullscreen && (
        <aside className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-96 bg-[#090712]/95 backdrop-blur-xl border-l border-violet-500/20 p-5 overflow-y-auto flex flex-col gap-5 shadow-2xl transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
            <h2 className="font-semibold text-xs tracking-widest text-violet-100 uppercase">
              Control Drawer
            </h2>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="text-xs text-purple-400 hover:text-purple-100 font-mono p-1"
            >
              ✕ Close
            </button>
          </div>

          {/* SECTION 1: CHARACTER & PRESETS */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'presets' ? null : 'presets')}
              className="w-full flex items-center justify-between font-mono text-xs text-violet-300 font-semibold uppercase tracking-wide border-b border-purple-900/30 pb-1"
            >
              <span>Character & Presets</span>
              <span>{expandedSection === 'presets' ? '−' : '+'}</span>
            </button>

            {expandedSection === 'presets' && (
              <div className="space-y-3 text-xs pt-1">
                {/* Preset Catalogue */}
                <div>
                  <label className="block text-purple-400 font-mono text-[11px] mb-1">Preset Catalogue:</label>
                  <select
                    value={selectedPresetId ?? ''}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full bg-black/80 border border-purple-800/50 text-purple-200 rounded p-2 text-xs font-mono focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Custom Specs --</option>
                    {allPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.animation})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Intent Selector */}
                <div>
                  <label className="block text-purple-400 font-mono text-[11px] mb-1">Animation Intent:</label>
                  <div className="grid grid-cols-3 gap-1">
                    {ALL_INTENTS.map((intentId) => (
                      <button
                        key={intentId}
                        type="button"
                        onClick={() => setState(intentId)}
                        className={`p-1 text-[10px] font-mono rounded text-center border capitalize transition-colors ${
                          state === intentId
                            ? 'bg-violet-900 text-violet-100 border-violet-500 font-semibold'
                            : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {intentId}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expression Selector */}
                <div>
                  <label className="block text-purple-400 font-mono text-[11px] mb-1">Expression:</label>
                  <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setExpression(null)}
                      className={`p-1 text-[9px] font-mono rounded border ${
                        expression === null ? 'bg-violet-900 text-violet-100 border-violet-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      [Default]
                    </button>
                    {ALL_EXPRESSIONS.map((exprId) => (
                      <button
                        key={exprId}
                        type="button"
                        onClick={() => setExpression(exprId)}
                        className={`p-1 text-[9px] font-mono rounded border capitalize truncate ${
                          expression === exprId ? 'bg-violet-900 text-violet-100 border-violet-500 font-semibold' : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {exprId}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selector */}
                <div>
                  <label className="block text-purple-400 font-mono text-[11px] mb-1">Theme:</label>
                  <div className="grid grid-cols-2 gap-1">
                    {BAKASUR_THEME_IDS.map((tId) => (
                      <button
                        key={tId}
                        type="button"
                        onClick={() => setTheme(tId)}
                        className={`p-1 text-[10px] font-mono rounded border capitalize ${
                          theme === tId ? 'bg-violet-900 text-violet-100 border-violet-500 font-semibold' : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {tId}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Personality Selector */}
                <div>
                  <label className="block text-purple-400 font-mono text-[11px] mb-1">Personality:</label>
                  <div className="grid grid-cols-4 gap-1">
                    {ALL_PERSONALITIES.map((pId) => (
                      <button
                        key={pId}
                        type="button"
                        onClick={() => handleSelectPersonality(pId)}
                        className={`p-1 text-[9px] font-mono rounded border capitalize truncate ${
                          personality === pId ? 'bg-violet-900 text-violet-100 border-violet-500 font-semibold' : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {pId}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size & Follow */}
                <div className="flex items-center justify-between pt-2 border-t border-purple-900/30">
                  <div className="flex items-center gap-1.5">
                    <span className="text-purple-400 text-[10px] font-mono">Size:</span>
                    <button
                      type="button"
                      onClick={() => setBotSize(140)}
                      className={`px-2 py-0.5 text-[9px] rounded border ${
                        botSize === 140 ? 'bg-violet-900 text-violet-200 border-violet-600' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      S
                    </button>
                    <button
                      type="button"
                      onClick={() => setBotSize(280)}
                      className={`px-2 py-0.5 text-[9px] rounded border ${
                        botSize === 280 ? 'bg-violet-900 text-violet-200 border-violet-600' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => setBotSize(360)}
                      className={`px-2 py-0.5 text-[9px] rounded border ${
                        botSize === 360 ? 'bg-violet-900 text-violet-200 border-violet-600' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      L
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] text-purple-300 font-mono cursor-pointer">
                    <input
                      type="checkbox"
                      checked={followPointer}
                      onChange={(e) => setFollowPointer(e.target.checked)}
                      className="accent-violet-500 rounded"
                    />
                    Follow
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: CINEMATIC SCENES */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'scenes' ? null : 'scenes')}
              className="w-full flex items-center justify-between font-mono text-xs text-violet-300 font-semibold uppercase tracking-wide border-b border-purple-900/30 pb-1"
            >
              <span>Cinematic Scenes</span>
              <span>{expandedSection === 'scenes' ? '−' : '+'}</span>
            </button>

            {expandedSection === 'scenes' && (
              <div className="space-y-2 text-xs pt-1">
                {allScenes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setMode('cinematic')
                      setSceneId(s.id)
                      setSceneTime(0)
                    }}
                    className={`w-full p-2 text-left rounded-lg border font-mono text-xs transition-colors ${
                      sceneId === s.id && mode === 'cinematic'
                        ? 'bg-violet-900 text-violet-100 border-violet-500 font-semibold'
                        : 'bg-zinc-900/80 hover:bg-zinc-800 text-purple-300 border-zinc-800'
                    }`}
                  >
                    <div className="font-semibold capitalize">{s.id.replace('bakasur-', '')}</div>
                    <div className="text-[10px] text-purple-400/70">{s.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: DIALOGUE SEQUENCES */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'dialogue' ? null : 'dialogue')}
              className="w-full flex items-center justify-between font-mono text-xs text-violet-300 font-semibold uppercase tracking-wide border-b border-purple-900/30 pb-1"
            >
              <span>Dialogue Sequences</span>
              <span>{expandedSection === 'dialogue' ? '−' : '+'}</span>
            </button>

            {expandedSection === 'dialogue' && (
              <div className="space-y-2 text-xs pt-1">
                <select
                  value={dialogueId}
                  onChange={(e) => {
                    setMode('dialogue')
                    setDialogueId(e.target.value)
                    setCurrentLineIndex(0)
                    setCustomDialogueText(null)
                  }}
                  className="w-full bg-black/80 border border-purple-800/50 text-purple-200 rounded p-2 text-xs font-mono"
                >
                  {allDialogues.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} ({d.lines?.length ?? 0} lines)
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Custom override text (optional)…"
                  value={customDialogueText ?? ''}
                  onChange={(e) => setCustomDialogueText(e.target.value || null)}
                  className="w-full bg-black/80 border border-purple-800/30 text-purple-100 placeholder-purple-700 rounded p-2 text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* SECTION 4: VIEWPORT QA */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'viewport' ? null : 'viewport')}
              className="w-full flex items-center justify-between font-mono text-xs text-violet-300 font-semibold uppercase tracking-wide border-b border-purple-900/30 pb-1"
            >
              <span>Viewport QA</span>
              <span>{expandedSection === 'viewport' ? '−' : '+'}</span>
            </button>

            {expandedSection === 'viewport' && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs font-mono">
                {Object.values(VIEWPORT_PRESETS).map((vp) => (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => setViewportPresetId(vp.id)}
                    className={`p-1.5 text-[10px] rounded border text-left ${
                      viewportPresetId === vp.id
                        ? 'bg-violet-900 text-violet-100 border-violet-500 font-semibold'
                        : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    <div>{vp.name}</div>
                    <div className="text-[9px] opacity-60">{vp.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: DEBUG OVERLAYS */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'debug' ? null : 'debug')}
              className="w-full flex items-center justify-between font-mono text-xs text-violet-300 font-semibold uppercase tracking-wide border-b border-purple-900/30 pb-1"
            >
              <span>Debug Overlays</span>
              <span>{expandedSection === 'debug' ? '−' : '+'}</span>
            </button>

            {expandedSection === 'debug' && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setDebugOverlays((o) => ({ ...o, bounds: !o.bounds }))}
                  className={`p-1.5 rounded border ${
                    debugOverlays.bounds ? 'bg-cyan-950 text-cyan-300 border-cyan-700' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  Bounds
                </button>
                <button
                  type="button"
                  onClick={() => setDebugOverlays((o) => ({ ...o, actorCenter: !o.actorCenter }))}
                  className={`p-1.5 rounded border ${
                    debugOverlays.actorCenter ? 'bg-violet-950 text-violet-300 border-violet-700' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  Actor Center
                </button>
                <button
                  type="button"
                  onClick={() => setDebugOverlays((o) => ({ ...o, portalCenter: !o.portalCenter }))}
                  className={`p-1.5 rounded border ${
                    debugOverlays.portalCenter ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  Portal Center
                </button>
                <button
                  type="button"
                  onClick={() => setDebugOverlays((o) => ({ ...o, dialogueBounds: !o.dialogueBounds }))}
                  className={`p-1.5 rounded border ${
                    debugOverlays.dialogueBounds ? 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-700' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  Dialogue Bounds
                </button>
              </div>
            )}
          </div>

          {/* SECTION 6: DEVELOPER QA (ERROR TESTING) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'errors' ? null : 'errors')}
              className="w-full flex items-center justify-between font-mono text-xs text-rose-400 font-semibold uppercase tracking-wide border-b border-rose-900/30 pb-1"
            >
              <span>Developer QA (Errors)</span>
              <span>{expandedSection === 'errors' ? '−' : '+'}</span>
            </button>

            {expandedSection === 'errors' && (
              <ErrorTestingPanel
                errors={errors}
                onToggleError={handleToggleError}
                onReset={handleResetErrors}
              />
            )}
          </div>

          {/* SECTION 7: ADVANCED (RUNTIME INSPECTOR) */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'inspector' ? null : 'inspector')}
              className="w-full flex items-center justify-between font-mono text-xs text-purple-400 font-semibold uppercase tracking-wide border-b border-purple-900/30 pb-1"
            >
              <span>Advanced Inspector</span>
              <span>{expandedSection === 'inspector' ? '−' : '+'}</span>
            </button>

            {expandedSection === 'inspector' && (
              <div className="pt-1">
                <RuntimeInspector
                  status="READY"
                  mode={mode}
                  intent={state}
                  resolvedIntent={resolvedPreset?.animation ?? state}
                  expression={expression}
                  preset={selectedPresetId}
                  theme={theme}
                  personality={personality}
                  scene={mode === 'cinematic' ? sceneId : null}
                  dialogue={mode === 'dialogue' ? dialogueId : null}
                  reducedMotion={{
                    system: systemReducedMotion,
                    override: reducedMotionOverride,
                    effective: effectiveReducedMotion
                  }}
                  viewport={`${currentViewport.name} (${currentViewport.label})`}
                  time={sceneTime}
                />
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
