import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Task, TaskStatus } from '../types';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calculateDailyScore, isHabitCompleted, getTodayDateString } from '../lib/utils';
import { calculateHabitStreak } from '../services/habits/calculateHabitStreak';
import { GlassPane, XPBar, PixelIcon, PixelBadge, SystemLabel, TerminalText, AsciiBox } from '../components/ui';
import { QuestCard } from '../components/shared/QuestCard';
import { DailyStatus } from '../components/shared/DailyStatus';

/**
 * Today — the RPG command center. Daily status HUD, starred quests,
 * habit progress, and cockpit instruments. All numbers from the store.
 */
export const Today: React.FC = () => {
  const { tasks, habits, habitLogs, journal, stats, settings, moveTask } = useStore(useShallow(s => ({
    tasks: s.tasks,
    habits: s.habits,
    habitLogs: s.habitLogs,
    journal: s.journal,
    stats: s.stats,
    settings: s.settings,
    moveTask: s.moveTask,
  })));

  const todayTasks = tasks.filter(t => t.today);
  const activeTasks = todayTasks.filter(t => t.status !== 'done');
  const doingTasks = todayTasks.filter(t => t.status === 'doing');
  const doneTasks = todayTasks.filter(t => t.status === 'done');

  // --- Cockpit modules — all derived from real store slices ---
  const todayStr = getTodayDateString();
  const activeHabits = habits.filter(h => h.active);
  const todayLogs = habitLogs.filter(l => l.date === todayStr);
  const habitsDone = activeHabits.filter(h => isHabitCompleted(h, todayLogs.find(l => l.habit_id === h.id))).length;
  const dailyScore = calculateDailyScore(todayStr, habits, habitLogs, tasks, journal);
  const todayJournal = journal.find(j => j.date === todayStr);
  const journalLogged = !!(todayJournal && todayJournal.highlight.trim());
  const topStreak = activeHabits
    .map(h => ({ habit: h, streak: calculateHabitStreak(h, habitLogs) }))
    .sort((a, b) => b.streak - a.streak)[0];
  const xpPerLevel = Math.max(1, settings.xp_per_level || 100);
  const xpProgress = Math.min(100, Math.max(0, (stats.xp / xpPerLevel) * 100));
  const xpToNext = Math.max(0, xpPerLevel - stats.xp);
  const openQuests = todayTasks.filter(t => t.status !== 'done');
  // Priority quest: the first quest in Doing, else the highest-XP open quest.
  const priorityQuest = openQuests.find(t => t.status === 'doing') || [...openQuests].sort((a, b) => b.xp - a.xp)[0];
  const scoreTone = dailyScore >= 80 ? 'success' : dailyScore >= 40 ? 'primary' : 'danger';

  const [activeMobileTab, setActiveMobileTab] = useState<'today' | 'doing' | 'done'>('today');

  interface FloatingXP {
    id: number;
    xp: number;
    statName: string;
    x: number;
    y: number;
  }
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [starBursts, setStarBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [paneLit, setPaneLit] = useState(false);
  const fxIdRef = useRef(0);

  const triggerFloatingXP = (e: React.MouseEvent | null, xp: number, statName: string) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && 'clientX' in e && e.clientX) {
      x = e.clientX;
      y = e.clientY;
    } else if (e && e.currentTarget) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    const newXP = { id: ++fxIdRef.current, xp, statName, x, y };
    setFloatingXPs(prev => [...prev, newXP]);
    setTimeout(() => setFloatingXPs(prev => prev.filter(item => item.id !== newXP.id)), 1000);
  };

  const lightThePane = (e: React.MouseEvent | null, xp: number, statName: string) => {
    triggerFloatingXP(e, xp, statName);
    setPaneLit(false);
    requestAnimationFrame(() => setPaneLit(true));
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && 'clientX' in e && e.clientX) { x = e.clientX; y = e.clientY; }
    const star = { id: ++fxIdRef.current, x, y };
    setStarBursts(prev => [...prev, star]);
    setTimeout(() => setStarBursts(prev => prev.filter(s => s.id !== star.id)), 650);
  };

  const shiftStatus = (task: Task, direction: 'left' | 'right', e?: React.MouseEvent) => {
    const statusOrder: TaskStatus[] = ['todo', 'doing', 'done'];
    const currentStatus = task.status === 'backlog' ? 'todo' : task.status;
    const currentIndex = statusOrder.indexOf(currentStatus);
    let newIndex = currentIndex;
    if (direction === 'left' && currentIndex > 0) newIndex--;
    else if (direction === 'right' && currentIndex < statusOrder.length - 1) newIndex++;
    if (newIndex !== currentIndex) {
      moveTask(task.id, statusOrder[newIndex]);
      if (statusOrder[newIndex] === 'done') triggerFloatingXP(e || null, task.xp, task.area);
    }
  };

  const columns: { id: 'todo' | 'doing' | 'done'; label: string; mobileTab: 'today' | 'doing' | 'done' }[] = [
    { id: 'todo', label: 'Queue', mobileTab: 'today' },
    { id: 'doing', label: 'Active', mobileTab: 'doing' },
    { id: 'done', label: 'Cleared', mobileTab: 'done' },
  ];

  const getColumnTasks = (colId: 'todo' | 'doing' | 'done') => {
    if (colId === 'todo') return todayTasks.filter(t => t.status === 'todo' || t.status === 'backlog');
    return todayTasks.filter(t => t.status === colId);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-6 relative pb-20 md:pb-48">
      {/* Floating XP Elements */}
      {floatingXPs.map(item => (
        <div key={item.id} className="float-xp" style={{ left: `${item.x}px`, top: `${item.y}px`, transform: 'translate(-50%, -50%)' }}>
          +{item.xp} {item.statName.toUpperCase()} XP
        </div>
      ))}
      {starBursts.map(star => (
        <div key={star.id} className="star-join fixed z-30 pointer-events-none" style={{ left: `${star.x}px`, top: `${star.y}px`, transform: 'translate(-50%, -50%)', color: 'var(--bt-xp)', fontSize: '20px', lineHeight: 1 }} aria-hidden="true">✦</div>
      ))}

      {/* Spotlight Backdrop Dimmer */}
      {doingTasks.length > 0 && (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 45% 40% at 50% 45%, transparent 0%, rgba(8,7,15,0.55) 100%)' }} aria-hidden="true" />
      )}

      {/* ─── DAILY STATUS HUD ─── */}
      <div className={`z-10 ${paneLit ? 'pane-light' : ''}`}>
        <DailyStatus
          level={stats.level}
          xp={stats.xp}
          xpPerLevel={xpPerLevel}
          dailyScore={dailyScore}
          questsDone={doneTasks.length}
          questsTotal={todayTasks.length}
          habitsDone={habitsDone}
          habitsTotal={activeHabits.length}
        />
      </div>

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <h2 className="marquee-title text-2xl sm:text-3xl m-0" style={{ color: 'var(--bt-text)' }}>
            <TerminalText tone="primary" prompt>DAILY QUESTS</TerminalText>
          </h2>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--bt-text-muted)' }}>
            {todayTasks.length === 0 ? 'The command center is clear.' : `${doneTasks.length} of ${todayTasks.length} cleared`}
          </p>
        </div>

        {todayTasks.length > 0 && activeTasks.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-sm">
            <PixelIcon name="trophy" size={18} color="var(--bt-success)" />
            <PixelBadge tone="success">BOARD CLEAR</PixelBadge>
          </div>
        )}
      </div>

      {/* Priority Quest Callout */}
      {priorityQuest && (
        <section className="quest-callout z-10">
          <span className="quest-callout-led" aria-hidden="true" />
          <div className="quest-callout-body">
            <span className="quest-callout-kicker">
              <SystemLabel tone="muted">PRIORITY QUEST</SystemLabel>
            </span>
            <span className="quest-callout-title">{priorityQuest.title}</span>
            <div className="flex items-center gap-2 mt-1">
              <PixelBadge tone="primary">{priorityQuest.area}</PixelBadge>
              <span className="font-mono text-[10px] score-readout" style={{ color: 'var(--bt-xp)' }}>
                +{priorityQuest.xp} XP
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              moveTask(priorityQuest.id, 'done');
              lightThePane(e, priorityQuest.xp, priorityQuest.area);
            }}
            className="insert-coin !py-2 !px-4 !text-xs"
            aria-label={`Complete ${priorityQuest.title}`}
          >
            <PixelIcon name="check" size={16} className="mr-1" />
            Complete
          </button>
        </section>
      )}

      {/* Empty Board State */}
      {todayTasks.length === 0 ? (
        <section className="z-10 max-w-md mx-auto mt-4">
          <AsciiBox title="DAILY BOARD CLEAR" tone="default">
            <div className="flex flex-col items-center gap-3 py-2">
              <PixelIcon name="goal" size={28} color="var(--bt-text-muted)" />
              <p className="m-0 text-sm text-center" style={{ color: 'var(--bt-text-dim)' }}>
                No quests assigned for today.
                <br />
                <span style={{ color: 'var(--bt-text-muted)' }}>
                  Star tasks from your quest board to begin.
                </span>
              </p>
              <Link to="/tasks" className="insert-coin mt-1 no-underline !text-xs">
                <span>OPEN QUEST BOARD</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </AsciiBox>
        </section>
      ) : (
        <>
          {/* Today's Quests Checklist */}
          <GlassPane state="playing" paneTitle="Today's Quests" tone="aurora"
            titleRight={<SystemLabel tone="primary">{doneTasks.length} / {todayTasks.length}</SystemLabel>}
            screenClassName="!p-5" className="z-10">
            <div className="flex flex-col gap-2">
              {todayTasks.map(task => (
                <QuestCard
                  key={task.id}
                  task={task}
                  isCompleted={task.status === 'done'}
                  checklist
                  onComplete={(e) => {
                    const nextStatus = task.status === 'done' ? 'todo' : 'done';
                    moveTask(task.id, nextStatus);
                    if (nextStatus === 'done') lightThePane(e, task.xp, task.area);
                  }}
                />
              ))}
            </div>
          </GlassPane>

          {/* Kanban Columns (Desktop) */}
          <div className="hidden md:grid grid-cols-3 gap-6 z-10">
            {columns.map(col => {
              const colTasks = getColumnTasks(col.id);
              return (
                <GlassPane
                  key={col.id}
                  state={col.id === 'done' ? 'highscore' : 'off'}
                  tone={col.id === 'done' ? 'green' : 'cobalt'}
                  paneTitle={col.label}
                  titleRight={<SystemLabel tone="muted">{colTasks.length}</SystemLabel>}
                  screenClassName="!p-4 flex flex-col gap-3 min-h-[120px]"
                >
                  {colTasks.length === 0 ? (
                    <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--bt-text-disabled)' }}>
                      No quests
                    </p>
                  ) : (
                    colTasks.map(task => (
                      <QuestCard
                        key={task.id}
                        task={task}
                        isCompleted={task.status === 'done'}
                        onComplete={(e) => {
                          const nextStatus = task.status === 'done' ? 'todo' : 'done';
                          moveTask(task.id, nextStatus);
                          if (nextStatus === 'done') lightThePane(e, task.xp, task.area);
                        }}
                        onShiftLeft={(e) => shiftStatus(task, 'left', e)}
                        onShiftRight={(e) => shiftStatus(task, 'right', e)}
                        showShiftLeft={col.id !== 'todo'}
                        showShiftRight={col.id !== 'done'}
                      />
                    ))
                  )}
                </GlassPane>
              );
            })}
          </div>

          {/* Mobile Column Tabs */}
          <div className="md:hidden flex gap-2 z-10">
            {columns.map(col => (
              <button
                key={col.id}
                type="button"
                onClick={() => setActiveMobileTab(col.mobileTab)}
                className={`flex-1 rounded-lg px-3 py-2 font-mono text-[10px] font-bold cursor-pointer transition ${
                  activeMobileTab === col.mobileTab ? 'chip chip--cobalt' : 'chip'
                }`}
              >
                {col.label} ({getColumnTasks(col.id).length})
              </button>
            ))}
          </div>

          {/* Mobile Column Content */}
          <div className="md:hidden z-10">
            {columns.filter(col => col.mobileTab === activeMobileTab).map(col => {
              const colTasks = getColumnTasks(col.id);
              return (
                <GlassPane key={col.id} state="off" tone={col.id === 'done' ? 'green' : 'cobalt'} paneTitle={col.label} screenClassName="!p-4 flex flex-col gap-3">
                  {colTasks.length === 0 ? (
                    <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--bt-text-disabled)' }}>No quests</p>
                  ) : (
                    colTasks.map(task => (
                      <QuestCard
                        key={task.id}
                        task={task}
                        isCompleted={task.status === 'done'}
                        checklist
                        onComplete={(e) => {
                          const nextStatus = task.status === 'done' ? 'todo' : 'done';
                          moveTask(task.id, nextStatus);
                          if (nextStatus === 'done') lightThePane(e, task.xp, task.area);
                        }}
                        onShiftLeft={(e) => shiftStatus(task, 'left', e)}
                        onShiftRight={(e) => shiftStatus(task, 'right', e)}
                        showShiftLeft={col.id !== 'todo'}
                        showShiftRight={col.id !== 'done'}
                      />
                    ))
                  )}
                </GlassPane>
              );
            })}
          </div>
        </>
      )}

      {/* ─── COCKPIT INSTRUMENTS ─── */}
      <div className="f11-cockpit-dock z-10">
        <div className="f11-cockpit-head">
          <span className="f11-cockpit-led" aria-hidden="true" />
          <h3 className="f11-cockpit-title">
            <TerminalText tone="muted">INSTRUMENTS</TerminalText>
          </h3>
          <span className="f11-cockpit-kicker">
            <SystemLabel tone="muted">score · habits · journal · level</SystemLabel>
          </span>
        </div>
        <div className="cockpit-grid">
          {/* Daily Score */}
          <GlassPane tone="aurora" paneTitle="Daily Score"
            titleRight={<SystemLabel tone={scoreTone}>{dailyScore}%</SystemLabel>}
            screenClassName="!p-5 flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <span className="marquee-title text-3xl leading-none" style={{ color: `var(--bt-${scoreTone})` }}>{dailyScore}%</span>
              <SystemLabel tone="muted">today</SystemLabel>
            </div>
            <XPBar
              value={dailyScore}
              max={100}
              ariaLabel="Daily score"
              className="[&>div]:w-full [&>div]:!h-full"
              style={{ width: '100%', background: 'rgba(233,230,242,0.06)', border: '1px solid rgba(233,230,242,0.1)' }}
              indicatorStyle={{
                width: `${dailyScore}%`,
                background: `linear-gradient(90deg, var(--arcade-gold-deep), var(--bt-${scoreTone}))`,
                boxShadow: `0 0 8px var(--bt-${scoreTone})`,
              }}
            />
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <SystemLabel tone="muted">Habits {activeHabits.length > 0 ? `${habitsDone}/${activeHabits.length}` : '—'}</SystemLabel>
              <SystemLabel tone="muted">Quests {todayTasks.length > 0 ? `${doneTasks.length}/${todayTasks.length}` : '—'}</SystemLabel>
              <SystemLabel tone="muted">Journal {journalLogged ? '✓' : '—'}</SystemLabel>
            </div>
          </GlassPane>

          {/* Habits */}
          <GlassPane tone="green" paneTitle="Habits"
            titleRight={<SystemLabel tone="success">{activeHabits.length > 0 ? `${habitsDone}/${activeHabits.length}` : '—'}</SystemLabel>}
            screenClassName="!p-5 flex flex-col gap-3">
            {activeHabits.length > 0 ? (
              <>
                <XPBar
                  value={(habitsDone / activeHabits.length) * 100}
                  max={100}
                  tone="teal"
                  ariaLabel="Habits done today"
                  className="[&>div]:w-full [&>div]:!h-full"
                  style={{ width: '100%', background: 'rgba(233,230,242,0.06)', border: '1px solid rgba(233,230,242,0.1)' }}
                  indicatorStyle={{
                    width: `${(habitsDone / activeHabits.length) * 100}%`,
                    background: 'linear-gradient(90deg, var(--arcade-gold-deep), var(--arcade-green))',
                    boxShadow: '0 0 8px var(--arcade-green)',
                  }}
                />
                {topStreak && topStreak.streak > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <PixelIcon name="fire" size={12} color="var(--bt-streak)" />
                    <SystemLabel tone="warning">
                      {topStreak.habit.name} — {topStreak.streak}d streak
                      {isHabitCompleted(topStreak.habit, todayLogs.find(l => l.habit_id === topStreak.habit.id))
                        ? ' · burning'
                        : ' · at risk'}
                    </SystemLabel>
                  </div>
                ) : (
                  <SystemLabel tone="muted">No active streaks</SystemLabel>
                )}
                <Link to="/habits" className="btn-text !p-0 !text-[10px] no-underline self-start" style={{ color: 'var(--bt-primary)' }}>
                  Open Habits →
                </Link>
              </>
            ) : (
              <SystemLabel tone="muted">No habits yet — build your instruments</SystemLabel>
            )}
          </GlassPane>

          {/* Journal */}
          <GlassPane tone="magenta" paneTitle="Journal"
            titleRight={journalLogged ? <PixelBadge tone="success">LOGGED</PixelBadge> : undefined}
            screenClassName="!p-5 flex flex-col gap-3">
            {journalLogged ? (
              <>
                <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--bt-text-dim)' }}>
                  "{todayJournal!.highlight}"{todayJournal!.mood ? ` ${todayJournal!.mood}` : ''}
                </p>
                <Link to="/journal" className="btn-text !p-0 !text-[10px] no-underline self-start" style={{ color: 'var(--bt-primary)' }}>
                  Read the diary →
                </Link>
              </>
            ) : (
              <>
                <SystemLabel tone="muted">End the day with one sentence. It counts toward today's score.</SystemLabel>
                <Link to="/journal" className="btn-text !p-0 !text-[10px] no-underline self-start" style={{ color: 'var(--bt-primary)' }}>
                  Write it →
                </Link>
              </>
            )}
          </GlassPane>

          {/* XP / Level */}
          <GlassPane tone="cobalt" paneTitle="Level"
            titleRight={<SystemLabel k="LVL" tone="primary">{stats.level}</SystemLabel>}
            screenClassName="!p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <SystemLabel tone="default">{stats.xp} / {xpPerLevel} XP</SystemLabel>
              <TerminalText tone="muted" className="!text-[10px]">{xpToNext} to next</TerminalText>
            </div>
            <XPBar
              value={xpProgress}
              max={100}
              ariaLabel="Level progress"
              className="[&>div]:w-full [&>div]:!h-full"
              style={{ width: '100%', background: 'rgba(233,230,242,0.06)', border: '1px solid rgba(139,92,246,0.25)' }}
              indicatorStyle={{
                width: `${xpProgress}%`,
                background: 'linear-gradient(90deg, var(--arcade-gold-deep), var(--arcade-gold))',
                boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
              }}
            />
            <SystemLabel tone="muted">Starred quests, habit check-ins and journal entries feed this bar.</SystemLabel>
          </GlassPane>
        </div>
      </div>
    </div>
  );
};
