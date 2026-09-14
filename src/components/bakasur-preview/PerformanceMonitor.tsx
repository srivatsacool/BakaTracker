/*
 * BAKATRACKER — Performance Monitor Component (Phase 12.5)
 * Lightweight FPS & frame timing monitor using requestAnimationFrame ticker.
 */

import React, { useEffect, useRef, useState } from 'react'

export const PerformanceMonitor: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [fps, setFps] = useState(60)
  const [frameTime, setFrameTime] = useState(16.6)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    const tick = (now: number) => {
      frameCount.current++
      const elapsed = now - lastTime.current

      if (elapsed >= 500) {
        const currentFps = Math.round((frameCount.current * 1000) / elapsed)
        const currentFrameTime = (elapsed / frameCount.current).toFixed(1)
        setFps(currentFps)
        setFrameTime(parseFloat(currentFrameTime))
        frameCount.current = 0
        lastTime.current = now
      }

      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    }
  }, [])

  return (
    <div className={`flex items-center gap-3 text-xs font-mono px-3 py-1.5 rounded-lg bg-black/40 border border-purple-900/30 text-purple-300/80 ${className}`}>
      <div className="flex items-center gap-1">
        <span className="opacity-50">FPS:</span>
        <span className={`font-semibold ${fps < 30 ? 'text-rose-400' : fps < 55 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {fps}
        </span>
      </div>
      <div className="w-px h-3 bg-purple-900/40" />
      <div className="flex items-center gap-1">
        <span className="opacity-50">Frame:</span>
        <span className="font-semibold text-purple-200">{frameTime} ms</span>
      </div>
    </div>
  )
}
