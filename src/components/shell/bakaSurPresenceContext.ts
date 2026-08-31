/*
 * BAKATRACKER V3.5 — presence context (split from BakaSurPresence.tsx so the
 * provider file exports only components — react-refresh contract).
 */
import { createContext, useContext, useSyncExternalStore } from 'react'
import {
  getBakaSurPreferencesSnapshot, subscribeBakaSurPreferences,
  type BakaSurPreferences,
} from '../../lib/baksurPreferences'

export interface BakaSurPresenceApi {
  /** The rail registers its header box here; the hero flies to it on open. */
  registerSlot: (el: HTMLElement | null) => void
  /** The rail reports chat-busy so he can THINK where the user can see. */
  reportBusy: (busy: boolean) => void
  /** True while the rail is expanded (drives the header slot mount). */
  isChatOpen: boolean
  /** Proactive companion API */
  proactive?: {
    getProactiveMessage: () => string | null
    getProactiveIntent: () => string | null
  }
}

export const BakaSurPresenceCtx = createContext<BakaSurPresenceApi | null>(null)


export function useBakaSurPresenceSlot(): (el: HTMLElement | null) => void {
  const ctx = useContext(BakaSurPresenceCtx)
  return ctx?.registerSlot ?? (() => {})
}
export function useBakaSurBusyReporter(): (busy: boolean) => void {
  const ctx = useContext(BakaSurPresenceCtx)
  return ctx?.reportBusy ?? (() => {})
}
/** Provider consumed by BakaSurRail to know the chat is open (slot render). */
export function useBakaSurChatOpen(): boolean {
  const ctx = useContext(BakaSurPresenceCtx)
  return Boolean(ctx?.isChatOpen)
}

/** Preferences read via the store-subscription contract. */
export function useBakaSurPrefs(): BakaSurPreferences {
  return useSyncExternalStore(
    subscribeBakaSurPreferences,
    getBakaSurPreferencesSnapshot,
    getBakaSurPreferencesSnapshot,
  )
}

export function useBakaSurProactiveApi() {
  const ctx = useContext(BakaSurPresenceCtx)
  return ctx?.proactive
}
