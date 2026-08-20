import type { JournalEntry } from '../../types';

export function deleteJournalEntry(id: string, entries: JournalEntry[]): JournalEntry[] {
  return entries.filter(e => e.id !== id);
}
