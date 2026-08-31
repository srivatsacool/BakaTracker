import React from 'react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { getTodayDateString } from '../../lib/utils';
import { SystemLabel } from '../ui';
import {
  HABIT_PRESETS, MOOD_FACES, SLEEP_RANGE, WATER_RANGE, WORKOUT_BODY_PARTS,
  WORKOUT_MAX_MINUTES, decodeReading, decodeWorkout, encodeReading, encodeWorkout,
  type ReadingValue,
} from '../../lib/habitPresets';
import type { Habit, HabitLog } from '../../types';

/*
 * BAKATRACKER V3.5 — Habit instruments (Phase 5)
 *
 * Preset habits record values through instrument-style controls, not generic
 * forms. Every control keeps the darkglass semantics: violet focus, restrained
 * fills, mono readouts, ≥44px touch targets. The PRESET definitions are
 * immutable — these UIs record values only; identity/type/semantics live in
 * lib/habitPresets and cannot be edited here.
 */

interface InstrumentProps {
  habit: Habit
  log: HabitLog | undefined
  disabled?: boolean
}

const rowCls = 'flex flex-wrap items-center gap-2'

/* ---- MOOD: five faces, one tap ---- */
export const MoodInstrument: React.FC<InstrumentProps> = ({ habit, log, disabled }) => {
  const setHabitValue = useStore(s => s.setHabitValue)
  const today = getTodayDateString()
  const current = typeof log?.value === 'string' ? log.value : ''
  return (
    <div className={rowCls} role="radiogroup" aria-label={`${habit.name} mood`}>
      {MOOD_FACES.map(face => {
        const active = current === face
        return (
          <button
            key={face}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => void setHabitValue(habit.id, today, active ? '' : face)}
            className="w-11 h-11 rounded-xl text-xl transition cursor-pointer disabled:opacity-40"
            style={{
              background: active ? 'rgba(139,92,246,0.18)' : 'rgba(233,230,242,0.04)',
              border: `1px solid ${active ? 'rgba(139,92,246,0.55)' : 'rgba(233,230,242,0.08)'}`,
              boxShadow: active ? '0 0 12px rgba(139,92,246,0.25)' : 'none',
              transform: active ? 'scale(1.08)' : undefined,
            }}
            aria-label={`Mood ${face}`}
          >
            {face}
          </button>
        )
      })}
    </div>
  )
}

