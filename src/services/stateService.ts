import type { Habit, HabitLog, Task, JournalEntry, Quote, EventLog, CharacterRecord, WeeklyStatsRecord } from '../types';
import { ApiClient } from '../api/apiClient';

export interface RemoteData {
  habits: Habit[];
  habitLogs: HabitLog[];
  tasks: Task[];
  journal: JournalEntry[];
  quotes: Quote[];
  events: EventLog[];
  settings: { key: string; value: string }[];
  metadata?: { schema_version: string; xp_formula: string; last_sync: string }[];
  character?: CharacterRecord[];
  weeklyStats?: WeeklyStatsRecord[];
}

export const stateService = {
  /**
   * Fetches the complete system state from the backend.
   */
  fetchData: async (apiClient: ApiClient): Promise<RemoteData | null> => {
    try {
      const result = await apiClient.get<{ status: string; data: RemoteData }>('/state');
      if (result.status === 'success') {
        return result.data;
      } else {
        throw new Error('Unknown server error');
      }
    } catch (error) {
      console.error('Failed to fetch data from backend proxy:', error);
      throw error;
    }
  },

  /**
   * Syncs local state to the backend.
   */
  syncData: async (
    apiClient: ApiClient,
    data: {
      habits: Habit[];
      habitLogs: HabitLog[];
      tasks: Task[];
      journal: JournalEntry[];
      events: EventLog[];
      settings?: { key: string; value: string }[];
      metadata?: { schema_version: string; xp_formula: string; last_sync: string }[];
      character?: CharacterRecord[];
      weeklyStats?: WeeklyStatsRecord[];
    }
  ): Promise<boolean> => {
    try {
      const result = await apiClient.post<{ status: string }>('/state', {
        data: data
      });
      return result.status === 'success';
    } catch (error) {
      console.error('Failed to sync data to backend proxy:', error);
      throw error;
    }
  }
};
