import { env, applyD1Migrations } from "cloudflare:test";
import migrationSql from "../migrations/0001_init.sql?raw";
import migrationFilesSql from "../migrations/0002_files.sql?raw";
import { splitSqlStatements } from "../scripts/sql-split.mjs";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { repositories } from "../src/storage/repositories";
import { AiService } from "../src/ai";
import { runNotificationEvaluation } from "../src/notifications/engine";
import { saveSettings, NotificationSettingsSchema } from "../src/notifications/settings";
import { inQuietWindow, todayInTz, daysBetween } from "../src/notifications/candidates";
import { loadHistory } from "../src/notifications/policy";
import type { AIProvider, ChatMessage, ChatOptions } from "../src/ai/provider";
import type { Notification, NotificationDelivery } from "../src/notifications/types";
import { WebPushDelivery, type PushSender } from "../src/notifications/webpush";
import { testBrowserSubscription, testVapidKeys } from "./push-keys";
import type { PushSubscription } from "@block65/webcrypto-web-push";

// Fixed wall clock: 2026-08-11 10:00 UTC. Everything is derived from this —
// no test depends on the real clock.
const NOW = new Date("2026-08-11T10:00:00Z");

class FakeProvider implements AIProvider {
  readonly name = "fake";
  readonly model = "fake-model-1";
  constructor(private respond: (messages: ChatMessage[], options?: ChatOptions) => string | Promise<string>) {}
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    return this.respond(messages, options);
  }
}

function aiServiceResponding(message = "You have an overdue task."): AiService {
  return new AiService(
    new FakeProvider(() => JSON.stringify({ message, tone: "gentle" })),
    { model: "fake-model-1" },
  );
}

/** Fake that simulates the model phrasing facts: extracts the title/name from
 * the bounded candidate context and echoes it — deterministic stand-in for
 * "the AI reads the context and writes about it". */
function aiServiceEchoingContext(): AiService {
  return new AiService(
    new FakeProvider((messages) => {
      const user = messages.find((m) => m.role === "user")?.content ?? "";
      const subject = user.match(/"title":"([^"]*)"/)?.[1] ?? user.match(/"name":"([^"]*)"/)?.[1] ?? "something";
      return JSON.stringify({ message: `Reminder about: ${subject}`, tone: "gentle" });
    }),
    { model: "fake-model-1" },
  );
}

function aiServiceFailing(): AiService {
  return new AiService(
    new FakeProvider(() => { throw new Error("model down"); }),
    { model: "fake-model-1" },
  );
}

class RecordingDelivery implements NotificationDelivery {
  readonly name = "recording";
  delivered: Array<{ user: { sub: string }; notif: Notification }> = [];
  fail = false;
  async deliver(user: { sub: string }, notif: Notification): Promise<void> {
    if (this.fail) throw new Error("delivery transport down");
    this.delivered.push({ user, notif });
  }
  forUser(sub: string): Notification[] {
    return this.delivered.filter((d) => d.user.sub === sub).map((d) => d.notif);
  }
}

async function run(ai: AiService, delivery: RecordingDelivery, now: Date = NOW) {
  return runNotificationEvaluation(env as any, undefined as any, { now, ai, delivery });
}

async function seedTask(userId: string, id: string, title: string, due: string | null, status = "todo") {
  const repos = repositories(env.BAKA_DB);
  await repos.tasks.upsert({
    id, user_id: userId, title, status, due, priority: 0,
    created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
  });
}

async function seedHabit(userId: string, id: string, name: string, streak: number, lastLogDate: string) {
  const repos = repositories(env.BAKA_DB);
  await repos.habits.upsert({
    id, user_id: userId, name, streak, period: "day", target: 1,
    log: lastLogDate ? [{ date: lastLogDate, count: 1 }] : [],
    created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
  });
}

beforeAll(async () => {
  await applyD1Migrations(env.BAKA_DB, [
    { name: "0001_init.sql", queries: splitSqlStatements(migrationSql) },
    { name: "0002_files.sql", queries: splitSqlStatements(migrationFilesSql) },
  ]);
});

