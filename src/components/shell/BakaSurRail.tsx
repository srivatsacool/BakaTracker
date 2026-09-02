import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../../features/auth';
import { useApiClient } from '../../api/authFetch';
import { getTodayDateString, isHabitCompleted } from '../../lib/utils';
import { calculateHabitStreak } from '../../services/habits/calculateHabitStreak';
import { PixelIcon, PixelBadge, TerminalText } from '../ui';
import { useBakaSurBusyReporter, useBakaSurPrefs, useBakaSurPresenceSlot } from './bakaSurPresenceContext';
import { BAKASUR_COLOR_HEXES, railSizeFor } from '../../lib/baksurPreferences';
import { baksurLine, type BakaSurEnvironment, type BakaSurIntent } from '../../lib/baksurMessages';
import { sendAssistantChat, fetchAiQuota, getGuestRemaining, isGuestQuotaExhausted } from '../../services/assistantChat';
import type { ChatResult } from '../../services/assistantChat';
import {
  ONBOARDING_STEPS,
  loadOnboardingState,
  persistSoulUpdate,
} from '../../lib/soulOnboarding';
import type { Habit, HabitLog, JournalEntry, Task, UserStats } from '../../types';

interface Message {
  id: number;
  role: 'assistant' | 'user';
  content: string;
  source?: string;
}

interface BakaSurRailProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface SuggestionPrompt {
  label: string;
  prompt: string;
}

interface RouteSuggestions {
  insight: string;
  prompts: SuggestionPrompt[];
}

const routeNames: Record<string, string> = {
  '/today': 'Today focus',
  '/habits': 'Habits',
  '/tasks': 'Task planner',
  '/eisenhower': 'Priority matrix',
  '/journal': 'Journal',
  '/journey': 'Journey analytics',
  '/notes': 'Notes library',
};

const plural = (count: number) => (count === 1 ? '' : 's');

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** The highest-priority open quest starred for today: a Doing item first,
 *  then highest XP. Derivable, honest — never fabricated. */
function topOpenTodayQuest(tasks: Task[]): Task | undefined {
  return tasks
    .filter(task => task.today && task.status !== 'done')
    .sort((a, b) => Number(b.status === 'doing') - Number(a.status === 'doing') || b.xp - a.xp)[0];
}

/** Active habits with a live streak that has not been logged today. */
function habitsAtRisk(habits: Habit[], habitLogs: HabitLog[]): { habit: Habit; streak: number }[] {
  const today = getTodayDateString();
  const logsToday = habitLogs.filter(log => log.date === today);
  return habits
    .filter(habit => habit.active)
    .map(habit => ({ habit, streak: calculateHabitStreak(habit, habitLogs) }))
    .filter(x => x.streak > 0 && !isHabitCompleted(x.habit, logsToday.find(log => log.habit_id === x.habit.id)))
    .sort((a, b) => b.streak - a.streak);
}

/** How many active habits are already done today. */
function doneHabitsToday(habits: Habit[], habitLogs: HabitLog[]): number {
  const today = getTodayDateString();
  const logsToday = habitLogs.filter(log => log.date === today);
  return habits.filter(habit => habit.active && isHabitCompleted(habit, logsToday.find(log => log.habit_id === habit.id))).length;
}

/**
 * Route-aware contextual suggestions (UX gap #3). Every number is derived
 * from the real store slices — the rule is: never fabricate. When the data
 * is empty the suggestions fall back to onboarding-style prompts.
 * Labels state the derived fact; clicking one asks BakaSur the matching
 * question (the chat contract itself is unchanged).
 */
