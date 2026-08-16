import React, { useMemo, useState } from 'react';
import { Bot, ChevronRight, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../features/auth';
import { useApiClient } from '../../api/authFetch';
import { getTodayDateString } from '../../lib/utils';
import type { Habit, JournalEntry, Task, UserStats } from '../../types';

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

const routeNames: Record<string, string> = {
  '/today': 'Today focus',
  '/habits': 'Habits',
  '/tasks': 'Task planner',
  '/eisenhower': 'Priority matrix',
  '/journal': 'Journal',
  '/journey': 'Journey analytics',
  '/notes': 'Notes library',
};

function demoReply(question: string, tasks: Task[], habits: Habit[], stats: UserStats, journal: JournalEntry[]): { content: string; source: string } {
  const q = question.toLowerCase();
  const today = getTodayDateString();
  const openToday = tasks.filter(task => task.today && task.status !== 'done');
  const incompleteHabits = habits.filter(habit => habit.active);
  const overdue = tasks.filter(task => task.status !== 'done' && task.due_date && task.due_date < today);

  if (q.includes('overdue') || q.includes('late')) {
    return overdue.length
      ? { content: `I found ${overdue.length} overdue quest${overdue.length === 1 ? '' : 's'}. Start with “${overdue[0].title}”, then move one task into Doing.`, source: 'Tasks · demo data' }
      : { content: 'No overdue quests in the demo ledger. That is a clean board — pick one Today task and protect a short focus block.', source: 'Tasks · demo data' };
  }
  if (q.includes('habit') || q.includes('streak')) {
    return { content: `You have ${incompleteHabits.length} active habit${incompleteHabits.length === 1 ? '' : 's'} configured. Log the smallest version first; consistency earns the XP, not a perfect session.`, source: 'Habits · demo data' };
  }
  if (q.includes('journal') || q.includes('feel') || q.includes('pattern')) {
    const latest = journal.at(-1);
    return {
      content: latest?.highlight
        ? `Your latest highlight was “${latest.highlight}”. A useful next step is to write one sentence about what made it work.`
        : 'Your journal is ready for its first highlight. One honest sentence is enough.',
      source: 'Journal · demo data',
    };
  }
  if (q.includes('focus') || q.includes('today') || q.includes('priorit')) {
    return openToday.length
      ? { content: `Your best next move is “${openToday[0].title}”. You have ${openToday.length} active quest${openToday.length === 1 ? '' : 's'} today; keep the next block small and finishable.`, source: 'Today · demo data' }
      : { content: `Your ledger is quiet today. Add one quest, complete one habit, and let the day earn its first ${stats.xp || 0} XP.`, source: 'Today · demo data' };
  }
  return { content: `I’m BakaSur in demo mode. I can help you reason about ${tasks.length} quests, ${habits.length} habits, ${journal.length} journal entries, and your level ${stats.level} character. Try “What should I focus on today?”`, source: 'BakaSur · demo data' };
}

export const BakaSurRail: React.FC<BakaSurRailProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const apiClient = useApiClient();
  const { user } = useAuth();
  const { tasks, habits, stats, journal } = useStore();
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

  const ask = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || busy) return;
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: question }]);
    setBusy(true);

    try {
      if (isGuest) {
        const reply = demoReply(question, tasks, habits, stats, journal);
        await new Promise(resolve => window.setTimeout(resolve, 320));
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', ...reply }]);
      } else if (apiClient) {
        const history = messages
          .filter(m => !(m.role === 'assistant' && m.source?.startsWith('Unavailable')))
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content }));
        const response = await apiClient.post<{ ok: boolean; result?: { answer?: string; reply?: string; source?: string }; message?: string }>(
          '/api/v1/assistant/chat',
          { message: question, history, context: { route: location.pathname, route_name: routeName, date: getTodayDateString() } },
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
          <span className="assistant-orb"><span /></span>
          <ChevronRight aria-hidden="true" />
        </button>
        <span className="assistant-rail-label">BakaSur</span>
      </aside>
    );
  }

  return (
    <aside id="bakasur-rail" className="assistant-rail" aria-label="BakaSur global assistant">
      <div className="assistant-header">
        <div className="assistant-title">
          <span className="assistant-orb" aria-hidden="true"><span /></span>
          <div><strong>BakaSur</strong><span>Global life assistant</span></div>
        </div>
        <button type="button" className="icon-button icon-button-small" onClick={onToggle} aria-label="Collapse BakaSur assistant" aria-expanded={true} title="Collapse BakaSur assistant"><X aria-hidden="true" /></button>
      </div>

      <div className="assistant-context">
        <Sparkles aria-hidden="true" />
        <span>Context: <b>{routeName}</b></span>
        {isGuest && <small>Demo data</small>}
      </div>

      <div className="assistant-messages" aria-live="polite">
        {messages.map(message => (
          <article key={message.id} className={`assistant-message ${message.role}`}>
            <div className="assistant-message-icon" aria-hidden="true">{message.role === 'assistant' ? <Bot /> : <MessageCircle />}</div>
            <div>
              <p>{message.content}</p>
              {message.source && <small>{message.source}</small>}
            </div>
          </article>
        ))}
        {busy && <div className="assistant-thinking"><Loader2 className="animate-spin" aria-hidden="true" /> BakaSur is thinking…</div>}
      </div>

      <div className="assistant-prompts" role="group" aria-label="Suggested questions">
        {['What should I focus on today?', 'Any overdue quests?', 'Spot a pattern in my journal'].map(prompt => (
          <button key={prompt} type="button" onClick={() => ask(prompt)} disabled={busy}>{prompt}</button>
        ))}
      </div>

      {error && <p className="assistant-error" role="alert">{error}</p>}

      <form className="assistant-composer" onSubmit={event => { event.preventDefault(); void ask(input); }}>
        <input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask BakaSur…" aria-label="Ask BakaSur" disabled={busy} />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" title="Send message"><Send aria-hidden="true" /></button>
      </form>
    </aside>
  );
};
