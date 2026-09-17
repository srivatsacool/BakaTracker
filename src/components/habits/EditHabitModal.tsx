import React, { useState, useEffect } from 'react';
import type { Habit, StatType } from '../../types';
import { PixelIcon, SystemLabel } from '../ui';

interface EditHabitModalProps {
  habit: Habit;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Omit<Habit, 'id' | 'created_at'>>) => void;
  onArchive?: () => void;
}

const STAT_OPTIONS: { id: StatType; label: string; icon: string; color: string }[] = [
  { id: 'discipline', label: 'DISCIPLINE', icon: 'sword', color: 'var(--obs-coral, #f87171)' },
  { id: 'health', label: 'HEALTH', icon: 'fire', color: 'var(--obs-teal, #3dca84)' },
  { id: 'knowledge', label: 'KNOWLEDGE', icon: 'book', color: 'var(--obs-cobalt, #3f7bff)' },
  { id: 'creativity', label: 'CREATIVITY', icon: 'brush', color: 'var(--obs-rose, #fb7185)' },
  { id: 'career', label: 'CAREER', icon: 'briefcase', color: 'var(--obs-amber, #f59e0b)' },
];

const EMOJI_SUGGESTIONS = ['💪', '📖', '🧘', '🏃', '💧', '🌙', '🎯', '⚡', '☕', '🎨', '✍️', '🧠', '🥗', '🚶', '🔋'];

export const EditHabitModal: React.FC<EditHabitModalProps> = ({
  habit,
  isOpen,
  onClose,
  onSave,
  onArchive,
}) => {
  const [name, setName] = useState(habit.name);
  const [icon, setIcon] = useState(habit.icon);
  const [stat, setStat] = useState<StatType>(habit.stat);
  const [xp, setXp] = useState(habit.xp);
  const [targetVal, setTargetVal] = useState<number | ''>(habit.target?.value ?? '');
  const [targetUnit, setTargetUnit] = useState(habit.target?.unit ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(habit.name);
      setIcon(habit.icon);
      setStat(habit.stat);
      setXp(habit.xp);
      setTargetVal(habit.target?.value ?? '');
      setTargetUnit(habit.target?.unit ?? '');
      setError(null);
    }
  }, [isOpen, habit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Habit name cannot be empty');
      return;
    }
    const xpNum = Number(xp);
    if (Number.isNaN(xpNum) || xpNum <= 0) {
      setError('XP reward must be greater than 0');
      return;
    }

    const updates: Partial<Omit<Habit, 'id' | 'created_at'>> = {
      name: name.trim(),
      icon: icon.trim() || '💪',
      stat,
      xp: xpNum,
    };

    if (typeof targetVal === 'number' && targetVal > 0) {
      updates.target = {
        value: targetVal,
        unit: targetUnit.trim() || 'units',
      };
    } else {
      updates.target = undefined;
    }

    onSave(updates);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-2xl p-6 w-full max-w-md border shadow-2xl animate-fade-in"
        style={{ borderColor: 'rgba(233,230,242,0.12)', background: 'var(--obs-black, #0d0c13)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">{icon}</span>
            <div>
              <h2 className="font-bold text-base m-0" style={{ color: 'var(--bt-text)' }}>
                Edit Habit
              </h2>
              <SystemLabel tone="muted" className="text-[10px]">
                {habit.preset ? 'Preset Habit' : `${habit.type.toUpperCase()} HABIT`}
              </SystemLabel>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-sm cursor-pointer"
            style={{ color: 'var(--bt-text-muted)', background: 'rgba(233,230,242,0.05)' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            className="p-2.5 rounded-lg mb-4 text-xs font-mono"
            style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--bt-danger)', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase font-bold" style={{ color: 'var(--bt-text-muted)' }}>
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Workout"
              className="arcade-input w-full !text-sm"
              autoFocus
            />
          </div>

          {/* Icon picker */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase font-bold" style={{ color: 'var(--bt-text-muted)' }}>
              Icon / Emoji
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="arcade-input w-16 text-center !text-lg"
                maxLength={4}
              />
              <div className="flex flex-wrap gap-1 flex-1">
                {EMOJI_SUGGESTIONS.slice(0, 8).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className="w-8 h-8 rounded-lg text-sm flex items-center justify-center cursor-pointer transition hover:scale-110"
                    style={{
                      background: icon === emoji ? 'rgba(139,92,246,0.2)' : 'rgba(233,230,242,0.04)',
                      border: `1px solid ${icon === emoji ? 'rgba(139,92,246,0.5)' : 'rgba(233,230,242,0.06)'}`,
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stat Category */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase font-bold" style={{ color: 'var(--bt-text-muted)' }}>
              Attribute Impact
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {STAT_OPTIONS.map((opt) => {
                const isSelected = stat === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStat(opt.id)}
                    className="flex items-center gap-1.5 p-2 rounded-xl text-left cursor-pointer transition"
                    style={{
                      background: isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(233,230,242,0.03)',
                      border: `1px solid ${isSelected ? 'rgba(139,92,246,0.5)' : 'rgba(233,230,242,0.06)'}`,
                    }}
                  >
                    <PixelIcon name={opt.icon as never} size={14} color={isSelected ? opt.color : 'var(--bt-text-disabled)'} />
                    <span className="font-mono text-[10px] font-bold" style={{ color: isSelected ? 'var(--bt-text)' : 'var(--bt-text-muted)' }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Base XP Reward */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase font-bold" style={{ color: 'var(--bt-text-muted)' }}>
              Base XP Reward
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={xp}
                onChange={(e) => setXp(Number(e.target.value))}
                className="arcade-input w-28 font-mono !text-sm"
              />
              <span className="font-mono text-xs" style={{ color: 'var(--obs-gold, #e8b45a)' }}>
                +{xp} XP per completion
              </span>
            </div>
          </div>

          {/* Daily Target (for counter / numeric) */}
          {(habit.type === 'counter' || habit.type === 'numeric' || habit.type === 'reading') && (
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase font-bold" style={{ color: 'var(--bt-text-muted)' }}>
                Daily Target (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={targetVal}
                  onChange={(e) => setTargetVal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 20"
                  className="arcade-input w-24 font-mono !text-sm"
                />
                <input
                  type="text"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="unit (e.g. pages, mins)"
                  className="arcade-input flex-1 font-mono !text-sm"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: 'rgba(233,230,242,0.06)' }}>
            {onArchive ? (
              <button
                type="button"
                onClick={() => {
                  onArchive();
                  onClose();
                }}
                className="font-mono text-[11px] px-3 py-2 rounded-lg cursor-pointer transition hover:bg-[rgba(248,113,113,0.1)]"
                style={{ color: 'var(--bt-text-muted)', border: '1px solid rgba(233,230,242,0.08)' }}
              >
                {habit.archived ? 'Unarchive' : 'Archive'}
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost !text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="insert-coin !text-xs px-5 py-2 font-mono uppercase font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
