/*
 * BAKASUR-UI — Original Bakasur work (Phase 9).
 *
 * Built-in sequences: five DATA dialogues, behaviorally distinct (a
 * greeting, a question beat, a suspicion exchange, a challenged reaction
 * with choices, a success arc). Text stays terse — Bakasur speaks in
 * one-liners. Every reaction cue resolves through the preset pipeline.
 */

import type { DialogueSequence } from './types'

export const DIALOGUE_SEQUENCES: Record<string, DialogueSequence> = {
  'bakasur-greeting': {
    id: 'bakasur-greeting',
    name: 'Greeting',
    description: 'Bakasur notices you and says hello — warm, a little smug.',
    personality: 'smug',
    first: 'g1',
    tags: ['greeting'],
    lines: [
      {
        id: 'g1',
        text: 'You are here.',
        speaker: 'bakasur',
        style: 'cinematic',
        position: 'below',
        reaction: { preset: 'bakasur-attentive' },
        next: 'g2'
      },
      {
        id: 'g2',
        text: 'Good. I was getting bored of the void.',
        speaker: 'bakasur',
        position: 'below',
        reaction: { expression: 'mischievous', animation: 'idle', intensity: 0.5 },
        next: 'g3'
      },
      {
        id: 'g3',
        text: 'Welcome back.',
        speaker: 'bakasur',
        position: 'below',
        entrance: 'rise',
        reaction: { expression: 'happy', animation: 'wink', intensity: 0.4 }
      }
    ]
  },

  'bakasur-curious': {
    id: 'bakasur-curious',
    name: 'Curious',
    description: 'A question beat: thinking, then leaning in with suspicion.',
    personality: 'curious',
    first: 'c1',
    tags: ['question'],
    lines: [
      {
        id: 'c1',
        text: 'Hm.',
        speaker: 'bakasur',
        style: 'thought',
        position: 'above',
        reveal: 'instant',
        duration: 1.4,
        reaction: { preset: 'bakasur-thinking' },
        next: 'c2'
      },
      {
        id: 'c2',
        text: 'What is this, exactly?',
        speaker: 'bakasur',
        position: 'below',
        reaction: { expression: 'curious', animation: 'idle', intensity: 0.55, gaze: { yaw: 12, pitch: -4, mix: 0.6 } },
        next: 'c3'
      },
      {
        id: 'c3',
        text: 'It looks like a decision.',
        speaker: 'bakasur',
        position: 'below',
        emphasis: true,
        reaction: { expression: 'suspicious', animation: 'idle', intensity: 0.6 }
      }
    ]
  },

  'bakasur-suspicious': {
    id: 'bakasur-suspicious',
    name: 'Suspicious',
    description: 'Quiet doubt exchange — user answers, Bakasur does not believe.',
    personality: 'suspicious',
    first: 's1',
    tags: ['exchange'],
    lines: [
      {
        id: 's1',
        text: 'Where were you?',
        speaker: 'bakasur',
        position: 'below',
        reaction: { preset: 'bakasur-suspicious', intensity: 0.5 },
        next: 's2'
      },
      {
        id: 's2',
        text: 'Everywhere.',
        speaker: 'user',
        position: 'right',
        style: 'whisper',
        reveal: 'instant',
        next: 's3'
      },
      {
        id: 's3',
        text: 'That is the worst answer imaginable.',
        speaker: 'bakasur',
        position: 'below',
        emphasis: true,
        reaction: { expression: 'unimpressed', animation: 'idle', intensity: 0.45 }
      }
    ]
  },

  'bakasur-challenge': {
    id: 'bakasur-challenge',
    name: 'Challenge',
    description: 'You dare Bakasur; the reply depends on what you answer.',
    personality: 'chaotic',
    first: 'h1',
    tags: ['choice'],
    lines: [
      {
        id: 'h1',
        text: 'You did what?',
        speaker: 'bakasur',
        position: 'below',
        reaction: { preset: 'bakasur-surprised' },
        next: 'h2'
      },
      {
        id: 'h2',
        text: 'Say it again. I double dare you.',
        speaker: 'bakasur',
        position: 'below',
        emphasis: true,
        reaction: { expression: 'suspicious', animation: 'alert', intensity: 0.7 },
        choices: [
          {
            id: 'again',
            label: 'I did it.',
            next: 'h3a',
            reaction: { expression: 'scared', animation: 'wide', intensity: 0.8 }
          },
          {
            id: 'silence',
            label: 'Nothing.',
            next: 'h3b',
            reaction: { expression: 'unimpressed', animation: 'idle', intensity: 0.3 }
          }
        ],
        next: 'h3b'
      },
      {
        id: 'h3a',
        text: 'Bold. Stupid, but bold.',
        speaker: 'bakasur',
        position: 'below',
        reaction: { expression: 'excited', animation: 'burst', intensity: 0.85 }
      },
      {
        id: 'h3b',
        text: 'Cowardice. Noted.',
        speaker: 'bakasur',
        position: 'below',
        reaction: { expression: 'deadpan', animation: 'idle', intensity: 0.2 }
      }
    ]
  },

  'bakasur-success': {
    id: 'bakasur-success',
    name: 'Success',
    description: 'The thing worked — proud arc, alert interlude, warm close.',
    personality: 'excited',
    first: 'u1',
    tags: ['success'],
    lines: [
      {
        id: 'u1',
        text: 'Wait — that worked?',
        speaker: 'bakasur',
        position: 'above',
        reaction: { preset: 'bakasur-alert' },
        next: 'u2'
      },
      {
        id: 'u2',
        text: 'IT WORKED.',
        speaker: 'bakasur',
        position: 'below',
        emphasis: true,
        entrance: 'rise',
        reaction: { expression: 'laughing', animation: 'orbit', intensity: 0.95 },
        next: 'u3'
      },
      {
        id: 'u3',
        text: 'You did well. For a mortal.',
        speaker: 'bakasur',
        position: 'below',
        style: 'whisper',
        reaction: { expression: 'proud', animation: 'egg', intensity: 0.6 }
      }
    ]
  }
}

export const SEQUENCE_IDS = Object.keys(DIALOGUE_SEQUENCES)

export function getDialogueSequence(id: string): DialogueSequence {
  return DIALOGUE_SEQUENCES[id] ?? DIALOGUE_SEQUENCES['bakasur-greeting']!
}

export function listDialogueSequences(): DialogueSequence[] {
  return SEQUENCE_IDS.map((id) => DIALOGUE_SEQUENCES[id]!)
}
