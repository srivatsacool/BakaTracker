/*
 * BAKATRACKER — Canonical Flamehorn Character Studio
 *
 * Full interactive studio matching the canonical Flamehorn showcase:
 * - Emotional state switcher (Idle, Thinking, Celebrate/Wink, Alert, Sleep, Happy)
 * - Mood keylight palette switcher
 * - Render scale selector (48px Dock, 96px Orb, 192px Rail, 320px Hero)
 * - Real-time sliders for Tactile Texture, 3D Core Depth, Specular Sheen, Eye Glow Radiance, Socket Depth
 * - Interactive gaze tracking and blink trigger
 * - Standalone SVG Export: Copy SVG Code & Download SVG
 * - Geometry & Harmonic specifications grid
 */

import React, { useState, useRef } from 'react'
import { FlamehornCharacter, type FlamehornMood } from '../components/bakasur/FlamehornCharacter'
import { Link } from 'react-router-dom'

const MOOD_COLORS = [
  { id: 'violet', hex: '#8B5CF6', label: 'Violet' },
  { id: 'lavender', hex: '#a855f7', label: 'Lavender' },
  { id: 'pink', hex: '#ec4899', label: 'Pink' },
  { id: 'cyan', hex: '#06b6d4', label: 'Cyan' },
  { id: 'emerald', hex: '#10b981', label: 'Emerald' },
  { id: 'amber', hex: '#f59e0b', label: 'Amber' },
  { id: 'white', hex: '#ffffff', label: 'Pure Light' }
]

const SIZES = [
  { size: 48, label: '48px (Dock)' },
  { size: 96, label: '96px (Orb)' },
  { size: 192, label: '192px (Rail)' },
  { size: 320, label: '320px (Hero)' }
]

const STATES: { id: FlamehornMood; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'celebrate', label: 'Celebrate (Wink)' },
  { id: 'alert', label: 'Alert' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'happy', label: 'Happy' }
]

