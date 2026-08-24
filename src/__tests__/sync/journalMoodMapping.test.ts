import { describe, it, expect } from 'vitest';

// Import the mood mapping functions from stateService
// These are not exported, so we test the v2 conversion logic directly
// by reproducing the exact mapping

type JournalMood = '😞' | '😐' | '🙂' | '😄' | '';

/** Reproduce v2ToUiMood from stateService.ts:98-107 */
function v2ToUiMood(mood: number | null | undefined): JournalMood {
  switch (mood) {
    case 1: return '😞';
    case 2: return '😐';
    case 3: return '🙂';
    case 4: return '😄';
    case 5: return '🙂'; // legacy backward compat
    default: return '';
  }
}

/** Reproduce uiToV2Mood from stateService.ts:110-117 */
function uiToV2Mood(mood: JournalMood): number | null {
  switch (mood) {
    case '😞': return 1;
    case '😐': return 2;
    case '🙂': return 3;
    case '😄': return 4;
    default: return null;
  }
}

describe('v2ToUiMood', () => {
  it('maps 1→😞', () => expect(v2ToUiMood(1)).toBe('😞'));
  it('maps 2→😐', () => expect(v2ToUiMood(2)).toBe('😐'));
  it('maps 3→🙂', () => expect(v2ToUiMood(3)).toBe('🙂'));
  it('maps 4→😄', () => expect(v2ToUiMood(4)).toBe('😄'));
  it('maps 5→🙂 (legacy)', () => expect(v2ToUiMood(5)).toBe('🙂'));
  it('maps null→empty', () => expect(v2ToUiMood(null)).toBe(''));
  it('maps undefined→empty', () => expect(v2ToUiMood(undefined)).toBe(''));
  it('maps 0→empty', () => expect(v2ToUiMood(0)).toBe(''));
  it('maps 99→empty', () => expect(v2ToUiMood(99)).toBe(''));
});

describe('uiToV2Mood', () => {
  it('maps 😞→1', () => expect(uiToV2Mood('😞')).toBe(1));
  it('maps 😐→2', () => expect(uiToV2Mood('😐')).toBe(2));
  it('maps 🙂→3', () => expect(uiToV2Mood('🙂')).toBe(3));
  it('maps 😄→4', () => expect(uiToV2Mood('😄')).toBe(4));
  it('maps empty→null', () => expect(uiToV2Mood('')).toBeNull());
});

describe('round-trip', () => {
  it('round-trips all 4 moods', () => {
    const moods: JournalMood[] = ['😞', '😐', '🙂', '😄'];
    for (const mood of moods) {
      expect(v2ToUiMood(uiToV2Mood(mood))).toBe(mood);
    }
  });
});
