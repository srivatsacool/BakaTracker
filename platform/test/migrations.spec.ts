import { env, applyD1Migrations, reset } from "cloudflare:test";
import migrationSql from "../migrations/0001_init.sql?raw";
import migrationFilesSql from "../migrations/0002_files.sql?raw";
import { splitSqlStatements } from "../scripts/sql-split.mjs";
import { describe, it, expect, beforeEach } from "vitest";

/**
 * Migration behavior tests.
 *
 * These prove the behavior of the EXISTING migration mechanism — Wrangler's
 * D1 migration tracking (the `d1_migrations` table, pending-only, in filename
 * order). `applyD1Migrations` from cloudflare:test is the same mechanism the
 * pool uses in place of `wrangler d1 migrations apply`: it creates
 * `d1_migrations`, records applied names, and applies only pending migrations.
 * No custom tracker is introduced.
 *
 * Migration SQL comes from the ONE authoritative source (platform/migrations/
 * *.sql); `splitSqlStatements` is only the Miniflare transport adapter
 * (comment-leading multi-statement exec() is rejected by Miniflare D1).
 */

const MIGRATIONS = [
  { name: "0001_init.sql", queries: splitSqlStatements(migrationSql) },
  { name: "0002_files.sql", queries: splitSqlStatements(migrationFilesSql) },
];

/** Every test starts from an empty database (wipes all pool storage). */
beforeEach(async () => {
  await reset();
});

async function appliedMigrations(): Promise<string[]> {
  const { results } = await env.BAKA_DB.prepare(
    "SELECT name FROM d1_migrations ORDER BY id",
  ).all();
  return results.map((r) => (r as { name: string }).name);
}

async function tables(): Promise<string[]> {
  const { results } = await env.BAKA_DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_METADATA') ORDER BY name",
  ).all();
  return results.map((r) => (r as { name: string }).name);
}

async function indexes(): Promise<string[]> {
  const { results } = await env.BAKA_DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name",
  ).all();
  return results.map((r) => (r as { name: string }).name);
}

const EXPECTED_TABLES = ["daily_rollups", "files", "habits", "journal", "notes", "sync_meta", "sync_queue", "tasks"];
const EXPECTED_INDEXES = ["idx_files_user_created", "idx_habits_user", "idx_sync_user", "idx_tasks_due", "idx_tasks_user_status"];

describe("D1 migrations", () => {
  it("applies every migration to an EMPTY database", async () => {
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);

    // tracking table exists and records both migrations in order
    expect(await appliedMigrations()).toEqual(["0001_init.sql", "0002_files.sql"]);

    // every expected table + index exists
    expect(await tables()).toEqual(EXPECTED_TABLES);
    expect(await indexes()).toEqual(EXPECTED_INDEXES);
  });

  it("is IDEMPOTENT — a second run applies zero new migrations", async () => {
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);
    const before = {
      migrations: await appliedMigrations(),
      tables: await tables(),
      indexes: await indexes(),
    };

    // second run: no pending migrations → no writes, no errors
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);

    expect(await appliedMigrations()).toEqual(before.migrations);
    expect(await tables()).toEqual(before.tables);
    expect(await indexes()).toEqual(before.indexes);
  });

  it("UPGRADES an older schema without disturbing it", async () => {
    // start at 0001 only (older version)
    await applyD1Migrations(env.BAKA_DB, [MIGRATIONS[0]]);
    expect(await appliedMigrations()).toEqual(["0001_init.sql"]);
    expect(await tables()).toContain("tasks");
    expect(await tables()).not.toContain("files");

    // upgrade to latest
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);

    expect(await appliedMigrations()).toEqual(["0001_init.sql", "0002_files.sql"]);
    expect(await tables()).toEqual(EXPECTED_TABLES);
    expect(await indexes()).toEqual(EXPECTED_INDEXES);
    // 0001 schema untouched by the upgrade
    expect(await tables()).toContain("tasks");
    expect(await indexes()).toContain("idx_tasks_user_status");
  });

  it("PRESERVES existing data across an upgrade", async () => {
    // seed a task under the 0001 schema (real application table + shape)
    await applyD1Migrations(env.BAKA_DB, [MIGRATIONS[0]]);
    await env.BAKA_DB.prepare(
      `INSERT INTO tasks (id, user_id, created_at, updated_at, title, status, priority, sort)
       VALUES ('task_1', 'user_1', '2026-08-01T00:00:00Z', '2026-08-01T00:00:00Z', 'ship migrations', 'todo', 1, 0)`,
    ).run();

    // upgrade to latest
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);

    // data survived
    const { results } = await env.BAKA_DB.prepare(
      "SELECT id, title, status FROM tasks WHERE id = 'task_1'",
    ).all();
    expect(results).toEqual([{ id: "task_1", title: "ship migrations", status: "todo" }]);
  });
});