function buildRouteSuggestions(route: string, data: { tasks: Task[]; habits: Habit[]; habitLogs: HabitLog[]; journal: JournalEntry[]; stats: UserStats }): RouteSuggestions {
  const today = getTodayDateString();
  const openTasks = data.tasks.filter(task => task.status !== 'done');
  const openTodayCount = data.tasks.filter(task => task.today && task.status !== 'done').length;
  const dueToday = openTasks.filter(task => task.due_date === today);
  const overdue = openTasks.filter(task => task.due_date && task.due_date < today);
  const topQuest = topOpenTodayQuest(data.tasks);
  const atRisk = habitsAtRisk(data.habits, data.habitLogs);
  const activeCount = data.habits.filter(habit => habit.active).length;
  const doneToday = doneHabitsToday(data.habits, data.habitLogs);
  const journalToday = data.journal.find(entry => entry.date === today);
  const doFirst = openTasks.filter(task => task.quadrant === 'do');
  const startPrompt: SuggestionPrompt = { label: 'Start with one quest', prompt: 'What should I focus on today?' };

  switch (route) {
    case '/today': {
      if (topQuest) {
        return {
          insight: `${openTodayCount} quest${plural(openTodayCount)} today · top quest +${topQuest.xp} XP`,
          prompts: [
            {
              label: `Your most important quest: “${truncate(topQuest.title, 42)}”`,
              prompt: `My most important quest today is “${topQuest.title}”. Help me plan the first step.`,
            },
            openTodayCount > 1
              ? { label: `Order my ${openTodayCount} quests`, prompt: `Help me order my ${openTodayCount} quests for today.` }
              : { label: 'What should I do next?', prompt: 'What should I do next?' },
          ],
        };
      }
      if (data.tasks.length > 0) {
        return {
          insight: 'Nothing starred for today',
          prompts: [{ label: 'Star a quest for today', prompt: 'Which of my open quests should I star for today?' }],
        };
      }
      return { insight: 'The ledger is quiet', prompts: [startPrompt] };
    }
    case '/tasks': {
      const prompts: SuggestionPrompt[] = [];
      if (openTasks.length > 0) prompts.push({ label: `You have ${openTasks.length} open quest${plural(openTasks.length)}`, prompt: `Help me prioritize my ${openTasks.length} open quests.` });
      if (dueToday.length > 0) prompts.push({ label: `${dueToday.length} due today`, prompt: `Which of my ${dueToday.length} quests due today should I do first?` });
      if (overdue.length > 0) prompts.push({ label: `${overdue.length} overdue`, prompt: `What should I do about my ${overdue.length} overdue quests?` });
      if (prompts.length === 0) return { insight: 'No open quests', prompts: [startPrompt] };
      const bits = [
        openTasks.length > 0 && `${openTasks.length} open`,
        dueToday.length > 0 && `${dueToday.length} due today`,
        overdue.length > 0 && `${overdue.length} overdue`,
      ].filter((bit): bit is string => Boolean(bit));
      return { insight: bits.join(' · '), prompts };
    }
    case '/habits': {
      if (atRisk.length > 0) {
        const top = atRisk[0];
        return {
          insight: `${doneToday} of ${activeCount} habits done today`,
          prompts: [{
            label: `“${truncate(top.habit.name, 26)}” streak at risk`,
            prompt: `My “${top.habit.name}” streak (${top.streak} days) is at risk. How do I keep it alive today?`,
          }],
        };
      }
      if (activeCount > 0) {
        return {
          insight: `${doneToday} of ${activeCount} habits done today`,
          prompts: doneToday > 0
            ? [{ label: `${doneToday} habit${plural(doneToday)} done today`, prompt: 'How am I doing with my habits today?' }]
            : [{ label: 'Log your first habit of the day', prompt: 'Which habit should I log first today?' }],
        };
      }
      return { insight: 'No habits yet', prompts: [{ label: 'Start with one habit', prompt: 'What habit should I start with?' }] };
    }
    case '/journal': {
      if (journalToday?.highlight?.trim()) {
        return {
          insight: 'Highlight logged for today',
          prompts: [{
            label: 'Reflect on your highlight from today',
            prompt: `Help me reflect on today's highlight: “${truncate(journalToday.highlight, 90)}”.`,
          }],
        };
      }
      if (data.journal.length > 0) {
        return {
          insight: `${data.journal.length} entr${data.journal.length === 1 ? 'y' : 'ies'} · none today`,
          prompts: [{ label: 'End the day with one sentence', prompt: 'Help me write today’s journal highlight.' }],
        };
      }
      return { insight: 'No entries yet', prompts: [{ label: 'Write your first highlight', prompt: 'How should I start journaling?' }] };
    }
    case '/notes': {
      return {
        insight: 'Notes live on your instance',
        prompts: [
          { label: 'Turn this page into quests?', prompt: 'Turn my notes into actionable quests.' },
          { label: 'What should I focus on today?', prompt: 'What should I focus on today?' },
        ],
      };
    }
    case '/eisenhower': {
      if (doFirst.length > 0) {
        return {
          insight: `${doFirst.length} in Do First`,
          prompts: [{ label: `Work through your ${doFirst.length} Do First quest${plural(doFirst.length)}`, prompt: `Help me work through my ${doFirst.length} Do First quests.` }],
        };
      }
      if (openTasks.length > 0) {
        return { insight: `${openTasks.length} open quest${plural(openTasks.length)} · none assigned`, prompts: [{ label: 'Assign your quests to quadrants', prompt: 'Which of my open quests belong in Do First?' }] };
      }
      return { insight: 'No quests yet', prompts: [startPrompt] };
    }
    case '/journey': {
      return {
        insight: `Level ${data.stats.level} · ${data.stats.xp} XP`,
        prompts: [{ label: 'What is my journey saying this week?', prompt: 'What does my journey data say about this week?' }],
      };
    }
    default: {
      return {
        insight: openTasks.length > 0 ? `${openTasks.length} open quest${plural(openTasks.length)}` : 'Ready when you are',
        prompts: [startPrompt],
      };
    }
  }
}

