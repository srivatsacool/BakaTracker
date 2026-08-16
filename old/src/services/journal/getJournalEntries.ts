import type { JournalEntry } from '../../types';

export function getJournalEntries(entries: JournalEntry[], filter?: { date?: string }): JournalEntry[] {
  if (filter?.date) {
    return entries.filter(e => e.date === filter.date);
  }
  return entries;
}
