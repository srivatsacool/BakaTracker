/**
 * Canonical Tool Registry for Client & WebMCP Execution
 *
 * Exposes canonical schemas and metadata for all platform tools.
 * Routes local-first entities to Zustand store and server entities to REST.
 */

import type { ToolDefinition } from './types';
import { useStore } from '../../store/useStore';
import type { Habit, JournalEntry, TaskArea, Task, StatType } from '../../types';

export const toolRegistry: Record<string, ToolDefinition> = {
  // --- Tasks (Local-First Store) ---
  list_tasks: {
    name: 'list_tasks',
    description: "List the user's tasks, optionally filtered by status ('todo' | 'in_progress' | 'done').",
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'], description: 'Optional status filter' },
        limit: { type: 'number', description: 'Max number of tasks to return (default: 200)' },
      },
    },
    safetyTier: 'tier1_safe',
    route: 'local_store',
    execute: async (input) => {
      const tasks = useStore.getState().tasks;
      let filtered = tasks;
      if (input?.status) {
        filtered = filtered.filter((t) => t.status === input.status);
      }
      if (input?.limit && typeof input.limit === 'number') {
        filtered = filtered.slice(0, input.limit);
      }
      return filtered;
    },
  },

  get_task: {
    name: 'get_task',
    description: 'Fetch a single task by its unique ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The task ID' },
      },
      required: ['id'],
    },
    safetyTier: 'tier1_safe',
    route: 'local_store',
    execute: async (input) => {
      const id = typeof input.id === 'string' ? input.id : '';
      const task = useStore.getState().tasks.find((t) => t.id === id);
      return task || null;
    },
  },

  create_task: {
    name: 'create_task',
    description: 'Create a new task in BakaTracker. Automatically syncs with local ledger.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title or summary' },
        notes: { type: 'string', description: 'Detailed notes or description' },
        area: {
          type: 'string',
          enum: ['work', 'health', 'learning', 'personal', 'chores'],
          description: 'Life area category',
        },
        xp: { type: 'number', description: 'XP reward points (default: 10)' },
        today: { type: 'boolean', description: 'Whether task is assigned to Today' },
        dueDate: { type: 'string', description: 'ISO date string or YYYY-MM-DD' },
      },
      required: ['title'],
    },
    safetyTier: 'tier2_mutation',
    route: 'local_store',
    execute: async (input) => {
      const store = useStore.getState();
      const title = typeof input.title === 'string' ? input.title : 'New Quest';
      const notes = typeof input.notes === 'string' ? input.notes : '';
      const area = (typeof input.area === 'string' ? input.area : 'personal') as TaskArea;
      const xp = typeof input.xp === 'number' ? input.xp : 10;
      const today = Boolean(input.today);
      const dueDate = typeof input.dueDate === 'string' ? input.dueDate : undefined;

      await store.addTask(title, notes, area, xp, today, dueDate);
      const created = useStore.getState().tasks.find((t) => t.title === title);
      return created || { success: true, title };
    },
  },

  update_task: {
    name: 'update_task',
    description: "Update an existing task's status or properties.",
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The task ID to update' },
        title: { type: 'string', description: 'Updated task title' },
        notes: { type: 'string', description: 'Updated notes or description' },
        area: {
          type: 'string',
          enum: ['work', 'health', 'learning', 'personal', 'chores'],
          description: 'Updated life area category',
        },
        xp: { type: 'number', description: 'Updated XP reward points' },
        today: { type: 'boolean', description: 'Whether task is assigned to Today' },
        dueDate: { type: 'string', description: 'Updated due date (ISO string or YYYY-MM-DD)' },
        due: { type: 'string', description: 'Alias for dueDate' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'], description: 'New status' },
      },
      required: ['id'],
    },
    safetyTier: 'tier2_mutation',
    route: 'local_store',
    execute: async (input) => {
      const store = useStore.getState();
      const id = typeof input.id === 'string' ? input.id : '';
      const existing = store.tasks.find((t) => t.id === id);
      if (!existing) {
        return { success: false, error: `Task "${id}" not found.` };
      }
      if (typeof input.status === 'string') {
        await store.moveTask(id, input.status as Task['status']);
      }
      const updates: Partial<Omit<Task, 'id' | 'created_at'>> = {};
      if (typeof input.title === 'string') updates.title = input.title;
      if (typeof input.notes === 'string') updates.notes = input.notes;
      if (typeof input.area === 'string') updates.area = input.area as TaskArea;
      if (typeof input.xp === 'number') updates.xp = input.xp;
      if (typeof input.today === 'boolean') updates.today = input.today;
      const dueVal = typeof input.dueDate === 'string' ? input.dueDate : (typeof input.due === 'string' ? input.due : undefined);
      if (dueVal !== undefined) updates.due_date = dueVal;

      if (Object.keys(updates).length > 0) {
        await store.updateTask(id, updates);
      }
      const updated = useStore.getState().tasks.find((t) => t.id === id);
      return { success: true, id, task: updated };
    },
  },

  delete_task: {
    name: 'delete_task',
    description: 'Permanently delete a task by ID. Destructive action.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The task ID to delete' },
      },
      required: ['id'],
    },
    safetyTier: 'tier3_destructive',
    route: 'local_store',
    execute: async (input) => {
      const store = useStore.getState();
      const id = typeof input.id === 'string' ? input.id : '';
      const existing = store.tasks.find((t) => t.id === id);
      if (!existing) {
        return { success: false, error: `Task "${id}" not found.` };
      }
      await store.deleteTask(id);
      return { success: true, deletedId: id };
    },
  },

  // --- Habits (Local-First Store) ---
  list_habits: {
    name: 'list_habits',
    description: "List the user's habits and their current status.",
    parameters: {
      type: 'object',
      properties: {},
    },
    safetyTier: 'tier1_safe',
    route: 'local_store',
    execute: async () => {
      return useStore.getState().habits;
    },
  },

  create_habit: {
    name: 'create_habit',
    description: 'Create a new recurring habit with title, category, and period.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Habit name' },
        name: { type: 'string', description: 'Alias for title' },
        category: { type: 'string', description: 'Habit category (health, learning, etc.)' },
        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Frequency' },
        period: { type: 'string', enum: ['day', 'week', 'month'], description: 'Period alias for frequency' },
        target_days: { type: 'number', description: 'Target times per period' },
        target: { type: 'number', description: 'Target alias' },
      },
      required: ['title'],
    },
    safetyTier: 'tier2_mutation',
    route: 'local_store',
    execute: async (input) => {
      const store = useStore.getState();
      const habitName = typeof input.title === 'string' ? input.title : (typeof input.name === 'string' ? input.name : 'New Habit');
      const category = typeof input.category === 'string' ? input.category.toLowerCase() : 'discipline';
      const statMap: Record<string, StatType> = {
        health: 'health',
        fitness: 'health',
        learning: 'knowledge',
        study: 'knowledge',
        work: 'career',
        creativity: 'creativity',
        mindfulness: 'discipline',
        discipline: 'discipline',
      };
      const stat: StatType = statMap[category] || 'discipline';
      const targetCount = typeof input.target_days === 'number' ? input.target_days : (typeof input.target === 'number' ? input.target : undefined);
      const habitPayload: Omit<Habit, 'id' | 'active' | 'created_at' | 'updated_at'> = {
        name: habitName,
        type: 'checkbox',
        icon: '⚡',
        xp: 10,
        stat,
        target: targetCount !== undefined ? { value: targetCount, unit: 'times' } : undefined,
      };
      await store.addHabit(habitPayload);
      const created = useStore.getState().habits.find((h) => h.name === habitName);
      return { success: true, id: created?.id, title: habitName, habit: created };
    },
  },

  log_habit: {
    name: 'log_habit',
    description: 'Log completion of a habit for a given date (defaults to today). Idempotent.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The habit ID' },
        habit_id: { type: 'string', description: 'Alias for id' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to current date)' },
      },
      required: ['id'],
    },
    safetyTier: 'tier2_mutation',
    route: 'local_store',
    execute: async (input) => {
      const store = useStore.getState();
      const id = typeof input.id === 'string' ? input.id : (typeof input.habit_id === 'string' ? input.habit_id : '');
      const date = (typeof input.date === 'string' && input.date) || new Date().toISOString().split('T')[0];
      const habit = store.habits.find((h) => h.id === id);
      if (!habit) {
        return { success: false, error: `Habit "${id}" not found.` };
      }
      const existingLog = store.habitLogs.find((l) => l.habit_id === id && l.date === date);
      const isCompleted = existingLog && (existingLog.value === 1 || existingLog.value === '1' || (existingLog.value as unknown) === true);
      if (isCompleted) {
        return { success: true, id, date, alreadyCompleted: true };
      }
      await store.toggleHabit(id, date);
      return { success: true, id, date, alreadyCompleted: false };
    },
  },

  delete_habit: {
    name: 'delete_habit',
    description: 'Permanently remove a habit. Destructive action.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The habit ID to delete' },
      },
      required: ['id'],
    },
    safetyTier: 'tier3_destructive',
    route: 'local_store',
    execute: async (input) => {
      const store = useStore.getState();
      const id = typeof input.id === 'string' ? input.id : '';
      const existing = store.habits.find((h) => h.id === id);
      if (!existing) {
        return { success: false, error: `Habit "${id}" not found.` };
      }
      await store.deleteHabit(id);
      return { success: true, deletedId: id };
    },
  },

  // --- Journal (Local-First Store) ---
  journal_today: {
    name: 'journal_today',
    description: "Write or update a daily journal entry with highlights, reflections, and mood.",
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
        highlight: { type: 'string', description: 'Daily highlight or win' },
        notes: { type: 'string', description: 'Detailed journal reflection' },
        mood: { type: 'string', enum: ['great', 'good', 'neutral', 'bad', 'terrible'], description: 'Mood assessment' },
      },
      required: ['notes'],
    },
    safetyTier: 'tier2_mutation',
    route: 'local_store',
    execute: async (input) => {
      const date = (typeof input.date === 'string' && input.date) || new Date().toISOString().split('T')[0];
      const moodMap: Record<string, JournalEntry['mood']> = {
        great: '😄',
        good: '🙂',
        neutral: '😐',
        bad: '😞',
        terrible: '😞',
      };
      const moodKey = typeof input.mood === 'string' ? input.mood : 'neutral';
      const mood = moodKey in moodMap ? moodMap[moodKey] : '😐';
      await useStore.getState().saveJournalEntry(
        date,
        typeof input.highlight === 'string' ? input.highlight : '',
        typeof input.notes === 'string' ? input.notes : '',
        mood
      );
      return { success: true, date };
    },
  },

  get_journal: {
    name: 'get_journal',
    description: 'Fetch the journal entry for a specific date (YYYY-MM-DD).',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
      },
      required: ['date'],
    },
    safetyTier: 'tier1_safe',
    route: 'local_store',
    execute: async (input) => {
      const journal = useStore.getState().journal;
      const date = typeof input.date === 'string' ? input.date : '';
      const entry = journal.find((j) => j.date === date);
      return entry || null;
    },
  },

  list_journal: {
    name: 'list_journal',
    description: 'List recent journal entries optionally bounded by from/to dates.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date YYYY-MM-DD' },
        to: { type: 'string', description: 'End date YYYY-MM-DD' },
      },
    },
    safetyTier: 'tier1_safe',
    route: 'local_store',
    execute: async (input) => {
      let list = useStore.getState().journal;
      const from = typeof input?.from === 'string' ? input.from : undefined;
      const to = typeof input?.to === 'string' ? input.to : undefined;
      if (from) list = list.filter((j) => j.date >= from);
      if (to) list = list.filter((j) => j.date <= to);
      return list;
    },
  },

  // --- Server-Owned REST Tools ---
  create_note: {
    name: 'create_note',
    description: 'Create a new markdown note on the server.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        body: { type: 'string', description: 'Markdown note body' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags list' },
      },
      required: ['title'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  get_note: {
    name: 'get_note',
    description: 'Fetch a markdown note by its ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note ID' },
      },
      required: ['id'],
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  update_note: {
    name: 'update_note',
    description: 'Update a markdown note on the server.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note ID' },
        title: { type: 'string', description: 'New note title' },
        body: { type: 'string', description: 'New body content' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  delete_note: {
    name: 'delete_note',
    description: 'Permanently delete a note on the server.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note ID' },
      },
      required: ['id'],
    },
    safetyTier: 'tier3_destructive',
    route: 'server_rest',
    execute: async () => null,
  },

  list_notes: {
    name: 'list_notes',
    description: 'List recent markdown notes from the server.',
    parameters: {
      type: 'object',
      properties: {},
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  search_notes: {
    name: 'search_notes',
    description: 'Search markdown notes by text query.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' },
      },
      required: ['query'],
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  // --- Visual Notes & Notebooks ---
  create_notebook: {
    name: 'create_notebook',
    description: 'Create a new visual notes notebook.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Notebook name' },
      },
      required: ['name'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  list_notebooks: {
    name: 'list_notebooks',
    description: 'List all notebooks in the account.',
    parameters: {
      type: 'object',
      properties: {},
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  delete_notebook: {
    name: 'delete_notebook',
    description: 'Delete a notebook and move its pages to default.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Notebook ID' },
      },
      required: ['id'],
    },
    safetyTier: 'tier3_destructive',
    route: 'server_rest',
    execute: async () => null,
  },

  create_page: {
    name: 'create_page',
    description: 'Create a new visual or markdown page within a notebook.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title' },
        notebook_id: { type: 'string', description: 'Target notebook ID' },
        kind: {
          type: 'string',
          enum: ['text', 'excalidraw', 'markdown', 'visual'],
          description: 'Page format: text or excalidraw (aliases: markdown, visual)',
        },
      },
      required: ['title'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  list_pages: {
    name: 'list_pages',
    description: 'List visual/markdown pages, optionally scoped to a notebook.',
    parameters: {
      type: 'object',
      properties: {
        notebook_id: { type: 'string', description: 'Optional notebook filter' },
      },
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  get_page: {
    name: 'get_page',
    description: 'Fetch complete metadata and scene for a page.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Page ID' },
      },
      required: ['id'],
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  update_page: {
    name: 'update_page',
    description: 'Update page title, notebook, or position.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Page ID' },
        title: { type: 'string', description: 'New title' },
        notebook_id: { type: 'string', description: 'New notebook ID' },
      },
      required: ['id'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  delete_page: {
    name: 'delete_page',
    description: 'Soft-delete a page into trash.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Page ID' },
      },
      required: ['id'],
    },
    safetyTier: 'tier3_destructive',
    route: 'server_rest',
    execute: async () => null,
  },

  restore_page: {
    name: 'restore_page',
    description: 'Restore a soft-deleted page from trash.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Page ID' },
      },
      required: ['id'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  duplicate_page: {
    name: 'duplicate_page',
    description: 'Duplicate a page and its scene canvas.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Page ID to clone' },
      },
      required: ['id'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  reorder_pages: {
    name: 'reorder_pages',
    description: 'Update relative ordering positions of pages.',
    parameters: {
      type: 'object',
      properties: {
        notebook_id: { type: 'string', description: 'Notebook ID' },
        ordered_ids: { type: 'array', items: { type: 'string' }, description: 'Ordered page IDs' },
      },
      required: ['notebook_id', 'ordered_ids'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  save_page_scene: {
    name: 'save_page_scene',
    description: 'Save visual canvas Excalidraw scene JSON.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Page ID' },
        scene: { type: 'string', description: 'Serialized JSON scene' },
      },
      required: ['id', 'scene'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  // --- Files & Storage ---
  file_list: {
    name: 'file_list',
    description: 'List uploaded R2 attachment files and metadata.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of files to return (1-500)' },
      },
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  file_get: {
    name: 'file_get',
    description: 'Get metadata and download URL for an uploaded file.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'File ID' },
        key: { type: 'string', description: 'Alias for id' },
        include_data: { type: 'boolean', description: 'Whether to include base64 payload' },
      },
      required: ['id'],
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  file_upload: {
    name: 'file_upload',
    description: 'Upload a base64-encoded attachment to R2 storage.',
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Original filename' },
        mime_type: { type: 'string', description: 'MIME type (e.g. image/png, application/pdf)' },
        content_type: { type: 'string', description: 'Alias for mime_type' },
        data_base64: { type: 'string', description: 'Base64 encoded file data' },
        data: { type: 'string', description: 'Alias for data_base64' },
      },
      required: ['filename', 'data_base64'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  file_delete: {
    name: 'file_delete',
    description: 'Delete an attachment from storage. Destructive action.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'File ID to delete' },
        key: { type: 'string', description: 'Alias for id' },
      },
      required: ['id'],
    },
    safetyTier: 'tier3_destructive',
    route: 'server_rest',
    execute: async () => null,
  },

  // --- Analytics & Planning ---
  analytics: {
    name: 'analytics',
    description: 'Fetch aggregated dashboard analytics and streak calculations.',
    parameters: {
      type: 'object',
      properties: {},
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  plan_day: {
    name: 'plan_day',
    description: 'Generate an AI-driven daily plan based on backlog and habits.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date YYYY-MM-DD' },
      },
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  weekly_review: {
    name: 'weekly_review',
    description: 'Generate a weekly review summary of completed tasks and habit streaks.',
    parameters: {
      type: 'object',
      properties: {},
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  // --- Memory ---
  remember: {
    name: 'remember',
    description: 'Store a personal fact in BakaTracker memory (KV-backed).',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Fact key or label (max 120 chars)' },
        value: { type: 'string', description: 'Fact content to store (max 5000 chars)' },
        fact: { type: 'string', description: 'Alias for value' },
      },
      required: ['key', 'value'],
    },
    safetyTier: 'tier2_mutation',
    route: 'server_rest',
    execute: async () => null,
  },

  recall: {
    name: 'recall',
    description: 'Retrieve semantic memories matching a query.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Memory key to retrieve' },
        query: { type: 'string', description: 'Alias for key' },
      },
      required: ['key'],
    },
    safetyTier: 'tier1_safe',
    route: 'server_rest',
    execute: async () => null,
  },

  // --- System ---
  reset_account: {
    name: 'reset_account',
    description: 'CRITICAL: Wipe all user data. Irreversible destructive action.',
    parameters: {
      type: 'object',
      properties: {
        confirm: { type: 'string', description: 'Must be explicitly set to "DELETE"' },
      },
      required: ['confirm'],
    },
    safetyTier: 'tier3_destructive',
    route: 'server_rest',
    execute: async () => null,
  },
};

/** Formatted schema list suitable for LLM function calling and WebMCP registration */
export const clientToolSchemas = Object.values(toolRegistry).map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters,
}));
