import React from 'react';
import { PixelIcon, SystemLabel } from '../ui';
import type { JournalEntry } from '../../types';

type Mood = JournalEntry['mood'];

const MOODS: { value: Mood; label: string; icon: string; tone: 'danger' | 'muted' | 'success' | 'primary' }[] = [
  { value: '😞', label: 'Low', icon: 'frown', tone: 'danger' },
  { value: '😐', label: 'Neutral', icon: 'meh', tone: 'muted' },
  { value: '🙂', label: 'Good', icon: 'smile', tone: 'success' },
  { value: '😄', label: 'Great', icon: 'smile', tone: 'primary' },
];

export interface JournalMoodSelectorProps {
  value: Mood;
  onChange: (mood: Mood) => void;
}

export const JournalMoodSelector: React.FC<JournalMoodSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col gap-2">
      <SystemLabel tone="muted">MOOD</SystemLabel>
      <div className="flex gap-2" role="group" aria-label="Select mood">
        {MOODS.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(value === m.value ? '' : m.value)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105 border ${
              value === m.value
                ? 'border-[var(--bt-primary)] bg-[var(--bt-primary)]/10'
                : 'border-[var(--bt-border-soft)] bg-[var(--bt-bg-elevated)]'
            }`}
            style={{
              boxShadow: value === m.value ? '0 0 12px rgba(139,92,246,0.2)' : 'none',
            }}
            aria-label={`Mood: ${m.label}`}
            aria-pressed={value === m.value}
          >
            <PixelIcon name={m.icon as never} size={18} color={value === m.value ? 'var(--bt-primary-bright)' : 'var(--bt-text-muted)'} />
            <span className="font-mono text-[9px] font-bold" style={{ color: value === m.value ? 'var(--bt-primary-bright)' : 'var(--bt-text-muted)' }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