/** Keyword → scripted intent. Deterministic, no LLM, no guessing. */
function classifyIntent(question: string): BakaSurIntent {
  const q = question.toLowerCase();
  if (q.includes('overdue') || q.includes('late')) return 'ask_habits';
  if (q.includes('habit') || q.includes('streak') || q.includes('check in') || q.includes('check-in')) return 'ask_habits';
  if (q.includes('journal') || q.includes('reflect') || q.includes('highlight') || q.includes('mood') || q.includes('feel')) return 'ask_journal';
  if (q.includes('level') || q.includes(' xp') || q.startsWith('xp') || q.includes('stat') || q.includes('progress') || q.includes('journey')) return 'ask_stats';
  if (q.includes('note')) return 'ask_notes';
  if (q.includes('focus') || q.includes('today') || q.includes('priorit') || q.includes('next') || q.includes('quest') || q.includes('task')) return 'ask_focus';
  if (q.includes('hello') || q.includes('hey') || q.includes('hi ')) return 'greeting';
  return 'fallback';
}

/**
 * BakaSurRail — the chat panel. V3.5: the collapsed dock column is GONE;
 * the single living character (BakaSurPresence) sits as a hero over the
 * canvas and flies into the header slot this rail reserves when open.
 *
 * Structure (scrollbar fix, docs V3.5 §17): the aside NEVER scrolls.
 *   aside (flex column, h:100%)
 *   ├─ header (fixed)  — slot + title + close
 *   ├─ ctx strip (fixed)
 *   ├─ .baksur-rail-scroll — independent viewport (messages + suggestions)
 *   └─ form (fixed footer)
 *
 * Chat contract unchanged: guest → deterministic registry replies;
 * authenticated → POST /api/v1/assistant/chat exactly as before.
 */
