import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../../features/auth';
import { useApiClient } from '../../api/authFetch';
import { getTodayDateString, isHabitCompleted } from '../../lib/utils';
import { calculateHabitStreak } from '../../services/habits/calculateHabitStreak';
import { PixelIcon, PixelBadge, TerminalText } from '../ui';
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
        return {
          insight: `${openTasks.length} open quest${plural(openTasks.length)} · none assigned`,
          prompts: [{ label: 'Assign your quests to quadrants', prompt: 'Which of my open quests belong in Do First?' }],
        };
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

function demoReply(question: string, route: string, tasks: Task[], habits: Habit[], habitLogs: HabitLog[], stats: UserStats, journal: JournalEntry[]): { content: string; source: string } {
  const q = question.toLowerCase();
  const today = getTodayDateString();
  const openToday = tasks.filter(task => task.today && task.status !== 'done');
  const activeHabits = habits.filter(habit => habit.active);
  const overdue = tasks.filter(task => task.status !== 'done' && task.due_date && task.due_date < today);
  const dueToday = tasks.filter(task => task.status !== 'done' && task.due_date === today);
  const doneTodayCount = doneHabitsToday(habits, habitLogs);
  const atRisk = habitsAtRisk(habits, habitLogs);
  const journalToday = journal.find(entry => entry.date === today);
  const latest = journal.at(-1);

  if (q.includes('overdue') || q.includes('late')) {
    return overdue.length
      ? { content: `I found ${overdue.length} overdue quest${overdue.length === 1 ? '' : 's'}. Start with “${overdue[0].title}”, then move one task into Doing.`, source: 'Tasks · demo data' }
      : { content: 'No overdue quests in the demo ledger. That is a clean board — pick one Today task and protect a short focus block.', source: 'Tasks · demo data' };
  }
  if (q.includes('habit') || q.includes('streak') || q.includes('log')) {
    if (atRisk[0]) {
      return { content: `“${atRisk[0].habit.name}” is at ${atRisk[0].streak} days and not logged yet today — the streak survives with the smallest version.`, source: 'Habits · demo data' };
    }
    return { content: `You have ${activeHabits.length} active habit${activeHabits.length === 1 ? '' : 's'} configured; ${doneTodayCount} done today. Log the smallest version first; consistency earns the XP, not a perfect session.`, source: 'Habits · demo data' };
  }
  if (q.includes('journal') || q.includes('feel') || q.includes('pattern') || q.includes('reflect') || q.includes('highlight')) {
    if (journalToday?.highlight?.trim()) {
      return {
        content: `Today's highlight is logged: “${truncate(journalToday.highlight, 90)}”. A useful next step is to write one sentence about what made it work.`,
        source: 'Journal · demo data',
      };
    }
    return {
      content: latest?.highlight
        ? `Your latest highlight was “${truncate(latest.highlight, 90)}”. Today's entry is still open — one honest sentence is enough.`
        : 'Your journal is ready for its first highlight. One honest sentence is enough.',
      source: 'Journal · demo data',
    };
  }
  if (q.includes('note')) {
    return { content: 'Notes live on your instance — I can turn a page into quests once you are signed in. Ask me about your quests, habits, or journal meanwhile.', source: 'Notes · demo data' };
  }
  if (q.includes('focus') || q.includes('today') || q.includes('priorit')) {
    return openToday.length
      ? { content: `Your best next move is “${openToday[0].title}”. You have ${openToday.length} active quest${openToday.length === 1 ? '' : 's'} today; keep the next block small and finishable.`, source: 'Today · demo data' }
      : { content: `Your ledger is quiet today. Add one quest, complete one habit, and let the day earn its first ${stats.xp || 0} XP.`, source: 'Today · demo data' };
  }
  // Route-aware fallback (gap #3): guest mode answers from the same real
  // ledger the suggestions derive from, so clicking a suggestion never dead-ends.
  switch (route) {
    case '/today': {
      const top = topOpenTodayQuest(tasks);
      if (top) return { content: `Your highest-priority quest today is “${top.title}” (+${top.xp} XP). Keep the next block small and finishable.`, source: 'Today · demo data' };
      return { content: 'Your board is quiet today — star one quest and protect a short focus block.', source: 'Today · demo data' };
    }
    case '/tasks': {
      if (overdue.length) return { content: `${overdue.length} quest${plural(overdue.length)} overdue — start with “${overdue[0].title}”.`, source: 'Tasks · demo data' };
      if (dueToday.length) return { content: `${dueToday.length} quest${plural(dueToday.length)} due today — “${dueToday[0].title}” is the nearest one.`, source: 'Tasks · demo data' };
      if (openToday.length || tasks.length) {
        const count = openToday.length || tasks.filter(task => task.status !== 'done').length;
        return { content: `${count} open quest${plural(count)} in the ledger. The next move is usually the one with a due date or a Today star.`, source: 'Tasks · demo data' };
      }
      return { content: 'No quests yet — the smallest first quest still earns XP.', source: 'Tasks · demo data' };
    }
    case '/habits': {
      if (atRisk[0]) return { content: `“${atRisk[0].habit.name}” is at ${atRisk[0].streak} days — log it today or the streak resets. The smallest version still counts.`, source: 'Habits · demo data' };
      if (activeHabits.length) {
        return doneTodayCount > 0
          ? { content: `${doneTodayCount} of ${activeHabits.length} habits done today; the rest are still open.`, source: 'Habits · demo data' }
          : { content: 'No habits logged today yet — one check-in is enough to start the chain.', source: 'Habits · demo data' };
      }
      return { content: 'No habits configured yet — add one and check it in to earn your first XP.', source: 'Habits · demo data' };
    }
    case '/journal': {
      if (journalToday?.highlight?.trim()) return { content: `Today's highlight is logged: “${truncate(journalToday.highlight, 90)}”. One more sentence about what made it work would close the day.`, source: 'Journal · demo data' };
      if (latest?.highlight) return { content: `Your latest highlight was “${truncate(latest.highlight, 90)}” — today's entry is still open. One honest sentence is enough.`, source: 'Journal · demo data' };
      return { content: 'Your journal is ready for its first highlight. One honest sentence is enough.', source: 'Journal · demo data' };
    }
    case '/notes':
      return { content: 'Notes live on your instance — I can turn a page into quests once you are signed in. Ask me about your quests, habits, or journal meanwhile.', source: 'Notes · demo data' };
    case '/eisenhower': {
      const doFirstCount = tasks.filter(task => task.status !== 'done' && task.quadrant === 'do').length;
      return doFirstCount > 0
        ? { content: `${doFirstCount} quest${plural(doFirstCount)} sit in Do First — those are the ones worth the next block.`, source: 'Matrix · demo data' }
        : { content: 'Do First is empty — assign your inbox quests a quadrant and the matrix will tell you where to start.', source: 'Matrix · demo data' };
    }
    case '/journey':
      return { content: `You are level ${stats.level} with ${stats.xp} XP. In the demo ledger that is ${tasks.length} quests, ${habits.length} habits, and ${journal.length} journal entries — ask me what it means.`, source: 'Journey · demo data' };
    default:
      return { content: `I’m BakaSur in demo mode. I can help you reason about ${tasks.length} quests, ${habits.length} habits, ${journal.length} journal entries, and your level ${stats.level} character. Try “What should I focus on today?”`, source: 'BakaSur · demo data' };
  }
}

