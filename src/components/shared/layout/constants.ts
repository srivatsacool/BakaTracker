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

/** Pixelarticons name per nav item (Refinement Phase 2 — personality icons). */
export const NAV_PIXEL_ICONS: Record<string, string> = {
  '/today': 'goal',
  '/habits': 'fire',
  '/tasks': 'checkbox',
  '/eisenhower': 'grid',
  '/journal': 'book',
  '/journey': 'compass',
  '/notes': 'notes',
};

export interface NavItem {
  path: string;
  name: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/today', name: 'Today', icon: 'goal' },
  { path: '/habits', name: 'Habits', icon: 'fire' },
  { path: '/tasks', name: 'Tasks', icon: 'checkbox' },
  { path: '/eisenhower', name: 'Matrix', icon: 'grid' },
  { path: '/journal', name: 'Journal', icon: 'book' },
  { path: '/journey', name: 'Journey', icon: 'compass' },
  { path: '/notes', name: 'Notes', icon: 'notes' },
];

/**
 * Accent swatches offered in the settings Appearance section.
 * Shared by the Day and Night pickers.
 */
export const ACCENT_SWATCHES = ['#8B5CF6', '#5A8CFF', '#5FD8C4', '#E86A9A', '#FF6B6B', '#E8B45A'];
