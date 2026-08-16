import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useApiClient } from '../../api/authFetch';
import {
  Dumbbell, GraduationCap, Flower2, Rocket, Check, Loader2, Sparkles,
} from 'lucide-react';

/**
 * First-run setup for a fresh authenticated (Google) user.
 *
 * A brand-new account has an empty D1: instead of dropping the user into an
 * empty app, show a one-click persona picker. Choosing a persona seeds starter
 * habits, tasks and a journal entry DIRECTLY through the Worker's REST tools
 * (POST /api/v1/tools/create_habit|create_task|journal_today) under the
 * authenticated sub. "Skip" leaves the account empty.
 */

type PersonaId = 'builder' | 'student' | 'mindful' | 'skip';

// Canonical v2 priority: int 0-5, default 0 (platform/src/domain/schemas.ts
// TaskPriority = z.number().int().min(0).max(5).default(0)).
const PRIORITY: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 2, high: 3 };

interface Persona {
  id: PersonaId;
  title: string;
  tagline: string;
  icon: React.ElementType;
  color: string;
  habits: { name: string; target: number; period: 'day' | 'week' | 'month' }[];
  tasks: { title: string; body: string; tags?: string[]; priority?: number }[];
  journal: { entry: string; mood: number };
}

const PERSONAS: Persona[] = [
  {
    id: 'builder',
    title: 'Builder',
    tagline: 'Gym, reading, sleep — build the classics.',
    icon: Dumbbell,
    color: 'var(--arcade-red)',
    habits: [
      { name: 'Morning Workout', target: 1, period: 'day' },
      { name: 'Read 10 Pages', target: 10, period: 'day' },
      { name: 'Sleep 7+ Hours', target: 7, period: 'day' },
    ],
    tasks: [
      { title: 'Set up my daily routine', body: 'Plan a 30-minute morning routine.', priority: PRIORITY.high },
      { title: 'Review weekly goals', body: 'Look back at the week and set next targets.' },
    ],
    journal: { entry: 'First day with BakaTracker — building the system.', mood: 4 },
  },
  {
    id: 'student',
    title: 'Student',
    tagline: 'Study blocks, revision loops, focus.',
    icon: GraduationCap,
    color: 'var(--arcade-cobalt)',
    habits: [
      { name: 'Study Session', target: 1, period: 'day' },
      { name: 'Revise Notes', target: 1, period: 'day' },
      { name: 'No-Phone Focus Hours', target: 2, period: 'day' },
    ],
    tasks: [
      { title: 'Plan study schedule', body: 'Block out deep-work sessions for this week.', priority: PRIORITY.high },
      { title: 'Summarise last lecture', body: 'Write a one-page active recall summary.' },
    ],
    journal: { entry: 'First study day with BakaTracker — staying consistent.', mood: 3 },
  },
  {
    id: 'mindful',
    title: 'Mindful',
    tagline: 'Meditation, journaling, nature.',
    icon: Flower2,
    color: 'var(--arcade-green)',
    habits: [
      { name: 'Meditate', target: 10, period: 'day' },
      { name: 'Journal', target: 1, period: 'day' },
      { name: 'Nature Walk', target: 1, period: 'day' },
    ],
    tasks: [
      { title: 'Set up a calm morning', body: 'Design a slow, intentional morning.', priority: PRIORITY.medium },
      { title: 'Plan digital sunset', body: 'No screens for one hour before bed.' },
    ],
    journal: { entry: 'Starting a mindful practice with BakaTracker.', mood: 4 },
  },
];

export const FirstRunSetup: React.FC = () => {
  const navigate = useNavigate();
  const apiClient = useApiClient();
  const init = useStore((s) => s.init);
  const [busy, setBusy] = useState<PersonaId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seedPersona = async (persona: Persona) => {
    setBusy(persona.id);
    setError(null);
    try {
      // 1) Habits — via the Tool Registry REST transport (same tools as MCP/AI).
      for (const h of persona.habits) {
        await apiClient.post(`/api/v1/tools/create_habit`, { name: h.name, target: h.target, period: h.period });
      }
      // 2) Tasks
      for (const t of persona.tasks) {
        await apiClient.post(`/api/v1/tools/create_task`, {
          title: t.title,
          body: t.body ?? '',
          tags: t.tags ?? [],
          priority: t.priority ?? PRIORITY.medium,
        });
      }
      // 3) Journal seed for today (one entry)
      await apiClient.post(`/api/v1/tools/journal_today`, { entry: persona.journal.entry, mood: persona.journal.mood });

      // Mark onboarding complete and reload from D1 so the app shows the seeds.
      localStorage.setItem('bt_first_run', 'done');
      await init(apiClient);
      navigate('/today', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed — try again.');
    } finally {
      setBusy(null);
    }
  };

  const skip = async () => {
    localStorage.setItem('bt_first_run', 'done');
    setBusy('skip');
    navigate('/today', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--arcade-void)', position: 'relative', zIndex: 1 }}>
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-xs uppercase tracking-widest mb-4 chip chip--gold">
            <Sparkles className="w-3.5 h-3.5" /> First Run
          </div>
          <h1 className="marquee-title text-3xl md:text-4xl m-0" style={{ color: 'var(--arcade-paper)' }}>
            How do you want to start?
          </h1>
          <p className="mt-3 font-mono text-sm max-w-md mx-auto" style={{ color: 'var(--arcade-paper-muted)' }}>
            Pick a starting pack — habits, tasks and a journal seed get created for your account. You can change everything later.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const isBusy = busy === p.id;
            return (
              <button
                key={p.id}
                onClick={() => seedPersona(p)}
                disabled={busy !== null}
                className="cabinet cabinet--playing p-5 text-left transition hover:scale-[1.02] cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                style={{ '--marquee-color': p.color } as React.CSSProperties}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}44` }}
                >
                  {isBusy ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: p.color }} /> : <Icon className="w-5 h-5" style={{ color: p.color }} />}
                </div>
                <h3 className="marquee-title text-base flex items-center gap-1.5 m-0" style={{ color: 'var(--arcade-paper)' }}>
                  {p.title}
                  <Check className="w-4 h-4" style={{ color: p.color }} aria-hidden="true" />
                </h3>
                <p className="font-mono text-xs mt-1 leading-relaxed m-0" style={{ color: 'var(--arcade-paper-muted)' }}>{p.tagline}</p>
                <div className="mt-3 space-y-1">
                  {p.habits.map((h) => (
                    <div key={h.name} className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.color }} aria-hidden="true" />
                      {h.name} · {h.target}/{h.period}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-center font-mono text-xs text-danger m-0">{error}</p>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={skip}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 font-mono text-xs cursor-pointer disabled:opacity-50 transition hover:text-arcade-gold"
            style={{ color: 'var(--arcade-paper-muted)' }}
          >
            <Rocket className="w-3.5 h-3.5" />
            Skip — start with an empty tracker
          </button>
        </div>
      </div>
    </div>
  );
};
