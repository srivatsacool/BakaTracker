/*
 * BAKATRACKER V3.5 — BakaSur message registry (Phase 1)
 *
 * ONE place for every scripted BakaSur line. No strings scattered across
 * components, no LLM in the scripted path. Three environments, honestly
 * separated (docs/baksur/PERSONALITY.md governs the voice: notorious,
 * funny, mischievous, observant, kind — never kawaii, never corporate,
 * never cruel):
 *
 *   DEMO_MESSAGES      — visitor is exploring the synthetic ledger
 *   OFFLINE_MESSAGES   — no network / local-first mode
 *   LIVE_MESSAGES      — authenticated personal mode
 *
 * The chat contract itself (BakaSurRail) stays intact: authenticated users
 * still hit POST /api/v1/assistant/chat. This registry replaces the
 * scattered demoReply() strings with a deterministic table, keyed per
 * intent, and adds a stable pick order.
 */

export type BakaSurEnvironment = 'demo' | 'offline' | 'live'

/** Scripted intents. Each environment answers the intents it has copy for;
 *  missing intents fall back to FALLBACK (which every environment has). */
export type BakaSurIntent =
  | 'greeting'
  | 'entering_demo'
  | 'demo_explain'
  | 'offline_explain'
  | 'explore_nudge'
  | 'quest_done'
  | 'habit_done'
  | 'journal_done'
  | 'feature_note'
  | 'return_personal'
  | 'ask_focus'
  | 'ask_habits'
  | 'ask_journal'
  | 'ask_notes'
  | 'ask_stats'
  | 'fallback'

interface MessageTable {
  [intent: string]: readonly string[]
}

export const DEMO_MESSAGES: MessageTable = {
  greeting: [
    'I\'m BakaSur. Welcome to BakaTracker — a personal life OS by Build.Srivatsa.',
    'Look around. Poke things. Break nothing.',
  ],
  entering_demo: [
    'This is a synthetic life — not mine, not yours. A ghost ledger.',
    'Everything works here. Quests, XP, streaks — same mechanics as the real thing.',
  ],
  demo_explain: [
    'A scripted month of habits, quests, and one person\'s rough patch.',
    'The data is fake. The feeling when a streak lands is not.',
  ],
  explore_nudge: [
    'Star a quest. Check a habit. Write one sentence. That is the whole game.',
    'The Journey page is where the week stops being a feeling and becomes a chart.',
  ],
  quest_done: [
    'Nice. One less thing on the board.',
    'Quest cleared. XP posted to the ledger.',
    'Done. That is how momentum starts.',
  ],
  habit_done: [
    'Streak intact. Repetition is the whole trick.',
    'Logged. Your future self just got a gift it does not know about yet.',
    'That is two. The chain grows.',
  ],
  journal_done: [
    'One honest sentence. Enough.',
    'Noted. The save file grows.',
    'Reflection logged. The chart will thank you later.',
  ],
  feature_note: [
    'Levels come from total XP across five stats. No daily reset, no decay.',
    'Matrix sorts the noise from the signal before Today even starts.',
  ],
  return_personal: [
    'Leaving the demo. Your real ledger was never touched.',
  ],
  ask_focus: [
    'Star one quest. Do that one first. The board rewards small and finished.',
    'Whatever has a due date or a Today star. Everything else can wait on purpose.',
  ],
  ask_habits: [
    'Habits beat tasks for XP — a small chain compounds. Check the smallest version today.',
    'Streaks do not need a perfect day, just a logged one. Do the minimum that counts.',
  ],
  ask_journal: [
    'One honest sentence earns the XP. Reflection is the save file.',
    'Write what actually happened, not what should have. The chart does not lie for you.',
  ],
  ask_notes: [
    'Notes are the thinking space. Ideas graduate into quests from there.',
  ],
  ask_stats: [
    'Level is total XP over your per-level line. Stats show where the effort actually went.',
    'The numbers are the receipt. Look at the balance, not just the total.',
  ],
  fallback: [
    'Ask me about quests, habits, journaling, or the numbers.',
    'I keep it short. Try: what should I focus on today?',
  ],
}

export const OFFLINE_MESSAGES: MessageTable = {
  greeting: [
    'Offline, local-first. The ledger lives on this device — nothing to lose.',
  ],
  offline_explain: [
    'No network. Everything still works: quests, habits, journal, XP.',
    'Sync catches up quietly when you reconnect.',
  ],
  fallback: [
    'Offline, but the board is honest. Ask me anything about today.',
  ],
}

export const LIVE_MESSAGES: MessageTable = {
  greeting: [
    'Back to your ledger. What is the move?',
  ],
  return_personal: [
    'This is your instance now. The demo is behind you.',
  ],
  fallback: [
    'I read your actual data — quests, habits, streaks, the lot. Ask.',
  ],
}

const TABLES: Record<BakaSurEnvironment, MessageTable> = {
  demo: DEMO_MESSAGES,
  offline: OFFLINE_MESSAGES,
  live: LIVE_MESSAGES,
}

/** Deterministic pick: same (intent, counter) always yields the same line.
 *  Callers keep a per-session counter; there is deliberately no randomness. */
export function baksurLine(env: BakaSurEnvironment, intent: BakaSurIntent, counter = 0): string {
  const table = TABLES[env]
  const lines = table[intent] ?? table.fallback ?? DEMO_MESSAGES.fallback
  return lines[counter % lines.length]
}

/** True if this environment has scripted copy for the intent (used by the
 *  rail to decide local reply vs live Worker call). */
export function hasScriptedLine(env: BakaSurEnvironment, intent: BakaSurIntent): boolean {
  return Boolean(TABLES[env][intent] ?? TABLES[env].fallback)
}
