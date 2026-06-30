import type { Quote } from '../../types';

export function getRandomQuote(quotes: Quote[]): Quote | null {
  const activeQuotes = quotes.filter(q => q.active);
  if (activeQuotes.length === 0) return null;
  return activeQuotes[Math.floor(Math.random() * activeQuotes.length)];
}
