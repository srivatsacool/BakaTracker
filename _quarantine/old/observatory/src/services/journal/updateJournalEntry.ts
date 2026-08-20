import type { JournalEntry } from '../../types';

export function updateJournalEntry(
  entry: JournalEntry,
  updates: Partial<Omit<JournalEntry, 'id' | 'created_at'>>
): JournalEntry {
  return {
    ...entry,
    ...updates,
    updated_at: new Date().toISOString()
  };
}
