/**
 * Stats/Analytics repository — rollups computed from the D1 mirror.
 * Tool → Repository → SQL → D1.
 */
export interface AnalyticsRollup {
  open_tasks: number;
  completed_today: number;
  notes: number;
  habit_streaks: Array<{ id: string; name: string; streak: number }>;
  avg_mood_last_days: number | null;
}

export class StatsRepository {
  constructor(private readonly db: D1Database) {}

  async rollup(userId: string, days = 7): Promise<AnalyticsRollup> {
    const [openTasks, doneToday, notesCount, habits, journal] = await Promise.all([
      this.db.prepare("SELECT COUNT(*) n FROM tasks WHERE user_id=?1 AND status NOT IN ('done','archived')").bind(userId).first<{ n: number }>(),
      this.db.prepare("SELECT COUNT(*) n FROM tasks WHERE user_id=?1 AND status='done' AND date(updated_at)=date('now')").bind(userId).first<{ n: number }>(),
      this.db.prepare("SELECT COUNT(*) n FROM notes WHERE user_id=?1").bind(userId).first<{ n: number }>(),
      this.db.prepare("SELECT id, name, streak FROM habits WHERE user_id=?1").bind(userId).all(),
      this.db.prepare("SELECT date, mood FROM journal WHERE user_id=?1 ORDER BY date DESC LIMIT ?2").bind(userId, days).all(),
    ]);

    const moods = ((journal.results ?? []) as any[]).map((r) => r.mood).filter((m) => m != null) as number[];
    const moodAvg = moods.length ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 100) / 100 : null;

    return {
      open_tasks: openTasks?.n ?? 0,
      completed_today: doneToday?.n ?? 0,
      notes: notesCount?.n ?? 0,
      habit_streaks: (habits.results ?? []) as Array<{ id: string; name: string; streak: number }>,
      avg_mood_last_days: moodAvg,
    };
  }
}