export type HabitType = 'checkbox' | 'counter' | 'mood' | 'energy' | 'numeric';

export type StatType = 'discipline' | 'health' | 'knowledge' | 'creativity' | 'career';

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  icon: string; // Emoji
  xp: number;
  stat: StatType;
  active: boolean;
  created_at: string; // ISO date
  updated_at: string; // ISO date
}

export interface HabitLog {
  id: string; // UUID primary key
  date: string; // YYYY-MM-DD
  habit_id: string;
  value: number | string; // 1/0 for check, count, mood, energy, numeric value
  xp_earned: number;
  created_at: string; // ISO date
}

export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'done';

export type TaskArea = 'health' | 'career' | 'learning' | 'personal' | 'creativity';

export interface Task {
  id: string;
  title: string;
  notes: string;
  area: TaskArea;
  status: TaskStatus;
  today: boolean;
  due_date: string; // YYYY-MM-DD or empty
  xp: number;
  created_at: string; // ISO date
  updated_at: string; // ISO date
  completed_at: string; // ISO date or empty
}

export interface JournalEntry {
  id: string; // UUID primary key
  date: string; // YYYY-MM-DD
  highlight: string;
  notes: string;
  mood: '😞' | '😐' | '🙂' | '';
  quote_id: string;
  quote_text?: string;
  quote_author?: string;
  created_at: string; // ISO date
  updated_at: string; // ISO date
}

export interface Quote {
  id: string;
  quote: string;
  author: string;
  category: string;
  active: boolean;
}

export interface Settings {
  sheets_url: string;
  xp_per_level: number;
  accent_color_light?: string;
  accent_color_dark?: string;
  api_key?: string;
}

export interface Metadata {
  schema_version: string;
  xp_formula: string;
  last_sync: string;
}

export interface EventLog {
  id: string;
  type: 'habit_completed' | 'task_completed' | 'journal_created';
  source: 'habit' | 'task' | 'journal' | 'system';
  entity: string;
  entity_id: string;
  xp: number;
  stat: StatType | 'general';
  metadata?: string; // Serialized JSON string
  timestamp: string; // ISO date string aligned to date of action
}

export interface CharacterRecord {
  id: string;
  level: number;
  total_xp: number;
  discipline: number;
  health: number;
  knowledge: number;
  creativity: number;
  career: number;
  title: string;
  updated_at: string;
}

export interface WeeklyStatsRecord {
  week_start: string; // YYYY-MM-DD
  xp: number;
  health: number;
  knowledge: number;
  career: number;
  creativity: number;
  discipline: number;
}

export interface UserStats {
  level: number;
  xp: number;
  discipline: number;
  health: number;
  knowledge: number;
  creativity: number;
  career: number;
}


