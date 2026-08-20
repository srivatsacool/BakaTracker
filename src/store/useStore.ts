import { create } from 'zustand';
import type { Habit, HabitLog, Task, JournalEntry, Quote, Settings, UserStats, TaskArea, EventLog, CharacterRecord, WeeklyStatsRecord, EisenhowerQuadrant } from '../types';
import { stateService } from '../services/stateService';
import { ApiClient } from '../api/apiClient';
import { generateUUID } from '../lib/utils';
import { createHabit } from '../services/habits/createHabit';
import { deleteHabit } from '../services/habits/deleteHabit';
import { createTask } from '../services/tasks/createTask';
import { updateTask } from '../services/tasks/updateTask';
import { deleteTask } from '../services/tasks/deleteTask';
import { moveTask } from '../services/tasks/moveTask';
import { createJournalEntry } from '../services/journal/createJournalEntry';
import { updateJournalEntry } from '../services/journal/updateJournalEntry';
import { refreshQuote } from '../services/quotes/refreshQuote';
import { calculateCharacterStats } from '../services/stats/calculateCharacterStats';
import { backfillEvents } from '../services/stats/backfillEvents';
import { areaToStat } from '../services/stats/calculateXP';

interface BakaState {
  habits: Habit[];
  habitLogs: HabitLog[];
  tasks: Task[];
  journal: JournalEntry[];
  quotes: Quote[];
  events: EventLog[];
  settings: Settings;
  currentQuote: Quote | null;
  stats: UserStats;
  syncStatus: 'idle' | 'loading' | 'success' | 'error';
  syncError: string | null;
  character: CharacterRecord[];
  weeklyStats: WeeklyStatsRecord[];
  deletedTaskIds: string[];
  deletedHabitIds: string[];

  // Actions
  init: (apiClient?: ApiClient) => Promise<void>;
  syncWithSheets: (apiClient?: ApiClient) => Promise<void>;
  setSheetsUrl: (url: string) => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  resetStore: () => void;
  
  // Habits Actions
  toggleHabit: (id: string, date: string) => Promise<void>;
  incrementCounterHabit: (id: string, date: string, amount: number) => Promise<void>;
  setNumericHabit: (id: string, date: string, value: number) => Promise<void>;
  setMoodHabit: (id: string, date: string, mood: string) => Promise<void>;
  setEnergyHabit: (id: string, date: string, energy: string) => Promise<void>;
  addHabit: (habit: Omit<Habit, 'id' | 'active' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  
  // Tasks Actions
  addTask: (title: string, notes: string, area: TaskArea, xp: number, today: boolean, dueDate?: string) => Promise<void>;
  moveTask: (id: string, status: Task['status']) => Promise<void>;
  toggleTodayTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Journal Actions
  saveJournalEntry: (date: string, highlight: string, notes: string, mood: JournalEntry['mood']) => Promise<void>;
  
  // Quote Actions
  refreshQuote: () => void;

  // Theme Actions
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setAccentColors: (lightColor: string, darkColor: string) => void;

  // Eisenhower Action
  assignQuadrant: (taskId: string, quadrant: EisenhowerQuadrant) => Promise<void>;

  // Data Management
  loadDemoData: () => Promise<void>;
  clearDataByDays: (days: number | 'all') => Promise<void>;
}


const DEFAULT_QUOTES: Quote[] = [
  { id: 'q1', quote: 'Small progress is still progress.', author: 'Anonymous', category: 'Motivation', active: true },
  { id: 'q2', quote: 'Done is better than perfect.', author: 'Sheryl Sandberg', category: 'Consistency', active: true },
  { id: 'q3', quote: 'Consistency beats intensity.', author: 'Bruce Lee', category: 'Discipline', active: true },
  { id: 'q4', quote: 'Focus is a muscle, and you build it by using it.', author: 'Anonymous', category: 'Focus', active: true },
  { id: 'q5', quote: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear', category: 'Systems', active: true }
];

const applyAccentAndShadowColor = (theme: 'light' | 'dark', settings: Settings) => {
  const activeColor = theme === 'dark' 
    ? (settings.accent_color_dark || '#FF9F43') 
    : (settings.accent_color_light || '#FF9F43');
  document.documentElement.style.setProperty('--accent-pink', activeColor);
  
  if (theme === 'dark') {
    const cleanHex = activeColor.replace('#', '');
    let r = 255, g = 144, b = 232;
    if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    } else if (cleanHex.length === 3) {
      r = parseInt(cleanHex.charAt(0) + cleanHex.charAt(0), 16);
      g = parseInt(cleanHex.charAt(1) + cleanHex.charAt(1), 16);
      b = parseInt(cleanHex.charAt(2) + cleanHex.charAt(2), 16);
    }
    document.documentElement.style.setProperty('--shadow-color', `rgba(${r}, ${g}, ${b}, 0.45)`);
  } else {
    document.documentElement.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 1)');
  }
};

const getWeekStartDate = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getCharacterTitle = (level: number): string => {
  if (level >= 50) return 'Legendary Sage';
  if (level >= 40) return 'Ascended Master';
  if (level >= 30) return 'Elite Pathfinder';
  if (level >= 20) return 'Habit Champion';
  if (level >= 15) return 'Discipline Expert';
  if (level >= 10) return 'Steady Wanderer';
  if (level >= 5) return 'Initiate Scholar';
  return 'Novice Adventurer';
};

const compileCharacterRecord = (stats: UserStats): CharacterRecord[] => {
  const totalXp = stats.discipline + stats.health + stats.knowledge + stats.creativity + stats.career;
  return [{
    id: 'char_1',
    level: stats.level,
    total_xp: totalXp,
    discipline: stats.discipline,
    health: stats.health,
    knowledge: stats.knowledge,
    creativity: stats.creativity,
    career: stats.career,
    title: getCharacterTitle(stats.level),
    updated_at: new Date().toISOString()
  }];
};