describe("timezone helpers (unit)", () => {
  it("todayInTz respects the user's timezone", () => {
    expect(todayInTz(new Date("2026-08-11T02:00:00Z"), "UTC")).toBe("2026-08-11");
    // 02:00 UTC on Aug 11 is 22:00 EDT on Aug 10.
    expect(todayInTz(new Date("2026-08-11T02:00:00Z"), "America/New_York")).toBe("2026-08-10");
    expect(todayInTz(new Date("2026-08-11T23:30:00Z"), "Asia/Tokyo")).toBe("2026-08-12");
  });

  it("daysBetween is calendar-day arithmetic", () => {
    expect(daysBetween("2026-08-11", "2026-08-12")).toBe(1);
    expect(daysBetween("2026-08-11", "2026-08-10")).toBe(-1);
    expect(daysBetween("2026-08-11", "2026-08-11")).toBe(0);
  });

  it("inQuietWindow handles normal and overnight ranges", () => {
    expect(inQuietWindow(23 * 60, "22:00", "07:00")).toBe(true); // 23:00
    expect(inQuietWindow(6 * 60, "22:00", "07:00")).toBe(true); // 06:00
    expect(inQuietWindow(8 * 60, "22:00", "07:00")).toBe(false); // 08:00
    expect(inQuietWindow(12 * 60, "09:00", "18:00")).toBe(true); // 12:00
    expect(inQuietWindow(8 * 60, "09:00", "18:00")).toBe(false); // 08:00
    expect(inQuietWindow(0, "00:00", "00:00")).toBe(false); // empty window
  });
});

describe("notification settings (unit + REST)", () => {
  it("defaults are conservative: enabled, gentle tone, cap 3/day", () => {
    const s = NotificationSettingsSchema.parse({});
    expect(s.enabled).toBe(true);
    expect(s.tone).toBe("gentle");
    expect(s.max_per_day).toBe(3);
    expect(s.quiet_hours.enabled).toBe(false);
    expect(s.categories.overdue_task).toBe(true);
  });

  it("rejects malformed input (tone, time format, negative cap)", () => {
    expect(NotificationSettingsSchema.safeParse({ tone: "loud" }).success).toBe(false);
    expect(NotificationSettingsSchema.safeParse({ quiet_hours: { start: "25:99" } }).success).toBe(false);
    expect(NotificationSettingsSchema.safeParse({ max_per_day: -1 }).success).toBe(false);
  });

  it("GET defaults → PUT partial update → GET reflects merged settings", async () => {
    const { buildRestApp, REST_PREFIX } = await import("../src/http/rest");
    const { Hono } = await import("hono");
    // Mirrors index.ts mounting.
    const api = new Hono();
    api.route(REST_PREFIX, buildRestApp());
    const get = async () =>
      api.request("http://localhost/api/v1/notifications/settings", { headers: { "X-User-Sub": "settings-user" } }, env as any);

    const before = await (await get()).json<{ ok: boolean; settings: { tone: string; max_per_day: number } }>();
    expect(before.settings.tone).toBe("gentle");
    expect(before.settings.max_per_day).toBe(3);

    const putRes = await api.request(
      "http://localhost/api/v1/notifications/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Sub": "settings-user" },
        body: JSON.stringify({ tone: "tsundere", max_per_day: 1 }),
      },
      env as any,
    );
    expect(putRes.status).toBe(200);
    const after = await (await get()).json<{ ok: boolean; settings: { tone: string; max_per_day: number } }>();
    expect(after.settings.tone).toBe("tsundere");
    expect(after.settings.max_per_day).toBe(1);

    const bad = await api.request(
      "http://localhost/api/v1/notifications/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Sub": "settings-user" },
        body: JSON.stringify({ tone: "screaming" }),
      },
      env as any,
    );
    expect(bad.status).toBe(400);
  });
});

