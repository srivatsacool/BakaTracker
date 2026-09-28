import type { StatType } from '../../types';

export const STAT_LABELS: Record<StatType, { label: string; icon: string; color: string }> = {
  discipline: { label: 'DISCIPLINE', icon: 'sword', color: 'var(--obs-coral, #f87171)' },
  health: { label: 'HEALTH', icon: 'fire', color: 'var(--obs-teal, #3dca84)' },
  knowledge: { label: 'KNOWLEDGE', icon: 'book', color: 'var(--obs-cobalt, #3f7bff)' },
  creativity: { label: 'CREATIVITY', icon: 'brush', color: 'var(--obs-rose, #fb7185)' },
  career: { label: 'CAREER', icon: 'briefcase', color: 'var(--obs-amber, #f59e0b)' },
};