const compileWeeklyStatsRecords = (events: EventLog[]): WeeklyStatsRecord[] => {
  const weeklyMap: Record<string, WeeklyStatsRecord> = {};
  
  events.forEach(event => {
    if (!event.timestamp) return;
    const weekStart = getWeekStartDate(event.timestamp);
    const xp = Number(event.xp) || 0;
    const stat = event.stat;
    
    if (!weeklyMap[weekStart]) {
      weeklyMap[weekStart] = {
        week_start: weekStart,
        xp: 0,
        health: 0,
        knowledge: 0,
        career: 0,
        creativity: 0,
        discipline: 0
      };
    }
    
    weeklyMap[weekStart].xp += xp;
    if (stat === 'health') weeklyMap[weekStart].health += xp;
    else if (stat === 'knowledge') weeklyMap[weekStart].knowledge += xp;
    else if (stat === 'career') weeklyMap[weekStart].career += xp;
    else if (stat === 'creativity') weeklyMap[weekStart].creativity += xp;
    else if (stat === 'discipline') weeklyMap[weekStart].discipline += xp;
  });
  
  return Object.values(weeklyMap).sort((a, b) => a.week_start.localeCompare(b.week_start));
};

const updateStatsAndSummaries = (
  set: any,
  get: any,
  habits: Habit[],
  logs: HabitLog[],
  tasks: Task[],
  journal: JournalEntry[],
  events: EventLog[]
) => {
  const { settings } = get();
  const newStats = calculateCharacterStats(habits, logs, tasks, journal, settings.xp_per_level);
  const characterRecords = compileCharacterRecord(newStats);
  const weeklyStatsRecords = compileWeeklyStatsRecords(events);
  
  set({
    stats: newStats,
    character: characterRecords,
    weeklyStats: weeklyStatsRecords
  });
  
  localStorage.setItem('bt_character', JSON.stringify(characterRecords));
  localStorage.setItem('bt_weekly_stats', JSON.stringify(weeklyStatsRecords));
};

// ---------------------------------------------------------------------------
// REST client holder (Phase 3: Cloudflare-native persistence)
//
// The v1 store is local-first: every mutation (addHabit/addTask/saveJournal…)
// calls syncWithSheets() with NO argument, and syncWithSheets early-returns
// when no ApiClient is passed. That made the D1 sync seam dead for
// authenticated users — data stayed in localStorage only.
//
// Fix: init(apiClient) stashes the client here (module-scoped so it survives
// React StrictMode remounts of the store consumer), and syncWithSheets falls
// back to it. Every existing mutation then pushes its change to the Worker
// (POST /api/v1/sync/push) under the authenticated user's sub, exactly as the
// v2 sync ledger expects. Guest/demo mode never passes a client -> no-op.
// ---------------------------------------------------------------------------
let apiClientHolder: ApiClient | null = null;