export const FlamehornStudioPage: React.FC = () => {
  const [currentState, setCurrentState] = useState<FlamehornMood>('idle')
  const [currentMoodColor, setCurrentMoodColor] = useState<string>('#8B5CF6')
  const [currentScale, setCurrentScale] = useState<number>(320)
  const [tactileTexture, setTactileTexture] = useState<number>(48)
  const [coreDepth, setCoreDepth] = useState<number>(100)
  const [specularSheen, setSpecularSheen] = useState<number>(61)
  const [eyeGlow, setEyeGlow] = useState<number>(85)
  const [socketDepth, setSocketDepth] = useState<number>(85)
  const [copied, setCopied] = useState<boolean>(false)

  const svgCodeRef = useRef<string>('')

  const handleSvgReady = (code: string) => {
    svgCodeRef.current = code
  }

  const handleCopySvg = async () => {
    if (!svgCodeRef.current) return
    try {
      await navigator.clipboard.writeText(svgCodeRef.current)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const handleDownloadSvg = () => {
    if (!svgCodeRef.current) return
    const blob = new Blob([svgCodeRef.current], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bakasur-flamehorn-${currentState}-${currentMoodColor.replace('#', '')}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8"
      style={{
        backgroundColor: '#060714',
        color: '#e9e6f2',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
      }}
    >
      {/* Top Breadcrumb Nav */}
      <div className="w-full max-w-[860px] flex items-center justify-between mb-4 px-2">
        <Link
          to="/"
          className="text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
        >
          ← Return to BakaTracker
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/bakasur"
            className="text-xs font-mono text-purple-400 hover:text-purple-300 transition-colors"
          >
            Companion Terminal
          </Link>
          <span className="text-gray-600">·</span>
          <Link
            to="/bakasur-preview"
            className="text-xs font-mono text-purple-400 hover:text-purple-300 transition-colors"
          >
            Cinematic Preview
          </Link>
        </div>
      </div>

      <div
        className="w-full max-w-[860px] flex flex-col items-center gap-8 rounded-[20px] p-6 md:p-10 border"
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
            className="inline-block text-[0.75rem] font-semibold tracking-[0.08em] uppercase px-3 py-1 rounded-full mb-3 border"
            style={{
              color: '#c4b5fd',
              background: 'rgba(139, 92, 246, 0.15)',
              borderColor: 'rgba(139, 92, 246, 0.3)'
            }}
          >
            Canonical BakaTracker Geometry
          </span>
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Bakasur — Flamehorn
          </h1>
          <p className="text-[#9490a6] text-sm md:text-[0.95rem] max-w-[540px] mx-auto">
            Direction A: Mild organic pebble with dual curved horns and central sculptural candle-flame crest. Move cursor over the box to interact with gaze.
          </p>
        </div>

        {/* Interactive Viewport */}
        <div
          className="relative w-full max-w-[440px] h-[400px] flex items-center justify-center overflow-hidden border rounded-2xl cursor-crosshair"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(30, 24, 46, 0.8) 0%, rgba(6, 7, 20, 0.95) 75%)',
            borderColor: 'rgba(139, 92, 246, 0.25)',
            boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.8)'
          }}
        >
          {/* Subtle spinning orbital ring */}
          <div
            className="absolute w-[320px] h-[320px] rounded-full border border-dashed pointer-events-none"
            style={{
              borderColor: 'rgba(139, 92, 246, 0.18)',
              animation: 'spin 60s linear infinite'
            }}
          />

          <FlamehornCharacter
            state={currentState}
            size={currentScale}
            moodColor={currentMoodColor}
            tactileTexture={tactileTexture}
            coreDepth={coreDepth}
            specularSheen={specularSheen}
            eyeGlow={eyeGlow}
            socketDepth={socketDepth}
            followPointer={true}
            interactive={true}
            onSvgReady={handleSvgReady}
          />
        </div>

        {/* Controls Panel */}
        <div className="flex flex-col gap-5 w-full">
          {/* Emotional State */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.85rem] font-semibold text-[#a78bfa] uppercase tracking-wider">
              Emotional State
            </span>
            <div className="flex flex-wrap gap-2">
              {STATES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentState(s.id)}
                  className={`px-3.5 py-1.5 text-sm rounded-lg border transition-all cursor-pointer ${
                    currentState === s.id
                      ? 'bg-[#7c3aed] text-white border-[#a78bfa] shadow-[0_0_16px_rgba(124,58,237,0.5)]'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-purple-900/30 hover:border-purple-500/40 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Keylight */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.85rem] font-semibold text-[#a78bfa] uppercase tracking-wider">
              Mood Keylight
            </span>
            <div className="flex items-center gap-2.5">
              {MOOD_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCurrentMoodColor(c.hex)}
                  title={c.label}
                  className={`w-5 h-5 rounded-full cursor-pointer transition-transform border-2 ${
                    currentMoodColor.toLowerCase() === c.hex.toLowerCase()
                      ? 'border-white scale-125'
                      : 'border-transparent hover:scale-115'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Render Scale */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.85rem] font-semibold text-[#a78bfa] uppercase tracking-wider">
              Render Scale
            </span>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((sz) => (
                <button
                  key={sz.size}
                  onClick={() => setCurrentScale(sz.size)}
                  className={`px-3.5 py-1.5 text-sm rounded-lg border transition-all cursor-pointer ${
                    currentScale === sz.size
                      ? 'bg-[#7c3aed] text-white border-[#a78bfa] shadow-[0_0_16px_rgba(124,58,237,0.5)]'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-purple-900/30 hover:border-purple-500/40 hover:text-white'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tactile Texture */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.85rem] font-semibold text-[#a78bfa] uppercase tracking-wider">
              Tactile Texture
            </span>
            <div className="flex items-center gap-3 flex-1 min-w-[220px] justify-end">
              <input
                type="range"
                min="0"
                max="100"
                value={tactileTexture}
                onChange={(e) => setTactileTexture(Number(e.target.value))}
                className="w-full max-w-[280px] h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
              />
              <span className="font-mono text-xs text-[#c4b5fd] w-10 text-right">
                {tactileTexture}%
              </span>
            </div>
          </div>

          {/* 3D Core Depth */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.85rem] font-semibold text-[#a78bfa] uppercase tracking-wider">
              3D Core Depth
            </span>
            <div className="flex items-center gap-3 flex-1 min-w-[220px] justify-end">
              <input
                type="range"
                min="0"
                max="100"
                value={coreDepth}
                onChange={(e) => setCoreDepth(Number(e.target.value))}
                className="w-full max-w-[280px] h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
              />
              <span className="font-mono text-xs text-[#c4b5fd] w-10 text-right">
                {coreDepth}%
              </span>
            </div>
          </div>

          {/* Specular Sheen */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.85rem] font-semibold text-[#a78bfa] uppercase tracking-wider">
              Specular Sheen
            </span>
            <div className="flex items-center gap-3 flex-1 min-w-[220px] justify-end">
              <input
                type="range"
                min="0"
                max="100"
                value={specularSheen}
                onChange={(e) => setSpecularSheen(Number(e.target.value))}
                className="w-full max-w-[280px] h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
              />
              <span className="font-mono text-xs text-[#c4b5fd] w-10 text-right">
                {specularSheen}%
              </span>
            </div>
          </div>

          {/* Eye Glow Radiance */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.85rem] font-semibold text-[#a78bfa] uppercase tracking-wider">
              Eye Glow Radiance
            </span>
            <div className="flex items-center gap-3 flex-1 min-w-[220px] justify-end">
              <input
                type="range"
                min="0"
                max="100"
                value={eyeGlow}
                onChange={(e) => setEyeGlow(Number(e.target.value))}
                className="w-full max-w-[280px] h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
              />
              <span className="font-mono text-xs text-[#c4b5fd] w-10 text-right">
                {eyeGlow}%
              </span>
            </div>
          </div>

          {/* Socket Depth (Occlusion) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.85rem] font-semibold text-[#a78bfa] uppercase tracking-wider">
              Socket Depth (Occlusion)
            </span>
            <div className="flex items-center gap-3 flex-1 min-w-[220px] justify-end">
              <input
                type="range"
                min="0"
                max="100"
                value={socketDepth}
                onChange={(e) => setSocketDepth(Number(e.target.value))}
                className="w-full max-w-[280px] h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
              />
              <span className="font-mono text-xs text-[#c4b5fd] w-10 text-right">
                {socketDepth}%
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              onClick={handleCopySvg}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all border bg-purple-950/40 border-purple-500/40 text-purple-200 hover:bg-[#7c3aed] hover:text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            >
              {copied ? '✓ SVG Copied to Clipboard!' : '📋 Copy SVG Code'}
            </button>
            <button
              onClick={handleDownloadSvg}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all border bg-purple-950/40 border-purple-500/40 text-purple-200 hover:bg-[#7c3aed] hover:text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            >
              💾 Download SVG
            </button>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-6 border-t border-white/10 text-xs">
            <div className="bg-black/30 border border-white/5 rounded-lg p-3">
              <div className="text-[#8b5cf6] font-semibold mb-1">Twin Horns</div>
              <div className="text-gray-300">233° & 307° (+0.17 bump)</div>
            </div>
            <div className="bg-black/30 border border-white/5 rounded-lg p-3">
              <div className="text-[#8b5cf6] font-semibold mb-1">Flame Crest</div>
              <div className="text-gray-300">270° Apex (+0.12 crest)</div>
            </div>
            <div className="bg-black/30 border border-white/5 rounded-lg p-3">
              <div className="text-[#8b5cf6] font-semibold mb-1">Base Harmonics</div>
              <div className="text-gray-300">1 + 0.045 cos(2θ) + 0.02 cos(4θ)</div>
            </div>
            <div className="bg-black/30 border border-white/5 rounded-lg p-3">
              <div className="text-[#8b5cf6] font-semibold mb-1">Aperture System</div>
              <div className="text-gray-300">Mask-punched capsule eyes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