describe("candidate + policy engine (integration)", () => {
  it("detects overdue, deadline, streak-at-risk and milestone candidates", async () => {
    await seedTask("u_full", "t_overdue_date", "Overdue by date", "2026-08-10");
    await seedTask("u_full", "t_overdue_instant", "Overdue now", "2026-08-11T09:00:00Z");
    await seedTask("u_full", "t_due_today", "Due today", "2026-08-11");
    await seedHabit("u_full", "h_atrisk", "Read", 5, "2026-08-09");
    // Logged today → NOT at risk, but streak 14 → milestone fires.
    await seedHabit("u_full", "h_milestone", "Meditate", 14, "2026-08-11");
    // Negatives: no candidates.
    await seedTask("u_full", "t_far", "Due in 3 days", "2026-08-14");
    await seedTask("u_full", "t_done", "Done overdue", "2026-08-01", "done");
    await seedHabit("u_full", "h_safe", "Stretch", 3, "2026-08-11");
    await seedHabit("u_full", "h_zero", "Zero streak", 0, "");
    // Raise the daily cap so the per-run candidate bound (5) is what binds.
    await saveSettings(
      env.OAUTH_KV,
      "u_full",
      NotificationSettingsSchema.parse({ max_per_day: 10 }),
    );

    const delivery = new RecordingDelivery();
    const summary = await run(aiServiceResponding(), delivery);

    const types = new Set(delivery.forUser("u_full").map((n) => n.type));
    expect(types.has("overdue_task")).toBe(true);
    expect(types.has("deadline_approaching")).toBe(true);
    expect(types.has("streak_at_risk")).toBe(true);
    expect(types.has("streak_milestone")).toBe(true);
    expect(summary.delivered).toBeGreaterThanOrEqual(5);

    // Done / far-future / zero-streak items produced nothing.
    const entities = delivery.forUser("u_full").map((n) => n.entity_id);
    expect(entities).not.toContain("t_done");
    expect(entities).not.toContain("t_far");
    expect(entities).not.toContain("h_zero");

    // Every delivered notification carries a bounded message.
    for (const n of delivery.forUser("u_full")) {
      expect(n.message.length).toBeGreaterThan(0);
      expect(n.message.length).toBeLessThanOrEqual(280);
      expect(n.tone).toBe("gentle");
    }

    // History ring buffer recorded them (user-scoped).
    const history = await loadHistory(env.OAUTH_KV, "u_full");
    expect(history.length).toBeGreaterThanOrEqual(5);
  });

  it("applies the per-user daily cap (max_per_day=1 → one delivery)", async () => {
    await seedTask("u_cap", "c1", "Cap task 1", "2026-08-10");
    await seedTask("u_cap", "c2", "Cap task 2", "2026-08-05");
    await saveSettings(env.OAUTH_KV, "u_cap", NotificationSettingsSchema.parse({ max_per_day: 1 }));

    const delivery = new RecordingDelivery();
    await run(aiServiceResponding(), delivery);
    expect(delivery.forUser("u_cap").length).toBe(1);

    const history = await loadHistory(env.OAUTH_KV, "u_cap");
    expect(history.length).toBe(1);
  });

  it("suppresses when notifications are disabled, category off, or quiet hours", async () => {
    await seedTask("u_disabled", "d1", "Disabled task", "2026-08-10");
    await saveSettings(env.OAUTH_KV, "u_disabled", NotificationSettingsSchema.parse({ enabled: false }));

    await seedTask("u_cat", "d2", "Cat task", "2026-08-10");
    await saveSettings(
      env.OAUTH_KV,
      "u_cat",
      NotificationSettingsSchema.parse({ categories: { ...NotificationSettingsSchema.parse({}).categories, overdue_task: false } }),
    );

    await seedTask("u_quiet", "d3", "Quiet task", "2026-08-10");
    await saveSettings(
      env.OAUTH_KV,
      "u_quiet",
      NotificationSettingsSchema.parse({ quiet_hours: { enabled: true, start: "09:00", end: "18:00" } }),
    );

    const delivery = new RecordingDelivery();
    const summary = await run(aiServiceResponding(), delivery);

    expect(delivery.forUser("u_disabled").length).toBe(0);
    expect(delivery.forUser("u_cat").length).toBe(0);
    expect(delivery.forUser("u_quiet").length).toBe(0);
    expect(summary.delivered).toBe(0);
    expect(summary.suppressed).toBeGreaterThanOrEqual(3);
  });

  it("dedups identical candidates (cooldown), and never re-sends a milestone value", async () => {
    await seedTask("u_dedup", "e1", "Dedup task", "2026-08-10");
    await seedHabit("u_dedup", "h_m2", "Milestone habit", 21, "2026-08-10");

    const delivery = new RecordingDelivery();
    await run(aiServiceResponding(), delivery, NOW);
    const first = delivery.forUser("u_dedup");
    expect(first.length).toBeGreaterThanOrEqual(1);

    // 1h later: same candidates → cooldown (overdue 12h) + milestone dedup.
    const later = new RecordingDelivery();
    await run(aiServiceResponding(), later, new Date(NOW.getTime() + 3_600_000));
    expect(later.forUser("u_dedup").length).toBe(0);

    // Milestone value is deduped forever: same streak never fires again even
    // after the cooldown window.
    const nextDay = new RecordingDelivery();
    await run(aiServiceResponding(), nextDay, new Date(NOW.getTime() + 26 * 3_600_000));
    const milestoneResends = nextDay.forUser("u_dedup").filter((n) => n.type === "streak_milestone");
    expect(milestoneResends.length).toBe(0);
  });

  it("daily cap rolls over on the user's local day", async () => {
    await seedTask("u_roll", "r1", "Roll task", "2026-08-10");
    await saveSettings(env.OAUTH_KV, "u_roll", NotificationSettingsSchema.parse({ max_per_day: 1 }));

    const first = new RecordingDelivery();
    await run(aiServiceResponding(), first, NOW);
    expect(first.forUser("u_roll").length).toBe(1);

    // Next day (26h later): cap reset; cooldown (12h) also expired.
    const second = new RecordingDelivery();
    await run(aiServiceResponding(), second, new Date(NOW.getTime() + 26 * 3_600_000));
    expect(second.forUser("u_roll").length).toBe(1);
  });

  it("honors the configured personality tone on the record", async () => {
    await seedTask("u_tone", "t1", "Tone task", "2026-08-10");
    await saveSettings(env.OAUTH_KV, "u_tone", NotificationSettingsSchema.parse({ tone: "funny" }));

    const delivery = new RecordingDelivery();
    await run(aiServiceResponding("This is a funny message."), delivery);
    // The model echoed "gentle"; the app-controlled record carries "funny".
    expect(delivery.forUser("u_tone")[0].tone).toBe("funny");
  });

  it("AI failure degrades gracefully: candidate skipped, engine survives", async () => {
    await seedTask("u_ai_down", "a1", "AI down task", "2026-08-10");
    const delivery = new RecordingDelivery();
    const summary = await run(aiServiceFailing(), delivery);
    expect(delivery.forUser("u_ai_down").length).toBe(0);
    expect(summary.delivered).toBe(0);
    expect(summary.failed).toBe(0); // skipped ≠ failed
    expect(summary.suppressed).toBeGreaterThanOrEqual(1);
  });

  it("delivery failure is counted, not thrown; cooldown prevents resend spam", async () => {
    await seedTask("u_delivery_down", "dd1", "Delivery down task", "2026-08-10");
    const delivery = new RecordingDelivery();
    delivery.fail = true;
    const summary = await run(aiServiceResponding(), delivery, NOW);
    expect(summary.failed).toBeGreaterThanOrEqual(1);

    // Recorded as sent → the next tick suppresses (no retry storm).
    delivery.fail = false;
    const later = new RecordingDelivery();
    await run(aiServiceResponding(), later, new Date(NOW.getTime() + 3_600_000));
    expect(later.forUser("u_delivery_down").length).toBe(0);
  });

  it("cross-user isolation: each user sees only their own candidates + history", async () => {
    await seedTask("u_alice2", "al_t", "Alice's overdue", "2026-08-10");
    await seedTask("u_bob2", "bo_t", "Bob's overdue", "2026-08-09");

    const delivery = new RecordingDelivery();
    await run(aiServiceEchoingContext(), delivery);

    const aliceNotifs = delivery.forUser("u_alice2");
    const bobNotifs = delivery.forUser("u_bob2");
    expect(aliceNotifs.length).toBe(1);
    expect(bobNotifs.length).toBe(1);
    expect(aliceNotifs[0].entity_id).toBe("al_t");
    expect(bobNotifs[0].entity_id).toBe("bo_t");
    expect(aliceNotifs[0].message).toContain("Alice's overdue");
    expect(bobNotifs[0].message).toContain("Bob's overdue");

    const aliceHistory = await loadHistory(env.OAUTH_KV, "u_alice2");
    const bobHistory = await loadHistory(env.OAUTH_KV, "u_bob2");
    expect(aliceHistory.every((h) => (h as { entity_id: string }).entity_id === "al_t")).toBe(true);
    expect(bobHistory.every((h) => (h as { entity_id: string }).entity_id === "bo_t")).toBe(true);
  });

  it("bounds per-user candidates per run (cap 5, highest priority first)", async () => {
    // 6 overdue tasks, 2 deadlines → capped at 5, all overdue (priority 3).
    // Raise the daily cap so the per-run candidate bound is what binds.
    await saveSettings(
      env.OAUTH_KV,
      "u_many",
      NotificationSettingsSchema.parse({ max_per_day: 10 }),
    );
    for (let i = 0; i < 6; i++) await seedTask("u_many", `m_${i}`, `Many ${i}`, "2026-08-10");
    await seedTask("u_many", "m_dl", "Deadline", "2026-08-12");
    await seedTask("u_many", "m_dl2", "Deadline2", "2026-08-11T11:00:00Z");

    const delivery = new RecordingDelivery();
    await run(aiServiceResponding(), delivery);
    const notifs = delivery.forUser("u_many");
    expect(notifs.length).toBe(5);
    expect(notifs.every((n) => n.type === "overdue_task")).toBe(true);
  });

  it("never calls the model when policy suppresses (AI side-effect counter)", async () => {
    await seedTask("u_noai_calls", "n1", "No AI calls", "2026-08-10");
    await saveSettings(env.OAUTH_KV, "u_noai_calls", NotificationSettingsSchema.parse({ enabled: false }));

    let modelCalls = 0;
    const spy = new AiService(
      new FakeProvider(() => {
        modelCalls += 1;
        return JSON.stringify({ message: "should never be generated", tone: "gentle" });
      }),
      { model: "fake" },
    );
    await run(spy, new RecordingDelivery());
    expect(modelCalls).toBe(0);
  });

  it("WS2-4: engine → WebPushDelivery sends an encrypted push to the REST-registered endpoint", async () => {
    // Register the device through the REAL REST route (the browser flow's
    // POST /api/v1/push/subscription), not a direct store call.
    const { buildRestApp, REST_PREFIX } = await import("../src/http/rest");
    const { Hono } = await import("hono");
    const api = new Hono();
    api.route(REST_PREFIX, buildRestApp());
    const sub = await testBrowserSubscription();
    const reg = await api.request(
      "http://localhost/api/v1/push/subscription",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Sub": "u_wspush" },
        body: JSON.stringify(sub),
      },
      env as any,
    );
    expect(reg.status).toBe(201);

    await seedTask("u_wspush", "wp1", "Web push task", "2026-08-10");

    // Inject the REAL delivery transport through the documented seam, with a
    // fake sender capturing the outbound request (real library crypto).
    const vapid = await testVapidKeys();
    const sendMock = vi.fn(async () => new Response(null, { status: 201 }));
    const send = sendMock as unknown as PushSender;
    const delivery = new WebPushDelivery(env.PUSH_SUBSCRIPTIONS, vapid, send);

    const summary = await run(aiServiceResponding(), delivery, NOW);
    expect(summary.delivered).toBeGreaterThanOrEqual(1);

    // One outbound push to the REST-registered endpoint, encrypted + VAPID-signed.
    expect(send).toHaveBeenCalledTimes(1);
    const [sentSub, payload] = sendMock.mock.calls[0] as [
      PushSubscription,
      { headers: Record<string, string>; body: Uint8Array },
    ];
    expect(sentSub.endpoint).toBe(sub.endpoint);
    expect(payload.headers["ttl"]).toBe("86400");
    expect(payload.headers["urgency"]).toBe("normal");
    expect(payload.headers["authorization"]).toMatch(/^WebPush /);
    expect(payload.headers["crypto-key"]).toContain("dh=");
    expect(payload.headers["encryption"]).toMatch(/^salt=/);
    expect(payload.body.byteLength).toBeGreaterThan(0); // encrypted bytes present
  });
});
