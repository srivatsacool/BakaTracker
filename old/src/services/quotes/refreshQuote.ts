import type { Quote } from '../../types';
import { getRandomQuote } from './getRandomQuote';

export function refreshQuote(quotes: Quote[], currentQuoteId?: string): Quote | null {
  const activeQuotes = quotes.filter(q => q.active);
  if (activeQuotes.length <= 1) {
    return getRandomQuote(quotes);
  }
  
  // Try to find a different quote than current
  const otherQuotes = activeQuotes.filter(q => q.id !== currentQuoteId);
  return otherQuotes[Math.floor(Math.random() * otherQuotes.length)];
}
