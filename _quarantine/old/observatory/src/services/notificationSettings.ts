/**
 * Notification settings — typed client for the v2.1 BakaSur notification
 * preferences endpoints.
 *
 *   GET /api/v1/notifications/settings → { ok, settings }
 *   PUT /api/v1/notifications/settings (FULL object) → { ok, settings }
 *
 * The backend validates with zod and fills defaults, but PUT requires the
 * FULL settings object — callers must spread the loaded settings and mutate
 * only what changed (partial payloads are rejected).
 */
import type { ApiClient } from '../api/apiClient';

/** BakaSur personality — wording only, never business rules. */
export const NOTIF_TONES = ['gentle', 'motivational', 'funny', 'tsundere', 'savage', 'celebratory'] as const;
export type NotifTone = (typeof NOTIF_TONES)[number];

export type NotifCategory = 'overdue_task' | 'deadline_approaching' | 'streak_at_risk' | 'streak_milestone';

export interface NotificationSettings {
  enabled: boolean;
  tone: NotifTone;
  timezone: string;
  quiet_hours: {
    enabled: boolean;
    /** "HH:MM" (24h) */
    start: string;
    /** "HH:MM" (24h) */
    end: string;
  };
  max_per_day: number;
  categories: Record<NotifCategory, boolean>;
}

interface SettingsEnvelope {
  ok: boolean;
  settings: NotificationSettings;
}

/** Load the authenticated user's notification settings (defaults filled by the backend). */
export async function getNotificationSettings(apiClient: ApiClient): Promise<NotificationSettings> {
  const res = await apiClient.get<SettingsEnvelope>('/api/v1/notifications/settings');
  return res.settings;
}

/** Persist the full settings object (partial PUTs are rejected by the backend). */
export async function updateNotificationSettings(
  apiClient: ApiClient,
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  const res = await apiClient.put<SettingsEnvelope>('/api/v1/notifications/settings', settings);
  return res.settings;
}
