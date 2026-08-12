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
 * (comment-leading multi-statement exec() is rejected by Minifre D1).
 *
 * Critical: The migration mechanism guarantees idempotency through the
 * `d1_migrations` table — Wrangler's `d1 migrations apply` applies each file
 * exactly once and skips already-recorded ones. The test suite should model
 * the actual D1 migration lifecycle rather than trying to make the raw SQL
 * independently re-runnable.
 */

import { env, applyD1Migrations, reset } from "cloudflare:test";
import migrationSql from "../migrations/0001_init.sql?raw";
import migrationFilesSql from "../migrations/0002_files.sql?raw";
import migrationPagesSql from "../migrations/0003_notes_pages.sql?raw";
import { splitSqlStatements } from "../scripts/sql-split.mjs";
import { describe, it, expect, beforeEach } from "vitest";

/**
 * Migration files, in authoritative order.
 * Each file is applied at most once via `wrangler d1 migrations apply`.
 * A re-run is a no-op because `d1_migrations` records the name.
 */
const MIGRATIONS = [
  { name: "0001_init.sql", queries: splitSqlStatements(migrationSql) },
  { name: "0002_files.sql", queries: splitSqlStatements(migrationFilesSql) },
  { name: "0003_notes_pages.sql", queries: splitSqlStatements(migrationPagesSql) },
];

/** Every test starts from an empty database (wipes all pool storage). */
beforeEach(async () => {
  await reset();
});

/**
 * Return the set of applied migration file names from `d1_migrations`.
 */
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

const EXPECTED_TABLES = [
  "daily_rollups",
  "files",
  "habits",
  "journal",
  "notebooks",
  "notes",
  "sync_meta",
  "sync_queue",
  "tasks",
];
const EXPECTED_INDEXES = [
  "idx_files_user_created",
  "idx_habits_user",
  "idx_notebooks_user_position",
  "idx_notes_user_kind",
  "idx_notes_user_notebook",
  "idx_notes_user_updated",
  "idx_sync_user",
  "idx_tasks_due",
  "idx_tasks_user_status",
];

describe("D1 migrations", () => {
  it("applies every migration to an EMPTY database", async () => {
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);

    // tracking table exists and records all three migrations in order
    expect(await appliedMigrations()).toEqual([
      "0001_init.sql", "0002_files.sql", "0003_notes_pages.sql",
    ]);

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
    expect(await tables()).not.toContain("notebooks");

    // upgrade to latest
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);

    expect(await appliedMigrations()).toEqual(["0001_init.sql", "0002_files.sql", "0003_notes_pages.sql"]);
    expect(await tables()).toEqual(EXPECTED_TABLES);
    expect(await indexes()).toEqual(EXPECTED_INDEXES);
    // 001 schema untouched by the upgrade
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

  it("existing notes survive 0003 upgrade with safe defaults", async () => {
    // Seed a note under the 0001 schema — the original note shape only.
    await applyD1Migrations(env.BAKA_DB, [MIGRATIONS[0]]);
    await env.BAKA_DB.prepare(
      `INSERT INTO notes (id, user_id, created_at, updated_at, title, body, tags)
       VALUES ('note_existing', 'u1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'Old note', 'old body', '[]')`,
    ).run();

    // upgrade to latest (0001 + 0002 + 0003)
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);

    // The existing note survived with all original fields.
    const { results } = await env.BAKA_DB.prepare(
      "SELECT id, title, body, tags, user_id FROM notes WHERE id = 'note_existing'",
    ).all();
    expect(results).toEqual([{
      id: "note_existing", title: "Old note", body: "old body", tags: "[]", user_id: "u1",
    }]);

    // New columns exist with safe defaults.
    const { results: cols } = await env.BAKA_DB.prepare(
      "SELECT kind, scene, notebook_id, position, archived_at, revision FROM notes WHERE id = 'note_existing'",
    ).all();
    expect(cols[0]).toEqual({
      kind: "text",
      scene: null,
      notebook_id: null,
      position: 0,
      archived_at: null,
      revision: 0,
    });
  });

  it("creates notebooks table with required indexes", async () => {
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);

    const { results } = await env.BAKA_DB.prepare("PRAGMA table_info(notebooks)").all();
    const colNames = (results ?? []).map((r: any) => r.name);
    expect(colNames).toEqual(
      expect.arrayContaining(["id", "user_id", "name", "position", "created_at", "updated_at"]),
    );
    expect(colNames).toContain("id");
    expect(await indexes()).toContain("idx_notebooks_user_position");
  });

  it("re-application via migration machinery is safe (no-op for already-recorded file)", async () => {
    // Apply all migrations — 0003 is now tracked in d1_migrations.
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);
    expect(await appliedMigrations()).toHaveLength(3);

    // Re-apply ALL migrations via the tracking mechanism. Since 0003 is already
    // recorded, the ALTER statements are NOT re-executed — wrangler skips pending.
    await applyD1Migrations(env.BAKA_DB, MIGRATIONS);
    expect(await appliedMigrations()).toEqual(["0001_init.sql", "0002_files.sql", "0003_notes_pages.sql"]);
    expect(await tables()).toEqual(EXPECTED_TABLES);

    // Re-seed a note still intact.
    await env.BAKA_DB.prepare(
      `INSERT INTO notes (id, user_id, created_at, updated_at, title, body, tags, kind, notebook_id, position, revision)
       VALUES ('reapply_test', 'u1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 't', 'b', '[]', 'excalidraw', NULL, 1000, 1)`,
    ).run();

    const { results } = await env.BAKA_DB.prepare("SELECT kind, position, revision FROM notes WHERE id='reapply_test'").all();
    expect(results[0]).toEqual({ kind: "excalidraw", position: 1000, revision: 1 });
  });
});