/**
 * BakaSurRail — the assistant pane. The attendant booth in the corner
 * of the dome: ask about your day, quests, habits, journal, or notes.
 * Guest mode → local demo reasoning; authenticated → Worker chat.
 *
 * F4: route-aware contextual suggestions derived from real store data,
 * Escape-to-close (mobile sheet + desktop rail), violet intelligence
 * presence on the orb and identity header.
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
  const routeName = useMemo(() => routeNames[location.pathname] || 'Current workspace', [location.pathname]);
  const isGuest = user?.provider === 'guest';

  // Route-aware suggestions (gap #3): recompute whenever the route or any of
  // the underlying store slices change — the numbers always match the ledger.
  const suggestions = useMemo(
    () => buildRouteSuggestions(location.pathname, { tasks, habits, habitLogs, journal, stats }),
    [location.pathname, tasks, habits, habitLogs, journal, stats],
  );

  // Escape-to-close (gap #10): Escape collapses an expanded rail to the orb;
  // on mobile it dismisses the bottom sheet. Modals are F9's territory — this
  // handler only ever touches the rail's own open state.
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
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: question }]);
    setBusy(true);

    try {
      if (isGuest) {
        const reply = demoReply(question, location.pathname, tasks, habits, habitLogs, stats, journal);
        await new Promise(resolve => window.setTimeout(resolve, 320));
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', ...reply }]);
      } else if (apiClient) {
        // Build history from the live transcript INCLUDING the just-typed
        // question (setMessages is async, so `messages` is one turn stale).
        const history = [...messages, { role: 'user' as const, content: question }]
          .filter(m => !(m.role === 'assistant' && m.source?.startsWith('Unavailable')))
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content }));
        const response = await apiClient.post<{ ok: boolean; result?: { answer?: string; reply?: string; source?: string }; message?: string }>(
          '/api/v1/assistant/chat',
          {
            message: question,
            history,
            context: {
              route: location.pathname,
              route_name: routeName,
              date: getTodayDateString(),
              // Compact, user-supplied ledger facts so BakaSur can reason about
              // the real workspace (treated as DATA, never as instructions).
              facts: {
                open: tasks.filter(t => t.status !== 'done').length,
                doneToday: tasks.filter(t => t.status === 'done' && t.updated_at ? new Date(t.updated_at).toDateString() === new Date().toDateString() : false).length,
                overdue: tasks.filter(t => t.due_date && !t.today && t.status !== 'done' && new Date(t.due_date) < new Date()).length,
                habitsDone: doneHabitsToday(habits, habitLogs),
                atRiskStreaks: habitsAtRisk(habits, habitLogs).length,
                level: stats.level,
                xp: stats.xp,
                journalToday: journal.some(j => j.date === getTodayDateString()),
                // Route-aware page context: when editing /notes/:id, tell
                // BakaSur which page is open so it can coach concretely.
                pageId: location.pathname.startsWith('/notes/') ? location.pathname.slice('/notes/'.length) : undefined,
              },
            },
          },
        );
        const answer = response.result?.reply || response.result?.answer;
        if (!answer) throw new Error(response.message || 'BakaSur returned no answer.');
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: answer, source: response.result?.source || 'BakaSur · Worker' }]);
      } else {
        throw new Error('The BakaTracker Worker is not configured.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'BakaSur is unavailable right now.';
      setError(message);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I could not reach the global assistant service. Your workspace is still available locally; try again when the Worker is online.',
        source: 'Unavailable · recoverable',
      }]);
    } finally {
      setBusy(false);
    }
  };

  if (collapsed) {
    return (
      <aside id="bakasur-rail" className="assistant-rail assistant-rail-collapsed" aria-label="BakaSur assistant collapsed">
        <button type="button" className="assistant-rail-expand" onClick={onToggle} aria-label="Open BakaSur assistant" aria-expanded={false} title="Open BakaSur assistant">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--arcade-gold)', boxShadow: '0 0 10px var(--arcade-gold)' }} aria-hidden="true" />
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
        <span className="assistant-rail-label">
          <TerminalText tone="primary">BAKASUR</TerminalText>
        </span>
      </aside>
    );
  }

  return (
    <aside id="bakasur-rail" className="cabinet assistant-rail-expanded border-l border-solid" style={{ borderColor: 'rgba(139, 92, 246, 0.18)', background: 'linear-gradient(180deg, rgba(24,20,44,0.92), rgba(13,11,22,0.95))' }} aria-label="BakaSur global assistant">
      {/* ASCII terminal header */}
      <div className="cabinet-marquee" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
        <span className="cabinet-led" style={{ background: 'var(--obs-aurora)', boxShadow: '0 0 10px rgba(139, 92, 246, 0.6)' }} aria-hidden="true" />
        <TerminalText tone="primary" prompt>&gt; BAKASUR</TerminalText>
        <PixelBadge tone="success" className="ml-auto">ONLINE</PixelBadge>
        <button type="button" className="icon-button icon-button-small !ml-2" onClick={onToggle} aria-label="Collapse BakaSur assistant" aria-expanded={true} title="Collapse BakaSur assistant"><X className="w-4 h-4" aria-hidden="true" /></button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)', borderBottom: '1px solid var(--obs-glass-7)' }}>
        <PixelIcon name="cpu" size={13} color="var(--arcade-gold)" />
        <span>CTX: <b style={{ color: 'var(--arcade-paper-dim)' }}>{routeName}</b></span>
        {isGuest && <PixelBadge tone="primary" className="ml-auto">DEMO</PixelBadge>}
      </div>

      <div className="assistant-messages flex-1 overflow-y-auto p-4 flex flex-col gap-3" aria-live="polite">
        {messages.map(message => (
          <article key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: message.role === 'assistant' ? 'rgba(139, 92, 246,0.12)' : 'rgba(63,123,255,0.14)', color: message.role === 'assistant' ? 'var(--arcade-gold)' : 'var(--arcade-cobalt)' }} aria-hidden="true">
              {message.role === 'assistant' ? <PixelIcon name="robot" size={16} color="var(--arcade-gold)" /> : <PixelIcon name="terminal" size={16} color="var(--arcade-cobalt)" />}
            </div>
            <div className={`flex flex-col gap-1 max-w-[85%] ${message.role === 'user' ? 'items-end' : ''}`}>
              <p className="m-0 text-[0.8rem] leading-relaxed" style={{ color: 'var(--arcade-paper)' }}>{message.content}</p>
              {message.source && <TerminalText tone="muted" className="text-[9px]">{message.source}</TerminalText>}
            </div>
          </article>
        ))}
        {busy && <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> BakaSur is thinking…</div>}
      </div>

      <div className="px-4 pb-2 flex flex-col gap-2">
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

      {error && <p className="px-4 m-0 font-mono text-[10px]" style={{ color: 'var(--arcade-red)' }} role="alert">{error}</p>}

      <form className="flex items-center gap-2 p-3 border-t" style={{ borderColor: 'var(--obs-glass-8)' }} onSubmit={event => { event.preventDefault(); void ask(input); }}>
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
