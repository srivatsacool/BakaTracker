import { BookOpen, Compass, Flame, LayoutGrid, ListTodo, NotebookPen, Target } from 'lucide-react';
import type { NotifTone } from '../../../services/notificationSettings';

/** BakaSur personality tone → display label (settings modal). */
export const TONE_LABELS: Record<NotifTone, string> = {
  gentle: 'Gentle',
  motivational: 'Motivational',
  funny: 'Funny',
  tsundere: 'Tsundere',
  savage: 'Savage',
  celebratory: 'Celebratory',
};

/** Tool → instrument tone (the observatory color coding). */
export const NAV_TONES: Record<string, string> = {
  '/today': 'var(--arcade-gold)',
  '/habits': 'var(--arcade-green)',
  '/tasks': 'var(--arcade-red)',
  '/eisenhower': 'var(--arcade-orange)',
  '/journal': 'var(--arcade-magenta)',
  '/journey': 'var(--arcade-cobalt)',
  '/notes': 'var(--arcade-magenta)',
};

export interface NavItem {
  path: string;
  name: string;
  icon: typeof Target;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/today', name: 'Today', icon: Target },
  { path: '/habits', name: 'Habits', icon: Flame },
  { path: '/tasks', name: 'Tasks', icon: ListTodo },
  { path: '/eisenhower', name: 'Matrix', icon: LayoutGrid },
  { path: '/journal', name: 'Journal', icon: BookOpen },
  { path: '/journey', name: 'Journey', icon: Compass },
  { path: '/notes', name: 'Notes', icon: NotebookPen },
];

/**
 * Accent swatches offered in the settings Appearance section.
 * Shared by the Day and Night pickers.
 */
export const ACCENT_SWATCHES = ['#8B5CF6', '#5A8CFF', '#5FD8C4', '#E86A9A', '#FF6B6B', '#E8B45A'];
