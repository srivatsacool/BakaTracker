/*
 * BAKATRACKER — Bakasur Scene View React Adapter (Phase 11).
 *
 * Mounts Vue 3 SceneView component into React DOM.
 * Renders full cinematic scenes (camera, portal, Bakasur, environment, particles, dialogue).
 */

import React, { useEffect, useRef, useState } from 'react'
import { createApp, h, type App as VueApp } from 'vue'
import { SceneView, type CinematicScene, type DialogueSequence } from 'bakasur-ui'

export interface BakasurSceneAdapterProps {
  sceneId?: string
  sceneData?: CinematicScene | null
  time?: number
  autoplay?: boolean
  loop?: boolean
  width?: number
  height?: number
  frozenAt?: number
  reduced?: boolean | null
  dialogue?: DialogueSequence | null
  interact?: boolean
  personality?: string | null
  follow?: boolean
  label?: string
  className?: string
  style?: React.CSSProperties
  onComplete?: () => void
  onChoice?: (lineId: string, choiceId: string) => void
}

export const BakasurSceneAdapter: React.FC<BakasurSceneAdapterProps> = ({
  sceneId = 'bakasur-awakening',
  sceneData = null,
  time = 0,
  autoplay = true,
  loop = true,
  width = 800,
  height = 500,
  frozenAt,
  reduced = null,
  dialogue = null,
  interact = false,
  personality = null,
  follow = false,
  label,
  className = '',
  style,
  onComplete,
  onChoice
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<VueApp | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    try {
      if (appRef.current) {
        appRef.current.unmount()
        appRef.current = null
      }

      const props = {
        sceneId,
        sceneData,
        time,
        autoplay,
        loop,
        width,
        height,
        frozenAt,
        reduced,
        dialogue,
        interact,
        personality,
        follow,
        label,
        onComplete: () => onComplete?.(),
        onChoice: (lineId: string, choiceId: string) => onChoice?.(lineId, choiceId)
      }

      const app = createApp({
        render: () => h(SceneView, props)
      })

      app.mount(containerRef.current)
      appRef.current = app
      setHasError(false)
    } catch (err) {
      console.warn('BakasurSceneAdapter mount fallback:', err)
      setHasError(true)
    }

    return () => {
      if (appRef.current) {
        try {
          appRef.current.unmount()
        } catch {
          /* ignore */
        }
        appRef.current = null
      }
    }
  }, [sceneId, sceneData, time, autoplay, loop, width, height, frozenAt, reduced, dialogue, interact, personality, follow, label, onChoice, onComplete])

  if (hasError) {
    return (
      <div
        className={`bakasur-scene-fallback ${className}`}
        style={{ width: `${width}px`, height: `${height}px`, background: '#060409', borderRadius: '12px', ...style }}
        aria-label={label ?? sceneId}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={`bakasur-scene-container ${className}`}
      style={{ display: 'block', width: `${width}px`, height: `${height}px`, ...style }}
    />
  )
}