export const useStore = create<BakaState>((set, get) => ({
  habits: [],
  habitLogs: [],
  tasks: [],
  journal: [],
  quotes: DEFAULT_QUOTES,
  events: [],
  settings: { sheets_url: '', xp_per_level: 100, accent_color_light: '#FF9F43', accent_color_dark: '#2BA0FF', api_key: '' },
  currentQuote: DEFAULT_QUOTES[0],
  stats: { level: 1, xp: 0, discipline: 0, health: 0, knowledge: 0, creativity: 0, career: 0 },
  theme: 'dark',
  syncStatus: 'idle',
  syncError: null,
  character: [],
  weeklyStats: [],
  deletedTaskIds: [],
  deletedHabitIds: [],

  resetStore: () => {
    // Clear application local storage keys
    localStorage.removeItem('bt_habits');
    localStorage.removeItem('bt_logs');
    localStorage.removeItem('bt_tasks');
    localStorage.removeItem('bt_journal');
    localStorage.removeItem('bt_events');
    localStorage.removeItem('bt_character');
    localStorage.removeItem('bt_weekly_stats');
    localStorage.removeItem('bt_deleted_task_ids');
    localStorage.removeItem('bt_deleted_habit_ids');
    // Keep bt_theme, bt_sidebar_collapsed, and accent colors intact!

    // Reset store state to initial/default values
    set({
      habits: [],
      habitLogs: [],
      tasks: [],
      journal: [],
      quotes: DEFAULT_QUOTES,
      events: [],
      currentQuote: DEFAULT_QUOTES[0],
      stats: { level: 1, xp: 0, discipline: 0, health: 0, knowledge: 0, creativity: 0, career: 0 },
      character: [],
      weeklyStats: [],
      syncStatus: 'idle',
      syncError: null,
      deletedTaskIds: [],
      deletedHabitIds: [],
    });
  },

  init: async (apiClient?: ApiClient) => {
      // Phase 3: retain the REST client so mutations can push to D1 even when
      // call sites forget to pass it (v1 legacy sync calls).
      if (apiClient) apiClientHolder = apiClient;

      // 0. Load theme — the app is dark glass by design; default to dark when
      // no preference is stored, and honor an explicit light choice (the
      // legacy light theme is fully remapped to glass via the compat layer).
    const savedTheme = (localStorage.getItem('bt_theme') as 'light' | 'dark') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 1. Load from local storage first
    const storedHabits = localStorage.getItem('bt_habits');
    const storedLogs = localStorage.getItem('bt_logs');
    const storedTasks = localStorage.getItem('bt_tasks');
    const storedJournal = localStorage.getItem('bt_journal');
    const storedQuotes = localStorage.getItem('bt_quotes');
    const storedSettings = localStorage.getItem('bt_settings');
    const storedEvents = localStorage.getItem('bt_events');
    const storedCharacter = localStorage.getItem('bt_character');
    const storedWeeklyStats = localStorage.getItem('bt_weekly_stats');

    const habits = storedHabits ? JSON.parse(storedHabits) : [];
    const habitLogs = storedLogs ? JSON.parse(storedLogs) : [];
    const tasks = storedTasks ? JSON.parse(storedTasks) : [];
    const journal = storedJournal ? JSON.parse(storedJournal) : [];
    const quotes = storedQuotes ? JSON.parse(storedQuotes) : DEFAULT_QUOTES;
    const settings = storedSettings ? JSON.parse(storedSettings) : { sheets_url: '', xp_per_level: 100, accent_color_light: '#FF9F43', accent_color_dark: '#2BA0FF', api_key: '' };
    let events = storedEvents ? JSON.parse(storedEvents) : [];

    if (!settings.accent_color_light) settings.accent_color_light = '#FF9F43';
    if (!settings.accent_color_dark) settings.accent_color_dark = '#2BA0FF';
    if (!settings.api_key) settings.api_key = '';

    // Normalize and migrate database objects (Ensure UUIDs and timestamps exist)
    const normalizedLogs = habitLogs.map((log: any) => ({
      id: log.id || generateUUID('log_'),
      date: log.date,
      habit_id: log.habit_id,
      value: log.value,
      xp_earned: Number(log.xp_earned) || 0,
      created_at: log.created_at || new Date().toISOString()
    }));

    const normalizedHabits = habits.map((h: any) => ({
      ...h,
      created_at: h.created_at || new Date().toISOString(),
      updated_at: h.updated_at || new Date().toISOString()
    }));

    const normalizedTasks = tasks.map((t: any) => ({
      ...t,
      quadrant: t.quadrant !== undefined ? t.quadrant : null,
      updated_at: t.updated_at || t.created_at || new Date().toISOString(),
      created_at: t.created_at || new Date().toISOString(),
      completed_at: t.completed_at || ''
    }));

    const normalizedJournal = journal.map((j: any) => ({
      id: j.id || generateUUID('journal_'),
      date: j.date,
      highlight: j.highlight,
      notes: j.notes,
      mood: j.mood,
      quote_id: j.quote_id || 'q1',
      created_at: j.created_at || new Date().toISOString(),
      updated_at: j.updated_at || new Date().toISOString()
    }));

    const randomQuote = quotes.length > 0 
      ? quotes[Math.floor(Math.random() * quotes.length)]
      : DEFAULT_QUOTES[0];

    // Reconstruct events if empty but past logs exist
    if (events.length === 0 && (normalizedLogs.length > 0 || normalizedTasks.length > 0 || normalizedJournal.length > 0)) {
      events = backfillEvents(normalizedHabits, normalizedLogs, normalizedTasks, normalizedJournal);
      localStorage.setItem('bt_events', JSON.stringify(events));
    }

    const stats = calculateCharacterStats(normalizedHabits, normalizedLogs, normalizedTasks, normalizedJournal, settings.xp_per_level);
    const character = storedCharacter ? JSON.parse(storedCharacter) : compileCharacterRecord(stats);
    const weeklyStats = storedWeeklyStats ? JSON.parse(storedWeeklyStats) : compileWeeklyStatsRecords(events);

    applyAccentAndShadowColor(savedTheme, settings);

    set({
      habits: normalizedHabits,
      habitLogs: normalizedLogs,
      tasks: normalizedTasks,
      journal: normalizedJournal,
      quotes,
      events,
      settings,
      currentQuote: randomQuote,
      stats,
      theme: savedTheme,
      character,
      weeklyStats
    });

    // Save normalized objects back to localStorage
    localStorage.setItem('bt_habits', JSON.stringify(normalizedHabits));
    localStorage.setItem('bt_logs', JSON.stringify(normalizedLogs));
    localStorage.setItem('bt_tasks', JSON.stringify(normalizedTasks));
    localStorage.setItem('bt_journal', JSON.stringify(normalizedJournal));
    localStorage.setItem('bt_events', JSON.stringify(events));
    localStorage.setItem('bt_character', JSON.stringify(character));
    localStorage.setItem('bt_weekly_stats', JSON.stringify(weeklyStats));
    if (!storedQuotes) localStorage.setItem('bt_quotes', JSON.stringify(quotes));
    if (!storedSettings) localStorage.setItem('bt_settings', JSON.stringify(settings));

    // 2. If apiClient is provided, fetch from backend proxy
    if (apiClient) {
      try {
        set({ syncStatus: 'loading' });
        const remoteData = await stateService.fetchData(apiClient);
        if (remoteData) {
          // Merge settings
          const remoteSettings: Settings = { ...settings };
          remoteData.settings.forEach(s => {
            if (s.key === 'sheets_url') remoteSettings.sheets_url = s.value;
            if (s.key === 'xp_per_level') remoteSettings.xp_per_level = Number(s.value) || 100;
            if (s.key === 'api_key') remoteSettings.api_key = s.value;
          });

          // Update state with remote data (using normalize logic for protection)
          const newHabits = (remoteData.habits.length > 0 ? remoteData.habits : normalizedHabits).map((h: any) => ({
            ...h,
            created_at: h.created_at || new Date().toISOString(),
            updated_at: h.updated_at || new Date().toISOString()
          }));
          const newLogs = remoteData.habitLogs.map((log: any) => ({
            id: log.id || generateUUID('log_'),
            date: log.date,
            habit_id: log.habit_id,
            value: log.value,
            xp_earned: Number(log.xp_earned) || 0,
            created_at: log.created_at || new Date().toISOString()
          }));
          const newTasks = remoteData.tasks.map((t: any) => ({
            ...t,
            updated_at: t.updated_at || t.created_at || new Date().toISOString(),
            created_at: t.created_at || new Date().toISOString(),
            completed_at: t.completed_at || ''
          }));
          const newJournal = remoteData.journal.map((j: any) => ({
            id: j.id || generateUUID('journal_'),
            date: j.date,
            highlight: j.highlight,
            notes: j.notes,
            mood: j.mood,
            quote_id: j.quote_id || 'q1',
            created_at: j.created_at || new Date().toISOString(),
            updated_at: j.updated_at || new Date().toISOString()
          }));
          const newQuotes = remoteData.quotes.length > 0 ? remoteData.quotes : quotes;
          
          let newEvents = remoteData.events || [];
          if (newEvents.length === 0 && (newLogs.length > 0 || newTasks.length > 0 || newJournal.length > 0)) {
            newEvents = backfillEvents(newHabits, newLogs, newTasks, newJournal);
          }

          // Recalculate stats
          const newStats = calculateCharacterStats(newHabits, newLogs, newTasks, newJournal, remoteSettings.xp_per_level);
          const newCharacterRecords = compileCharacterRecord(newStats);
          const newWeeklyStatsRecords = compileWeeklyStatsRecords(newEvents);

          set({
            habits: newHabits,
            habitLogs: newLogs,
            tasks: newTasks,
            journal: newJournal,
            quotes: newQuotes,
            events: newEvents,
            settings: remoteSettings,
            currentQuote: newQuotes[Math.floor(Math.random() * newQuotes.length)],
            stats: newStats,
            syncStatus: 'success',
            character: newCharacterRecords,
            weeklyStats: newWeeklyStatsRecords
          });

          // Save to local storage
          localStorage.setItem('bt_habits', JSON.stringify(newHabits));
          localStorage.setItem('bt_logs', JSON.stringify(newLogs));
          localStorage.setItem('bt_tasks', JSON.stringify(newTasks));
          localStorage.setItem('bt_journal', JSON.stringify(newJournal));
          localStorage.setItem('bt_quotes', JSON.stringify(newQuotes));
          localStorage.setItem('bt_events', JSON.stringify(newEvents));
          localStorage.setItem('bt_settings', JSON.stringify(remoteSettings));
          localStorage.setItem('bt_character', JSON.stringify(newCharacterRecords));
          localStorage.setItem('bt_weekly_stats', JSON.stringify(newWeeklyStatsRecords));
        }
      } catch (err: any) {
        console.error('Initial sync failed:', err);
        set({ syncStatus: 'error', syncError: err.message });
      }
    }
  },

  syncWithSheets: async (apiClient) => {
      const { settings, habits, habitLogs, tasks, journal, events, character, weeklyStats, deletedTaskIds, deletedHabitIds } = get();
      // Phase 3: fall back to the client stashed by init(apiClient), so the v1
      // mutation call sites (syncWithSheets() with no args) persist to D1 for
      // authenticated users instead of silently no-op'ing.
      const client = apiClient || apiClientHolder;
      if (!client) return;

    try {
      set({ syncStatus: 'loading', syncError: null });
      const formatSettings = [
        { key: 'sheets_url', value: settings.sheets_url },
        { key: 'xp_per_level', value: String(settings.xp_per_level) },
        { key: 'api_key', value: settings.api_key || '' }
      ];

      const formatMetadata = [
        { schema_version: '2.0', xp_formula: 'completed_tasks_if_today + habit_logs + journal_highlights', last_sync: new Date().toISOString() }
      ];

      const success = await stateService.syncData(client, {
        habits,
        habitLogs,
        tasks,
        journal,
        events,
        deletedTaskIds,
        deletedHabitIds,
        settings: formatSettings,
        metadata: formatMetadata,
        character,
        weeklyStats
      });

      if (success) {
        // v2.4: clear tombstone queues after successful sync so we don't re-emit
        // delete ops on every subsequent sync.
        set({ deletedTaskIds: [], deletedHabitIds: [] });
        localStorage.setItem('bt_deleted_task_ids', '[]');
        localStorage.setItem('bt_deleted_habit_ids', '[]');
        set({ syncStatus: 'success' });
      } else {
        throw new Error('Sync returned false status');
      }
    } catch (err: any) {
      set({ syncStatus: 'error', syncError: err.message });
    }
  },

  setSheetsUrl: async (url: string) => {
    const newSettings = { ...get().settings, sheets_url: url };
    set({ settings: newSettings });
    localStorage.setItem('bt_settings', JSON.stringify(newSettings));
    
    if (url) {
      await get().init(); // Refetch data
    }
  },

  setApiKey: async (key: string) => {
    const newSettings = { ...get().settings, api_key: key };
    set({ settings: newSettings });
    localStorage.setItem('bt_settings', JSON.stringify(newSettings));
    
    if (newSettings.sheets_url) {
      await get().syncWithSheets();
    }
  },

  toggleHabit: async (id: string, date: string) => {
    const { habits, habitLogs, tasks, journal, events } = get();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const existingIndex = habitLogs.findIndex(l => l.habit_id === id && l.date === date);
    const newLogs = [...habitLogs];
    let newEvents = [...events];

    if (existingIndex > -1) {
      const existingVal = newLogs[existingIndex].value;
      if (existingVal === 1 || existingVal === '1' || (existingVal as any) === true) {
        // Uncheck
        newLogs.splice(existingIndex, 1);
        newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
      } else {
        // Check
        newLogs[existingIndex] = {
          ...newLogs[existingIndex],
          value: 1,
          xp_earned: habit.xp
        };
        newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
        newEvents.push({
          id: generateUUID('evt_'),
          type: 'habit_completed',
          source: 'habit',
          entity: habit.name,
          entity_id: habit.id,
          xp: habit.xp,
          stat: habit.stat,
          timestamp: new Date(date + 'T12:00:00').toISOString()
        });
      }
    } else {
      // Check
      newLogs.push({
        id: generateUUID('log_'),
        date,
        habit_id: id,
        value: 1,
        xp_earned: habit.xp,
        created_at: new Date().toISOString()
      });
      newEvents.push({
        id: generateUUID('evt_'),
        type: 'habit_completed',
        source: 'habit',
        entity: habit.name,
        entity_id: habit.id,
        xp: habit.xp,
        stat: habit.stat,
        timestamp: new Date(date + 'T12:00:00').toISOString()
      });
    }

    set({ habitLogs: newLogs, events: newEvents });
    localStorage.setItem('bt_logs', JSON.stringify(newLogs));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    updateStatsAndSummaries(set, get, habits, newLogs, tasks, journal, newEvents);
    
    // Auto background sync
    get().syncWithSheets().catch(console.error);
  },

  incrementCounterHabit: async (id: string, date: string, amount: number) => {
    const { habits, habitLogs, tasks, journal, events } = get();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const existingIndex = habitLogs.findIndex(l => l.habit_id === id && l.date === date);
    const newLogs = [...habitLogs];
    let newEvents = [...events];

    if (existingIndex > -1) {
      const currentVal = Number(newLogs[existingIndex].value) || 0;
      const newVal = Math.max(0, currentVal + amount);
      if (newVal === 0) {
        newLogs.splice(existingIndex, 1);
        newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
      } else {
        newLogs[existingIndex] = {
          ...newLogs[existingIndex],
          value: newVal,
          xp_earned: newVal * habit.xp
        };
        newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
        newEvents.push({
          id: generateUUID('evt_'),
          type: 'habit_completed',
          source: 'habit',
          entity: habit.name,
          entity_id: habit.id,
          xp: newVal * habit.xp,
          stat: habit.stat,
          metadata: JSON.stringify({ value: newVal }),
          timestamp: new Date(date + 'T12:00:00').toISOString()
        });
      }
    } else if (amount > 0) {
      newLogs.push({
        id: generateUUID('log_'),
        date,
        habit_id: id,
        value: amount,
        xp_earned: amount * habit.xp,
        created_at: new Date().toISOString()
      });
      newEvents.push({
        id: generateUUID('evt_'),
        type: 'habit_completed',
        source: 'habit',
        entity: habit.name,
        entity_id: habit.id,
        xp: amount * habit.xp,
        stat: habit.stat,
        metadata: JSON.stringify({ value: amount }),
        timestamp: new Date(date + 'T12:00:00').toISOString()
      });
    }

    set({ habitLogs: newLogs, events: newEvents });
    localStorage.setItem('bt_logs', JSON.stringify(newLogs));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    updateStatsAndSummaries(set, get, habits, newLogs, tasks, journal, newEvents);
    
    get().syncWithSheets().catch(console.error);
  },

  setNumericHabit: async (id: string, date: string, value: number) => {
    const { habits, habitLogs, tasks, journal, events } = get();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const existingIndex = habitLogs.findIndex(l => l.habit_id === id && l.date === date);
    const newLogs = [...habitLogs];
    let newEvents = [...events];

    if (value <= 0) {
      if (existingIndex > -1) newLogs.splice(existingIndex, 1);
      newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
    } else {
      if (existingIndex > -1) {
        newLogs[existingIndex] = {
          ...newLogs[existingIndex],
          value: value,
          xp_earned: habit.xp
        };
      } else {
        newLogs.push({
          id: generateUUID('log_'),
          date,
          habit_id: id,
          value: value,
          xp_earned: habit.xp,
          created_at: new Date().toISOString()
        });
      }
      newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
      newEvents.push({
        id: generateUUID('evt_'),
        type: 'habit_completed',
        source: 'habit',
        entity: habit.name,
        entity_id: habit.id,
        xp: habit.xp,
        stat: habit.stat,
        metadata: JSON.stringify({ value }),
        timestamp: new Date(date + 'T12:00:00').toISOString()
      });
    }

    set({ habitLogs: newLogs, events: newEvents });
    localStorage.setItem('bt_logs', JSON.stringify(newLogs));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    updateStatsAndSummaries(set, get, habits, newLogs, tasks, journal, newEvents);
    
    get().syncWithSheets().catch(console.error);
  },

  setMoodHabit: async (id: string, date: string, mood: string) => {
    const { habits, habitLogs, tasks, journal, events } = get();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const existingIndex = habitLogs.findIndex(l => l.habit_id === id && l.date === date);
    const newLogs = [...habitLogs];
    let newEvents = [...events];

    if (!mood) {
      if (existingIndex > -1) newLogs.splice(existingIndex, 1);
      newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
    } else {
      if (existingIndex > -1) {
        newLogs[existingIndex] = {
          ...newLogs[existingIndex],
          value: mood,
          xp_earned: habit.xp
        };
      } else {
        newLogs.push({
          id: generateUUID('log_'),
          date,
          habit_id: id,
          value: mood,
          xp_earned: habit.xp,
          created_at: new Date().toISOString()
        });
      }
      newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
      newEvents.push({
        id: generateUUID('evt_'),
        type: 'habit_completed',
        source: 'habit',
        entity: habit.name,
        entity_id: habit.id,
        xp: habit.xp,
        stat: habit.stat,
        metadata: JSON.stringify({ value: mood }),
        timestamp: new Date(date + 'T12:00:00').toISOString()
      });
    }

    set({ habitLogs: newLogs, events: newEvents });
    localStorage.setItem('bt_logs', JSON.stringify(newLogs));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    updateStatsAndSummaries(set, get, habits, newLogs, tasks, journal, newEvents);
    
    get().syncWithSheets().catch(console.error);
  },

  setEnergyHabit: async (id: string, date: string, energy: string) => {
    const { habits, habitLogs, tasks, journal, events } = get();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const existingIndex = habitLogs.findIndex(l => l.habit_id === id && l.date === date);
    const newLogs = [...habitLogs];
    let newEvents = [...events];

    if (!energy) {
      if (existingIndex > -1) newLogs.splice(existingIndex, 1);
      newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
    } else {
      if (existingIndex > -1) {
        newLogs[existingIndex] = {
          ...newLogs[existingIndex],
          value: energy,
          xp_earned: habit.xp
        };
      } else {
        newLogs.push({
          id: generateUUID('log_'),
          date,
          habit_id: id,
          value: energy,
          xp_earned: habit.xp,
          created_at: new Date().toISOString()
        });
      }
      newEvents = newEvents.filter(e => !(e.entity_id === id && e.timestamp.startsWith(date)));
      newEvents.push({
        id: generateUUID('evt_'),
        type: 'habit_completed',
        source: 'habit',
        entity: habit.name,
        entity_id: habit.id,
        xp: habit.xp,
        stat: habit.stat,
        metadata: JSON.stringify({ value: energy }),
        timestamp: new Date(date + 'T12:00:00').toISOString()
      });
    }

    set({ habitLogs: newLogs, events: newEvents });
    localStorage.setItem('bt_logs', JSON.stringify(newLogs));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    updateStatsAndSummaries(set, get, habits, newLogs, tasks, journal, newEvents);
    
    get().syncWithSheets().catch(console.error);
  },

  addHabit: async (newHabit: Omit<Habit, 'id' | 'active' | 'created_at' | 'updated_at'>) => {
    const { habits, habitLogs, tasks, journal, events } = get();
    const fullHabit = createHabit(
      newHabit.name,
      newHabit.type,
      newHabit.icon,
      newHabit.xp,
      newHabit.stat
    );
    const updatedHabits = [...habits, fullHabit];
    set({ habits: updatedHabits });
    localStorage.setItem('bt_habits', JSON.stringify(updatedHabits));
    updateStatsAndSummaries(set, get, updatedHabits, habitLogs, tasks, journal, events);
    
    get().syncWithSheets().catch(console.error);
  },

  deleteHabit: async (id: string) => {
    const { habits, habitLogs, tasks, journal, events, deletedHabitIds } = get();
    const result = deleteHabit(id, habits, habitLogs);
    const newEvents = events.filter(e => e.entity_id !== id || e.type !== 'habit_completed');
    const newDeleted = [...deletedHabitIds, id];

    set({ habits: result.habits, habitLogs: result.logs, events: newEvents, deletedHabitIds: newDeleted });
    localStorage.setItem('bt_habits', JSON.stringify(result.habits));
    localStorage.setItem('bt_logs', JSON.stringify(result.logs));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    localStorage.setItem('bt_deleted_habit_ids', JSON.stringify(newDeleted));
    updateStatsAndSummaries(set, get, result.habits, result.logs, tasks, journal, newEvents);
    
    get().syncWithSheets().catch(console.error);
  },

  addTask: async (title: string, notes: string, area: TaskArea, xp: number, today: boolean, dueDate?: string) => {
    const { tasks, habits, habitLogs, journal, events } = get();
    const newTask = createTask(title, notes, area, xp, today, dueDate);
    const updatedTasks = [...tasks, newTask];

    set({ tasks: updatedTasks });
    localStorage.setItem('bt_tasks', JSON.stringify(updatedTasks));
    updateStatsAndSummaries(set, get, habits, habitLogs, updatedTasks, journal, events);
    
    get().syncWithSheets().catch(console.error);
  },

  moveTask: async (id: string, status: Task['status']) => {
    const { tasks, habits, habitLogs, journal, events } = get();
    let newEvents = [...events];
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const oldStatus = task.status;
    const updatedTasks = tasks.map(t => {
      if (t.id === id) {
        return moveTask(t, status);
      }
      return t;
    });

    if (status === 'done' && oldStatus !== 'done' && task.today) {
      const completedAt = new Date().toISOString();
      newEvents.push({
        id: generateUUID('evt_'),
        type: 'task_completed',
        source: 'task',
        entity: task.title,
        entity_id: task.id,
        xp: task.xp,
        stat: areaToStat(task.area),
        metadata: JSON.stringify({ area: task.area }),
        timestamp: completedAt
      });
    } else if (oldStatus === 'done' && status !== 'done') {
      newEvents = newEvents.filter(e => !(e.entity_id === id && e.type === 'task_completed'));
    }

    set({ tasks: updatedTasks, events: newEvents });
    localStorage.setItem('bt_tasks', JSON.stringify(updatedTasks));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    updateStatsAndSummaries(set, get, habits, habitLogs, updatedTasks, journal, newEvents);
    
    get().syncWithSheets().catch(console.error);
  },

  toggleTodayTask: async (id: string) => {
    const { tasks } = get();
    const updatedTasks = tasks.map(t => {
      if (t.id === id) {
        return updateTask(t, { today: !t.today });
      }
      return t;
    });
    set({ tasks: updatedTasks });
    localStorage.setItem('bt_tasks', JSON.stringify(updatedTasks));
    
    get().syncWithSheets().catch(console.error);
  },

  deleteTask: async (id: string) => {
    const { tasks, habits, habitLogs, journal, events, deletedTaskIds } = get();
    const updatedTasks = deleteTask(id, tasks);
    const newEvents = events.filter(e => e.entity_id !== id || e.type !== 'task_completed');
    const newDeleted = [...deletedTaskIds, id];

    set({ tasks: updatedTasks, events: newEvents, deletedTaskIds: newDeleted });
    localStorage.setItem('bt_tasks', JSON.stringify(updatedTasks));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    localStorage.setItem('bt_deleted_task_ids', JSON.stringify(newDeleted));
    updateStatsAndSummaries(set, get, habits, habitLogs, updatedTasks, journal, newEvents);
    
    get().syncWithSheets().catch(console.error);
  },

  saveJournalEntry: async (date: string, highlight: string, notes: string, mood: JournalEntry['mood']) => {
    const { journal, currentQuote, habits, habitLogs, tasks, events } = get();
    const existingIndex = journal.findIndex(j => j.date === date);
    const newJournal = [...journal];
    let newEvents = [...events];

    const quoteId = currentQuote ? currentQuote.id : 'q1';
    let entryId = generateUUID('journal_');

    if (existingIndex > -1) {
      entryId = newJournal[existingIndex].id;
      newJournal[existingIndex] = updateJournalEntry(newJournal[existingIndex], {
        highlight,
        notes,
        mood,
        quote_id: quoteId
      });
    } else {
      const entry = createJournalEntry(date, highlight, notes, mood, quoteId);
      entryId = entry.id;
      newJournal.push(entry);
    }

    newEvents = newEvents.filter(e => !(e.entity_id === entryId && e.type === 'journal_created'));
    if (highlight && highlight.trim()) {
      newEvents.push({
        id: generateUUID('evt_'),
        type: 'journal_created',
        source: 'journal',
        entity: 'Daily Reflection Logged',
        entity_id: entryId,
        xp: 10,
        stat: 'discipline',
        timestamp: new Date(date + 'T12:00:00').toISOString()
      });
    }

    set({ journal: newJournal, events: newEvents });
    localStorage.setItem('bt_journal', JSON.stringify(newJournal));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    updateStatsAndSummaries(set, get, habits, habitLogs, tasks, newJournal, newEvents);
    
    get().syncWithSheets().catch(console.error);
  },

  refreshQuote: () => {
    const { quotes, currentQuote } = get();
    const nextQuote = refreshQuote(quotes, currentQuote?.id);
    if (nextQuote) {
      set({ currentQuote: nextQuote });
    }
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'light' ? 'dark' : 'light';
    set({ theme: next });
    localStorage.setItem('bt_theme', next);
    
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const { settings } = get();
    applyAccentAndShadowColor(next, settings);
  },

  setAccentColors: (lightColor: string, darkColor: string) => {
    const { settings, theme } = get();
    const newSettings = {
      ...settings,
      accent_color_light: lightColor,
      accent_color_dark: darkColor
    };
    set({ settings: newSettings });
    localStorage.setItem('bt_settings', JSON.stringify(newSettings));

    applyAccentAndShadowColor(theme, newSettings);

    // Auto background sync
    get().syncWithSheets().catch(console.error);
  },

  assignQuadrant: async (taskId: string, quadrant: EisenhowerQuadrant) => {
    const { tasks } = get();
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, quadrant, updated_at: new Date().toISOString() } : t
    );
    set({ tasks: updatedTasks });
    localStorage.setItem('bt_tasks', JSON.stringify(updatedTasks));
    get().syncWithSheets().catch(console.error);
  },

  loadDemoData: async () => {
    const state = get();
    // Guard: don't re-load if already loaded (prevents Strict Mode double-fire)
    if (state.habits.length > 0 || state.tasks.length > 0) return;
    const { addHabit, addTask, saveJournalEntry } = state;
    const today = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dayOffset = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };

    // Add Habits
    await addHabit({ name: 'Morning Workout', type: 'checkbox', icon: '💪', xp: 10, stat: 'health' });
    await addHabit({ name: 'Read Pages', type: 'counter', icon: '📖', xp: 2, stat: 'knowledge' });
    await addHabit({ name: 'Mood Check', type: 'mood', icon: '😊', xp: 5, stat: 'discipline' });
    await addHabit({ name: 'Hours of Sleep', type: 'numeric', icon: '🌙', xp: 5, stat: 'health' });
    await addHabit({ name: 'Meditation', type: 'checkbox', icon: '🧘', xp: 8, stat: 'discipline' });
    await addHabit({ name: 'Learn Something', type: 'checkbox', icon: '🎯', xp: 7, stat: 'knowledge' });

    // Add Tasks (with quadrant via direct store injection after addTask)
    await addTask('Review weekly goals', 'Plan and review your objectives for the week', 'career', 15, false);
    await addTask('Plan this month', 'Set monthly targets for all life areas', 'career', 20, false);
    await addTask('Review operations report', 'Turn the latest notes into a clear report outline', 'career', 25, true);
    await addTask('Start morning routine', 'Design a 30-minute morning routine including exercise and reflection', 'health', 20, true);
    await addTask("Write today's journal", 'Daily reflection and highlight entry', 'personal', 10, true);
    await addTask('Complete app onboarding', 'Finish the BakaTracker setup and first tour', 'personal', 15, false);

    // Move some tasks to different statuses
    const { tasks: tasksAfter } = get();
    const findTask = (title: string) => tasksAfter.find(t => t.title === title);
    const doingTask = findTask("Write today's journal");
    const doneTask = findTask('Complete app onboarding');
    if (doingTask) await get().moveTask(doingTask.id, 'doing');
    if (doneTask) await get().moveTask(doneTask.id, 'done');

    // Assign quadrants
    const q_do = findTask('Review operations report');
    const q_do2 = findTask('Complete app onboarding');
    const q_sched = findTask('Start morning routine');
    const q_sched2 = findTask("Write today's journal");
    const q_sched3 = findTask('Review weekly goals');
    const q_delegate = findTask('Plan this month');
    if (q_do) await get().assignQuadrant(q_do.id, 'do');
    if (q_do2) await get().assignQuadrant(q_do2.id, 'do');
    if (q_sched) await get().assignQuadrant(q_sched.id, 'schedule');
    if (q_sched2) await get().assignQuadrant(q_sched2.id, 'schedule');
    if (q_sched3) await get().assignQuadrant(q_sched3.id, 'schedule');
    if (q_delegate) await get().assignQuadrant(q_delegate.id, 'delegate');

    // Journal entries
    const moods: JournalEntry['mood'][] = ['🙂', '🙂', '😐', '😞', '🙂'];
    const highlights = [
      'Started using BakaTracker — excited to build better habits!',
      'Had a productive morning routine session. Feeling focused.',
      'Decent day, got a few tasks done but could have done more.',
      'Tough day. Skipped workout but journaled — still a win.',
      'Great day! All habits completed and feeling on top of things.',
    ];
    for (let i = 4; i >= 0; i--) {
      await saveJournalEntry(
        fmt(dayOffset(i)),
        highlights[4 - i],
        '',
        moods[4 - i]
      );
    }

    // Backfill habit logs for 7 days
    const { habits: demoHabits } = get();
    const workoutHabit = demoHabits.find(h => h.name === 'Morning Workout');
    const pagesHabit = demoHabits.find(h => h.name === 'Read Pages');
    const sleepHabit = demoHabits.find(h => h.name === 'Hours of Sleep');
    const meditationHabit = demoHabits.find(h => h.name === 'Meditation');
    const learnHabit = demoHabits.find(h => h.name === 'Learn Something');

    const workoutDays = [0, 1, 3, 4, 5]; // skip day 2 & 6
    const meditationDays = [0, 1, 2, 4, 6];
    const learnDays = [0, 1, 2, 3, 5];
    const sleepValues = [7, 6, 8, 7, 6, 8, 7];
    const pagesValues = [20, 15, 30, 10, 25, 18, 22];

    const newLogs: HabitLog[] = [];
    const newEvents: EventLog[] = [];

    for (let i = 6; i >= 0; i--) {
      const dateStr = fmt(dayOffset(i));
      const dayIdx = 6 - i;

      if (workoutHabit && workoutDays.includes(dayIdx)) {
        newLogs.push({ id: generateUUID('log_'), date: dateStr, habit_id: workoutHabit.id, value: 1, xp_earned: workoutHabit.xp, created_at: new Date(dateStr+'T08:00:00').toISOString() });
        newEvents.push({ id: generateUUID('evt_'), type: 'habit_completed', source: 'habit', entity: workoutHabit.name, entity_id: workoutHabit.id, xp: workoutHabit.xp, stat: workoutHabit.stat, timestamp: new Date(dateStr+'T08:00:00').toISOString() });
      }
      if (pagesHabit) {
        const val = pagesValues[dayIdx];
        newLogs.push({ id: generateUUID('log_'), date: dateStr, habit_id: pagesHabit.id, value: val, xp_earned: val * pagesHabit.xp, created_at: new Date(dateStr+'T09:00:00').toISOString() });
        newEvents.push({ id: generateUUID('evt_'), type: 'habit_completed', source: 'habit', entity: pagesHabit.name, entity_id: pagesHabit.id, xp: val * pagesHabit.xp, stat: pagesHabit.stat, metadata: JSON.stringify({ value: val }), timestamp: new Date(dateStr+'T09:00:00').toISOString() });
      }
      if (sleepHabit) {
        const val = sleepValues[dayIdx];
        newLogs.push({ id: generateUUID('log_'), date: dateStr, habit_id: sleepHabit.id, value: val, xp_earned: sleepHabit.xp, created_at: new Date(dateStr+'T07:00:00').toISOString() });
      }
      if (meditationHabit && meditationDays.includes(dayIdx)) {
        newLogs.push({ id: generateUUID('log_'), date: dateStr, habit_id: meditationHabit.id, value: 1, xp_earned: meditationHabit.xp, created_at: new Date(dateStr+'T06:30:00').toISOString() });
        newEvents.push({ id: generateUUID('evt_'), type: 'habit_completed', source: 'habit', entity: meditationHabit.name, entity_id: meditationHabit.id, xp: meditationHabit.xp, stat: meditationHabit.stat, timestamp: new Date(dateStr+'T06:30:00').toISOString() });
      }
      if (learnHabit && learnDays.includes(dayIdx)) {
        newLogs.push({ id: generateUUID('log_'), date: dateStr, habit_id: learnHabit.id, value: 1, xp_earned: learnHabit.xp, created_at: new Date(dateStr+'T20:00:00').toISOString() });
        newEvents.push({ id: generateUUID('evt_'), type: 'habit_completed', source: 'habit', entity: learnHabit.name, entity_id: learnHabit.id, xp: learnHabit.xp, stat: learnHabit.stat, timestamp: new Date(dateStr+'T20:00:00').toISOString() });
      }
    }

    const { habitLogs: existingLogs, events: existingEvents, habits: finalHabits, tasks: finalTasks, journal: finalJournal } = get();
    const mergedLogs = [...existingLogs, ...newLogs];
    const mergedEvents = [...existingEvents, ...newEvents];
    set({ habitLogs: mergedLogs, events: mergedEvents });
    localStorage.setItem('bt_logs', JSON.stringify(mergedLogs));
    localStorage.setItem('bt_events', JSON.stringify(mergedEvents));
    updateStatsAndSummaries(set, get, finalHabits, mergedLogs, finalTasks, finalJournal, mergedEvents);
    get().syncWithSheets().catch(console.error);
  },

  clearDataByDays: async (days: number | 'all') => {
    if (days === 'all') {
      // Nuclear clear — reset everything
      localStorage.removeItem('bt_habits');
      localStorage.removeItem('bt_logs');
      localStorage.removeItem('bt_tasks');
      localStorage.removeItem('bt_journal');
      localStorage.removeItem('bt_events');
      localStorage.removeItem('bt_character');
      localStorage.removeItem('bt_weekly_stats');
      localStorage.removeItem('bt_first_run'); // wizard re-appears
      set({
        habits: [],
        habitLogs: [],
        tasks: [],
        journal: [],
        events: [],
        currentQuote: DEFAULT_QUOTES[0],
        stats: { level: 1, xp: 0, discipline: 0, health: 0, knowledge: 0, creativity: 0, career: 0 },
        character: [],
        weeklyStats: [],
        syncStatus: 'idle',
        syncError: null,
      });
      get().syncWithSheets().catch(console.error);
      return;
    }

    const { habits, habitLogs, tasks, journal, events } = get();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days as number));
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;

    const newLogs = habitLogs.filter(l => l.date < cutoffStr);
    const newTasks = tasks.filter(t => (t.created_at || '').slice(0,10) < cutoffStr);
    const newJournal = journal.filter(j => j.date < cutoffStr);
    const newEvents = events.filter(e => (e.timestamp || '').slice(0,10) < cutoffStr);

    set({ habitLogs: newLogs, tasks: newTasks, journal: newJournal, events: newEvents });
    localStorage.setItem('bt_logs', JSON.stringify(newLogs));
    localStorage.setItem('bt_tasks', JSON.stringify(newTasks));
    localStorage.setItem('bt_journal', JSON.stringify(newJournal));
    localStorage.setItem('bt_events', JSON.stringify(newEvents));
    updateStatsAndSummaries(set, get, habits, newLogs, newTasks, newJournal, newEvents);
    get().syncWithSheets().catch(console.error);
  },
}));