export const BakaSurRail: React.FC<BakaSurRailProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const apiClient = useApiClient();
  const { user } = useAuth();
  const { tasks, habits, habitLogs, stats, journal } = useStore(useShallow(s => ({
    tasks: s.tasks,
    habits: s.habits,
    habitLogs: s.habitLogs,
    stats: s.stats,
    journal: s.journal,
  })));
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'I’m BakaSur. Ask me about your day, quests, habits, journal, or notes.',
      source: 'Ready · current workspace',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phase 2B quota display — authenticated daily remaining vs guest session vs offline
  const [quota, setQuota] = useState<{ remaining: number; effective: number } | null>(null);

  // Phase 3: Progressive onboarding — server-authoritative (Soul is source of truth)
  const [onboardingStep, setOnboardingStep] = useState<number>(-1); // -1 = not started, 0..N = active step, N+1 = complete
  const [soulContent, setSoulContent] = useState<string>('');
  const onboardingActive = onboardingStep >= 0 && onboardingStep < ONBOARDING_STEPS.length;

  // V3.5 single-instance character: register the header slot he lands in,
  // report busy so THINKING is visible wherever he currently sits.
  const registerSlot = useBakaSurPresenceSlot();
  const reportBusy = useBakaSurBusyReporter();
  const prefs = useBakaSurPrefs();
  const slotSize = railSizeFor(prefs.scale, prefs.presence);
  const bodyColor = (BAKASUR_COLOR_HEXES[prefs.color] ?? BAKASUR_COLOR_HEXES.graphite).mood;
  useEffect(() => { reportBusy(busy); }, [busy, reportBusy]);
  useEffect(() => () => reportBusy(false), [reportBusy]);

  const routeName = useMemo(() => routeNames[location.pathname] || 'Current workspace', [location.pathname]);
  const isGuest = user?.provider === 'guest';
  const offline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  // Phase 3: Load Soul on mount to determine onboarding progress
  // Soul is the source of truth — onboarding resumes from persisted state.
  useEffect(() => {
    if (isGuest || !apiClient) return; // Guest/offline: no onboarding
    let cancelled = false;
    loadOnboardingState(apiClient).then(({ soul, nextStep, isComplete }) => {
      if (cancelled) return;
      setSoulContent(soul.content);
      if (!isComplete) {
        setOnboardingStep(nextStep);
        // Replace initial greeting with first onboarding question
        const step = ONBOARDING_STEPS[nextStep];
        if (step) {
          setMessages([{
            id: 1,
            role: 'assistant',
            content: `Hey! I'm BakaSur — I'll be your personal AI companion here. To help you better, I'd like to learn a bit about you.\n\n${step.question}`,
            source: 'Onboarding · getting to know you',
          }]);
        }
      } else {
        setOnboardingStep(-1); // Complete — normal chat mode
      }
    }).catch(() => { if (!cancelled) setOnboardingStep(-1); });
    return () => { cancelled = true; };
  }, [isGuest, apiClient]);

  // Phase 2B: fetch authoritative quota on mount / auth change (live only)
  useEffect(() => {
    if (isGuest || !apiClient) {
      // Guest: show session quota (3/session); offline handled inline
      try { setQuota({ remaining: getGuestRemaining(), effective: 3 }); } catch { setQuota(null); }
      return;
    }
    let cancelled = false;
    if (offline) { setQuota({ remaining: 0, effective: 0 }); return; }
    fetchAiQuota(apiClient).then(res => {
      if (cancelled || !res) return;
      const remaining = res.quota.remaining ?? 0;
      const effective = res.quota.effectiveQuota ?? (res.settings?.effectiveQuota ?? 30);
      setQuota({ remaining, effective });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isGuest, apiClient, offline]);

  // Scripted replies rotate deterministically per intent (no randomness).
  const replyCounters = useRef<Partial<Record<BakaSurIntent, number>>>({});
  const scripted = (intent: BakaSurIntent): { line: string; env: BakaSurEnvironment } => {
    const env: BakaSurEnvironment = isGuest ? 'demo' : !navigator.onLine ? 'offline' : 'live';
    const n = (replyCounters.current[intent] ?? -1) + 1;
    replyCounters.current[intent] = n;
    return { line: baksurLine(env, intent, n), env };
  };

  // Route-aware suggestions (gap #3): recompute whenever the route or any of
  // the underlying store slices change — the numbers always match the ledger.
  const suggestions = useMemo(
    () => buildRouteSuggestions(location.pathname, { tasks, habits, habitLogs, journal, stats }),
    [location.pathname, tasks, habits, habitLogs, journal, stats],
  );

  // Escape-to-close (gap #10): Escape collapses an expanded rail; on mobile
  // it dismisses the bottom sheet. Only ever touches the rail's own state.
  useEffect(() => {
    if (collapsed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onToggle();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [collapsed, onToggle]);

  const ask = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || busy) return;
    // Phase 2B: offline always goes deterministic (0 AI calls); guest 3/session hard limit before any server call
    const offline = !navigator.onLine;
    if (isGuest && isGuestQuotaExhausted()) {
      setError(`Demo limit reached (3 turns per session). Sign in for live AI.`);
      setMessages(prev => [...prev,
        { id: Date.now(), role: 'user', content: question },
        { id: Date.now() + 1, role: 'assistant', content: `Demo limit reached — 3 turns per session. Sign in for 30 turns/day, or refresh to reset the demo counter.`, source: 'Demo · limit' },
      ]);
      setQuota({ remaining: 0, effective: 3 });
      return;
    }
    if (offline && !isGuest) {
      // Offline = 0 AI calls, deterministic reply only
      const intent = classifyIntent(question);
      const { line } = scripted(intent);
      setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: question }]);
      await new Promise(resolve => window.setTimeout(resolve, 220));
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `${line}\nOffline · local ledger only. Reconnect for live coaching.`, source: 'Offline · local-first' }]);
      setQuota({ remaining: 0, effective: 0 });
      return;
    }
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: question }]);

    // Phase 3: Onboarding — persist answer and advance to next question
    if (onboardingActive && apiClient && !isGuest) {
      setBusy(true);
      try {
        const step = ONBOARDING_STEPS[onboardingStep];
        const updated = await persistSoulUpdate(apiClient, soulContent, step, question);
        setSoulContent(updated.content);
        const nextStep = onboardingStep + 1;
        if (nextStep < ONBOARDING_STEPS.length) {
          // More questions to ask
          setOnboardingStep(nextStep);
          const nextQ = ONBOARDING_STEPS[nextStep];
          await new Promise(resolve => window.setTimeout(resolve, 400));
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            role: 'assistant',
            content: `Got it — thanks! One more thing: ${nextQ.question}`,
            source: 'Onboarding · getting to know you',
          }]);
        } else {
          // Onboarding complete — transition to normal chat
          setOnboardingStep(-1);
          await new Promise(resolve => window.setTimeout(resolve, 400));
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            role: 'assistant',
            content: "Perfect! I now know a bit about you. I'll use this to give you better advice. Ask me about your day, quests, habits, or anything else.",
            source: 'Onboarding · complete',
          }]);
        }
      } catch {
        // Persist failed — continue with normal chat
        setOnboardingStep(-1);
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);

    try {
      if (isGuest || !apiClient) {
        // Demo: deterministic registry line + an honest readout of
        // the real ledger numbers (no prose is invented, no LLM is called).
        // Guest quota is decremented per turn; remaining is shown in header.
        const intent = classifyIntent(question);
        const { line, env } = scripted(intent);
        const openToday = tasks.filter(t => t.today && t.status !== 'done').length;
        const doneHabits = doneHabitsToday(habits, habitLogs);
        const readout = `Board: ${openToday} quest${plural(openToday)} today · ${doneHabits}/${habits.filter(h => h.active).length} habits · LVL ${stats.level}.`;
        await new Promise(resolve => window.setTimeout(resolve, 320));
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: env === 'live' && !apiClient
            ? 'The Worker is not configured — I’m reading your local ledger only. Ask me about quests, habits or journal.'
            : `${line}\n${readout}`,
          source: env === 'demo' ? 'Demo · synthetic ledger' : env === 'offline' ? 'Offline · local-first' : 'Local · registry',
        }]);
        try {
          // Update guest remaining after local turn
          setQuota({ remaining: getGuestRemaining(), effective: 3 });
        } catch {}
      } else {
        // Build history from the live transcript INCLUDING the just-typed
        // question (setMessages is async, so `messages` is one turn stale).
        const history = [...messages, { role: 'user' as const, content: question }]
          .filter(m => !(m.role === 'assistant' && m.source?.startsWith('Unavailable')))
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content }));

        const result: ChatResult = await sendAssistantChat(
          apiClient,
          {
            message: question,
            history,
            context: {
              route: location.pathname,
              route_name: routeName,
              date: getTodayDateString(),
            },
          },
          { isGuest: false, isOffline: false },
        );

        if (result.ok) {
          // Successful AI reply
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            role: 'assistant',
            content: result.reply,
            source: result.model ? `BakaSur · ${result.model}` : 'BakaSur · Worker',
          }]);
          // Update quota from authoritative server envelope
          if (result.quota) {
            setQuota({ remaining: result.quota.remaining ?? 0, effective: result.quota.effectiveQuota ?? 30 });
          } else {
            fetchAiQuota(apiClient).then(r => { if (r) setQuota({ remaining: r.quota.remaining, effective: r.quota.effectiveQuota }); }).catch(()=>{});
          }
        } else {
          // Error from sendAssistantChat (quota, offline, upstream, etc.)
          const msg = result.message || 'BakaSur is unavailable right now.';
          if (result.status === 429 || result.error === 'quota_exceeded') {
            setError(msg);
            setMessages(prev => [...prev, {
              id: Date.now() + 1,
              role: 'assistant',
              content: msg,
              source: 'Limit · 429',
            }]);
          } else {
            setError(msg);
            setMessages(prev => [...prev, {
              id: Date.now() + 1,
              role: 'assistant',
              content: 'I could not reach the global assistant service. Your workspace is still available locally; try again when the Worker is online.',
              source: 'Unavailable · recoverable',
            }]);
          }
          // Update quota from error envelope if available
          if (result.quota) {
            setQuota({ remaining: result.quota.remaining ?? 0, effective: result.quota.effectiveQuota ?? quota?.effective ?? 30 });
          }
        }
      }
    } catch (err) {
      const be = err as { status?: number; body?: { error?: string; message?: string; quota?: { remaining: number; effectiveQuota: number } }; message?: string };
      const status = (be as any)?.status;
      const body = (be as any)?.body;
      const quotaFromErr = body?.quota as { remaining?: number; effectiveQuota?: number } | undefined;
      if (quotaFromErr) setQuota({ remaining: quotaFromErr.remaining ?? 0, effective: quotaFromErr.effectiveQuota ?? quota?.effective ?? 30 });
      if (status === 429 || body?.error === 'quota_exceeded') {
        const msg = body?.message || 'Daily AI limit reached. Try again tomorrow.';
        setError(msg);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: msg,
          source: 'Limit · 429',
        }]);
      } else {
        const message = err instanceof Error ? err.message : 'BakaSur is unavailable right now.';
        setError(message);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'I could not reach the global assistant service. Your workspace is still available locally; try again when the Worker is online.',
          source: 'Unavailable · recoverable',
        }]);
      }
    } finally {
      setBusy(false);
    }
  };

  // V3.5: collapsed renders NOTHING — the hero Presence owns the closed
  // state. (Keyboard/aria path to open it moved with the hero button.)
  if (collapsed) return null;

  return (
    <aside id="bakasur-rail" className="cabinet assistant-rail-expanded border-l border-solid" style={{ borderColor: 'rgba(139, 92, 246, 0.18)', background: 'linear-gradient(180deg, rgba(24,20,44,0.92), rgba(13,11,22,0.95))' }} aria-label="BakaSur global assistant">
      {/* ── Fixed header (never scrolls): slot reserved for the ONE living
           character + title + close control. ── */}
      <div className="cabinet-marquee baksur-rail-header" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
        <span
          ref={registerSlot}
          className="baksur-rail-slot"
          aria-hidden="true"
          style={{ width: slotSize, height: slotSize, flexShrink: 0 }}
          data-baksur-slot-color={bodyColor}
        />
        <TerminalText tone="primary" prompt>BAKASUR</TerminalText>
        <PixelBadge tone="success" className="ml-auto shrink-0">ONLINE</PixelBadge>
        <button type="button" className="icon-button icon-button-small !ml-2 shrink-0" onClick={onToggle} aria-label="Collapse BakaSur assistant" aria-expanded={true} title="Collapse BakaSur assistant"><X className="w-4 h-4" aria-hidden="true" /></button>
      </div>

      <div className="baksur-rail-ctx flex items-center gap-2 px-4 py-2 font-mono text-[10px] shrink-0" style={{ color: 'var(--arcade-paper-muted)', borderBottom: '1px solid var(--obs-glass-7)' }}>
        <PixelIcon name="cpu" size={13} color="var(--arcade-gold)" />
        <span>CTX: <b style={{ color: 'var(--arcade-paper-dim)' }}>{routeName}</b></span>
        {quota && (
          <span className="ml-1 px-1.5 py-0.5 rounded font-mono text-[9px]" style={{ background: quota.remaining === 0 ? 'rgba(248,113,113,0.12)' : 'rgba(139,92,246,0.12)', color: quota.remaining === 0 ? 'var(--bt-danger)' : 'var(--bt-primary)', border: `1px solid ${quota.remaining === 0 ? 'rgba(248,113,113,0.25)' : 'rgba(139,92,246,0.25)'}` }}>
            {isGuest ? `${quota.remaining}/${quota.effective} demo` : offline ? `offline` : `${quota.remaining}/${quota.effective} turns`}
          </span>
        )}
        {isGuest && <PixelBadge tone="primary" className="ml-auto">DEMO</PixelBadge>}
        {!isGuest && quota && quota.remaining === 0 && <PixelBadge tone="danger" className="ml-auto">LIMIT</PixelBadge>}
      </div>

      {/* ── Independent scroll viewport: the ONLY scrolling element. ── */}
      <div className="baksur-rail-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3" aria-live="polite">
          {messages.map(message => (
            <article key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: message.role === 'assistant' ? 'rgba(139, 92, 246,0.12)' : 'rgba(63,123,255,0.14)', color: message.role === 'assistant' ? 'var(--arcade-gold)' : 'var(--arcade-cobalt)' }} aria-hidden="true">
                {message.role === 'assistant' ? <PixelIcon name="robot" size={16} color="var(--arcade-gold)" /> : <PixelIcon name="terminal" size={16} color="var(--arcade-cobalt)" />}
              </div>
              <div className={`flex flex-col gap-1 max-w-[85%] ${message.role === 'user' ? 'items-end' : ''}`}>
                <p className="m-0 text-[0.8rem] leading-relaxed whitespace-pre-line" style={{ color: 'var(--arcade-paper)' }}>{message.content}</p>
                {message.source && <TerminalText tone="muted" className="text-[9px]">{message.source}</TerminalText>}
              </div>
            </article>
          ))}
          {busy && <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> BakaSur is thinking…</div>}
        </div>

        <div className="mt-auto pt-4 flex flex-col gap-2">
          <p className="m-0 font-mono text-[10px] leading-relaxed flex items-center gap-1.5" style={{ color: 'var(--arcade-paper-muted)' }}>
            <Sparkles className="w-3 h-3 shrink-0" style={{ color: 'var(--obs-aurora-bright)' }} aria-hidden="true" />
            <TerminalText tone="muted">{suggestions.insight}</TerminalText>
          </p>
          <div role="group" aria-label="Suggested questions" className="flex flex-col gap-1.5">
            {suggestions.prompts.map(item => (
              <button key={item.label} type="button" className="btn-text !justify-start !text-left !text-[11px]" onClick={() => ask(item.prompt)} disabled={busy}>{item.label}</button>
            ))}
          </div>
        </div>

        {error && <p className="m-0 font-mono text-[10px]" style={{ color: 'var(--arcade-red)' }} role="alert">{error}</p>}
      </div>

      {/* ── Fixed footer: input never inside the scroll viewport. ── */}
      <form className="baksur-rail-footer flex items-center gap-2 p-3 border-t shrink-0" style={{ borderColor: 'var(--obs-glass-8)' }} onSubmit={event => { event.preventDefault(); void ask(input); }}>
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask BakaSur…"
          aria-label="Ask BakaSur"
          maxLength={500}
          disabled={busy}
          className="arcade-input !py-2 !text-sm flex-1"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" title="Send message" className="icon-button" style={{ background: 'var(--obs-aurora)', color: '#f4f2ff', borderColor: 'var(--obs-aurora)' }}>
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
};
