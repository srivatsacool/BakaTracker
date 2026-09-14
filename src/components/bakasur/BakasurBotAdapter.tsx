/*
 * BAKATRACKER — BakasurBot React Adapter (Phase 11).
 *
 * Mounts Vue 3 BakasurBot component safely into React DOM.
 * Handles reactive prop synchronization and provides deterministic fallback
 * if initialization encounters any error.
 */

import React, { useEffect, useRef, useState } from 'react'
import { createApp, h, type App as VueApp } from 'vue'
import { BakasurBot } from 'bakasur-ui'

export interface BakasurBotAdapterProps {
  state?: string
  expression?: string | null
  colour?: string
  treatment?: Record<string, unknown>
  size?: number
  frozenAt?: number
  follow?: boolean
  label?: string
  className?: string
  style?: React.CSSProperties
}

export const BakasurBotAdapter: React.FC<BakasurBotAdapterProps> = ({
  state = 'idle',
  expression = null,
  colour = 'midnight-violet',
  treatment,
  size = 160,
  frozenAt,
  follow = false,
  label = 'Bakasur',
  className = '',
  style
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<VueApp | null>(null)
  const [hasError, setHasError] = useState(false)

  // Sync props to Vue component
  useEffect(() => {
    if (!containerRef.current) return

    try {
      if (appRef.current) {
        appRef.current.unmount()
        appRef.current = null
      }

      const props = {
        state,
        expression,
        colour,
        treatment,
        size,
        frozenAt,
        follow,
        label
      }

      const app = createApp({
        render: () => h(BakasurBot, props)
      })

      app.mount(containerRef.current)
      appRef.current = app
      setHasError(false)
    } catch (err) {
      console.warn('BakasurBotAdapter mount fallback:', err)
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
  }, [state, expression, colour, treatment, size, frozenAt, follow, label])

  if (hasError) {
    return (
      <div
        className={`bakasur-bot-fallback ${className}`}
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: '#0e0a17', ...style }}
        aria-label={label}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={`bakasur-bot-container ${className}`}
      style={{ display: 'inline-block', width: `${size}px`, height: `${size}px`, ...style }}
    />
  )
}
