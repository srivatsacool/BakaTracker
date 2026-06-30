import type { Habit, HabitLog, Task, JournalEntry, Quote, EventLog, CharacterRecord, WeeklyStatsRecord } from '../types';

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

export const sheetsService = {
  /**
   * Fetches all data from Google Sheets via the Apps Script Web App URL.
   */
  fetchData: async (url: string, apiKey?: string): Promise<RemoteData | null> => {
    if (!url) return null;
    
    try {
      // Clean up URL to prevent caching issues
      let fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getAll&t=${Date.now()}`;
      if (apiKey) {
        fetchUrl += `&apiKey=${encodeURIComponent(apiKey)}`;
      }
      const response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.status === 'success') {
        return result.data;
      } else {
        throw new Error(result.message || 'Unknown server error');
      }
    } catch (error) {
      console.error('Failed to fetch data from Google Sheets:', error);
      throw error;
    }
  },

  /**
   * Syncs local state to Google Sheets.
   */
  syncData: async (
    url: string,
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
    },
    apiKey?: string
  ): Promise<boolean> => {
    if (!url) return false;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Apps Script handles text/plain POSTs best without CORS preflight failures
        },
        body: JSON.stringify({
          action: 'sync',
          apiKey: apiKey,
          data: data
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Failed to sync data to Google Sheets:', error);
      throw error;
    }
  }
};
