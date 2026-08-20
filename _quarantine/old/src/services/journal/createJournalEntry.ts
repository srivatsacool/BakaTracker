import type { JournalEntry } from '../../types';
import { generateUUID } from '../../lib/utils';

export function createJournalEntry(
  date: string,
  highlight: string,
  notes: string,
  mood: JournalEntry['mood'],
  quoteId: string
): JournalEntry {
  const now = new Date().toISOString();
  return {
    id: generateUUID('journal_'),
    date,
    highlight,
    notes,
    mood,
    quote_id: quoteId,
    created_at: now,
    updated_at: now
  };
}