/* ---- Water / Sleep: labeled sliders with mono readouts ---- */
const SliderInstrument: React.FC<InstrumentProps & {
  min: number; max: number; step: number; unit: string; label: string; accent: string
}> = ({ habit, log, disabled, min, max, step, unit, label, accent }) => {
  const setHabitValue = useStore(s => s.setHabitValue)
  const today = getTodayDateString()
  const value = typeof log?.value === 'number' ? log.value : min
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <SystemLabel tone="muted">{label}</SystemLabel>
        <span className="font-mono text-sm font-bold" style={{ color: value > min ? accent : 'var(--bt-text-muted)' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        disabled={disabled}
        aria-label={`${habit.name}: ${value}${unit}`}
        onChange={e => void setHabitValue(habit.id, today, Number(e.target.value))}
        className="baksur-slider w-full"
        style={{ '--slider-pct': `${pct}%`, '--slider-accent': accent } as React.CSSProperties}
      />
      <div className="flex justify-between font-mono text-[9px]" style={{ color: 'var(--bt-text-disabled)' }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

export const WaterInstrument: React.FC<InstrumentProps> = (p) =>
  <SliderInstrument {...p} min={WATER_RANGE.min} max={WATER_RANGE.max} step={WATER_RANGE.step} unit={WATER_RANGE.unit} label="LITERS TODAY" accent="var(--obs-cobalt, #3f7bff)" />

export const SleepInstrument: React.FC<InstrumentProps> = (p) =>
  <SliderInstrument {...p} min={SLEEP_RANGE.min} max={SLEEP_RANGE.max} step={SLEEP_RANGE.step} unit={SLEEP_RANGE.unit} label="HOURS" accent="var(--arcade-gold, #e8b45a)" />

/* ---- READING: minutes-vs-pages mode + amount ---- */
export const ReadingInstrument: React.FC<InstrumentProps> = ({ habit, log, disabled }) => {
  const setHabitValue = useStore(s => s.setHabitValue)
  const today = getTodayDateString()
  const decoded = decodeReading(log?.value) ?? { mode: 'minutes', amount: 0 } as ReadingValue
  // Draft state keys off the log value: when the log changes (record/clear,
  // day rollover) the draft re-derives during render — no sync effect needed.
  const logKey = String(log?.value ?? '')
  const [draftState, setDraftState] = React.useState<{ key: string; value: ReadingValue }>({ key: logKey, value: decoded })
  const draft: ReadingValue = draftState.key === logKey ? draftState.value : decoded
  const commit = (next: ReadingValue) => {
    setDraftState({ key: logKey, value: next })
    void setHabitValue(habit.id, today, next.amount > 0 ? encodeReading(next) : '')
  }
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className={rowCls} role="group" aria-label="Reading unit">
        {(['minutes', 'pages'] as const).map(mode => (
          <button key={mode} type="button" disabled={disabled}
            aria-pressed={draft.mode === mode}
            onClick={() => commit({ ...draft, mode })}
            className="font-mono text-[10px] uppercase px-3 py-2 rounded-lg cursor-pointer transition disabled:opacity-40"
            style={{
              background: draft.mode === mode ? 'rgba(139,92,246,0.16)' : 'rgba(233,230,242,0.04)',
              border: `1px solid ${draft.mode === mode ? 'rgba(139,92,246,0.5)' : 'rgba(233,230,242,0.08)'}`,
              color: draft.mode === mode ? 'var(--bt-text)' : 'var(--bt-text-muted)',
            }}>
            {mode === 'minutes' ? 'MIN' : 'PAGES'}
          </button>
        ))}
        <input
          type="number" min={0} max={draft.mode === 'minutes' ? 600 : 2000} step={1}
          value={draft.amount || ''} placeholder="0" disabled={disabled}
          aria-label={`Reading ${draft.mode}`}
          onChange={e => commit({ mode: draft.mode, amount: Math.max(0, Number(e.target.value) || 0) })}
          className="arcade-input !text-xs w-24 !py-2 font-mono"
        />
      </div>
      <SystemLabel tone="muted" className="text-[9px]">
        {decoded.amount > 0 ? `${decoded.amount} ${decoded.mode} logged` : 'nothing logged today'}
      </SystemLabel>
    </div>
  )
}

/* ---- WORKOUT: body-part radios + duration slider (max 180m) ---- */
export const WorkoutInstrument: React.FC<InstrumentProps> = ({ habit, log, disabled }) => {
  const setHabitValue = useStore(s => s.setHabitValue)
  const today = getTodayDateString()
  const decoded = decodeWorkout(log?.value)
  const part = decoded?.part ?? 'back'
  const mins = decoded?.minutes ?? 0
  const commit = (nextPart: string, nextMins: number) =>
    void setHabitValue(habit.id, today, nextMins > 0 ? encodeWorkout(nextPart as never, nextMins) : '')
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Body part">
        {WORKOUT_BODY_PARTS.map(bp => {
          const active = (decoded?.part ?? '') === bp.id
          return (
            <button key={bp.id} type="button" role="radio" aria-checked={active} disabled={disabled}
              onClick={() => commit(bp.id, decoded ? decoded.minutes : 30)}
              className="font-mono text-[10px] uppercase px-2.5 py-2.5 rounded-lg cursor-pointer transition disabled:opacity-40"
              style={{
                background: active ? 'rgba(61,220,132,0.14)' : 'rgba(233,230,242,0.04)',
                border: `1px solid ${active ? 'rgba(61,220,132,0.5)' : 'rgba(233,230,242,0.08)'}`,
                color: active ? 'var(--bt-success)' : 'var(--bt-text-muted)',
                minWidth: 44, minHeight: 44,
              }}>
              {bp.label}
            </button>
          )
        })}
      </div>
      {decoded && (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between">
            <SystemLabel tone="muted">DURATION · {decoded.part.toUpperCase()}</SystemLabel>
            <span className="font-mono text-sm font-bold" style={{ color: 'var(--obs-coral, #f87171)' }}>{mins}m</span>
          </div>
          <input
            type="range" min={5} max={WORKOUT_MAX_MINUTES} step={5} value={mins}
            disabled={disabled}
            aria-label={`Workout duration: ${mins} minutes`}
            onChange={e => commit(part, Number(e.target.value))}
            className="baksur-slider w-full"
            style={{ '--slider-pct': `${(mins / WORKOUT_MAX_MINUTES) * 100}%`, '--slider-accent': 'var(--obs-coral, #f87171)' } as React.CSSProperties}
          />
          <div className="flex justify-between font-mono text-[9px]" style={{ color: 'var(--bt-text-disabled)' }}>
            <span>5m</span><span>180m max</span>
          </div>
        </div>
      )}
      {!decoded && <SystemLabel tone="muted" className="text-[9px]">pick a body part to start a session</SystemLabel>}
    </div>
  )
}

/* ---- The preset catalog (Add presets strip on the Habits page) ---- */
export const PresetCatalog: React.FC = () => {
  const habits = useStore(useShallow(s => s.habits))
  const addPresetHabit = useStore(s => s.addPresetHabit)
  const missing = HABIT_PRESETS.filter(p => !habits.some(h => h.preset === p.id))
  if (missing.length === 0) return null
  return (
    <section aria-label="Preset habits" className="flex flex-col gap-2">
      <SystemLabel tone="muted">PRESETS — one tap, fixed identity</SystemLabel>
      <div className="flex flex-wrap gap-2">
        {missing.map(p => (
          <button key={p.id} type="button" onClick={() => void addPresetHabit(p.id)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition hover:scale-[1.02]"
            style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)' }}
            aria-label={`Add ${p.name} preset`} title={p.blurb}>
            <span aria-hidden="true">{p.icon}</span>
            <span className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-dim)' }}>{p.name}</span>
            <span className="font-mono text-[9px]" style={{ color: 'var(--bt-text-muted)' }}>+{p.xp} XP</span>
          </button>
        ))}
      </div>
    </section>
  )
}
