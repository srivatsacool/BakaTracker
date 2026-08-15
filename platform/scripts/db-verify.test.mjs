/**
 * `npm run test:verify` — CLI-level verification of the D1 migration system.
 *
 * Runs the REAL tools against a disposable temp persist dir:
 *   1. `wrangler d1 migrations apply --local`   (authoritative migration mechanism)
 *   2. `scripts/db-verify.mjs`                  (the new non-mutating check)
 *
 * Proves, end to end, without any personal database state:
 *   - empty DB   → db:verify FAILS (missing migrations) with exit 1
 *   - migrated   → db:verify PASSES with exit 0
 *   - db:verify is genuinely non-mutating (sqlite file bytes unchanged)
 *   - schema drift (dropped table) → db:verify FAILS
 *   - migration missing from d1_migrations → db:verify FAILS
 *   - CLI idempotency: second `migrations apply` is a no-op
 *
 * Node's built-in test runner (no new dependencies): node --test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { splitSqlStatements } from "./sql-split.mjs";

const PLATFORM = join(import.meta.dirname, "..");
const WRANGLER = join(PLATFORM, "node_modules", "wrangler", "bin", "wrangler.js");
const VERIFY = join(PLATFORM, "scripts", "db-verify.mjs");
const DB = "bakas_db";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: PLATFORM, encoding: "utf8", ...opts });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function wrangler(args) {
  return run(process.execPath, [WRANGLER, ...args]);
}

function applyMigrations(persistDir) {
  return wrangler(["d1", "migrations", "apply", DB, "--local", "--persist-to", persistDir]);
}

function verify(persistDir) {
  return run(process.execPath, [VERIFY, "--persist-to", persistDir]);
}

/** Hash the DB content files under a dir — the main *.sqlite files ONLY.
 * (Excludes -wal/-shm and metadata sidecars, which Miniflare rewrites on
 * every connection, and would make a read-only check look "mutating".) */
function hashDbFiles(dir) {
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (e.endsWith(".sqlite") && !e.endsWith("-wal") && !e.endsWith("-shm")) files.push(p);
    }
  };
  walk(dir);
  const h = createHash("sha256");
  for (const f of files.sort()) h.update(f).update(readFileSync(f));
  return h.digest("hex");
}

function newPersistDir() {
  return mkdtempSync(join(tmpdir(), "baka-d1verify-"));
}

test("EMPTY database → db:verify FAILS (exit 1), naming the missing migrations", () => {
  // Guard: verify(emptyDir) uses only --persist-to; it must never read the
  // developer's real local state (that would be hidden-dependency testing).
  const dir = newPersistDir();
  try {
    const r = verify(dir);
    assert.equal(r.code, 1, "empty DB must FAIL verification");
    assert.match(r.stdout, /d1_migrations|not applied/, "must report nothing applied");
    assert.match(r.stdout, /0001_init\.sql/, "must name the missing migration");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("empty DB → migrate → db:verify passes (exit 0, 'up to date')", () => {
  const dir = newPersistDir();
  try {
    const apply = applyMigrations(dir);
    assert.equal(apply.code, 0, `apply failed: ${apply.stdout} ${apply.stderr}`);

    const v = verify(dir);
    assert.equal(v.code, 0, `verify failed: ${v.stdout} ${v.stderr}`);
    assert.match(v.stdout, /✔ database is up to date/);
    assert.match(v.stdout, /0001_init\.sql, 0002_files\.sql/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("db:verify is non-mutating (sqlite bytes unchanged)", () => {
  const dir = newPersistDir();
  try {
    assert.equal(applyMigrations(dir).code, 0);
    const hashBefore = hashDbFiles(dir);
    assert.equal(verify(dir).code, 0);
    assert.equal(hashDbFiles(dir), hashBefore, "db:verify must not modify the database");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("schema drift → db:verify FAILS naming the missing table", () => {
  const dir = newPersistDir();
  try {
    assert.equal(applyMigrations(dir).code, 0);
    // simulate a destructive external change: drop the files table
    const drop = wrangler([
      "d1", "execute", DB, "--local", "--persist-to", dir,
      "--command", "DROP TABLE files",
    ]);
    assert.equal(drop.code, 0, `drop failed: ${drop.stdout} ${drop.stderr}`);

    const v = verify(dir);
    assert.equal(v.code, 1, "dropped table must fail verification");
    assert.match(v.stdout, /schema object missing: table files/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migration removed from d1_migrations → db:verify FAILS naming it", () => {
  const dir = newPersistDir();
  try {
    assert.equal(applyMigrations(dir).code, 0);
    const del = wrangler([
      "d1", "execute", DB, "--local", "--persist-to", dir,
      "--command", "DELETE FROM d1_migrations WHERE name = '0002_files.sql'",
    ]);
    assert.equal(del.code, 0, `delete failed: ${del.stdout} ${del.stderr}`);

    const v = verify(dir);
    assert.equal(v.code, 1, "missing migration record must fail verification");
    assert.match(v.stdout, /migration 0002_files\.sql not applied/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI idempotency: second migrations apply is a no-op", () => {
  const dir = newPersistDir();
  try {
    assert.equal(applyMigrations(dir).code, 0);
    const second = applyMigrations(dir);
    assert.equal(second.code, 0, "second apply must not error");
    assert.match(second.stdout, /No migrations to apply|not require/i);

    // d1_migrations still exactly the expected rows (keep this list in sync
    // with the migration set — it broke once when 0003 landed and the
    // fixture was not updated)
    const q = wrangler([
      "d1", "execute", DB, "--local", "--persist-to", dir,
      "--command", "SELECT name FROM d1_migrations ORDER BY id", "--json",
    ]);
    assert.equal(q.code, 0);
    const rows = JSON.parse(q.stdout.slice(q.stdout.indexOf("[")));
    const names = rows[0].results.map((r) => r.name);
    assert.deepEqual(names, ["0001_init.sql", "0002_files.sql", "0003_notes_pages.sql"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("UPGRADE + data preservation: old schema + data → migrations apply → data intact", () => {
  const dir = newPersistDir();
  try {
    // Simulate an existing pre-upgrade database: 0001 schema applied with real
    // data, before the migration system was run (no d1_migrations table yet).
    const initSql = readFileSync(join(PLATFORM, "migrations", "0001_init.sql"), "utf8");
    const seed = [
      ...splitSqlStatements(initSql),
      // representative task in the real app table (row shape from 0001_init.sql)
      "INSERT INTO tasks (id, user_id, created_at, updated_at, title, status, priority, sort) VALUES "
        + "('task_upgrade', 'user_1', '2026-08-01T00:00:00Z', '2026-08-01T00:00:00Z', 'pre-existing task', 'done', 2, 0)",
    ].join("; ");
    const seedCmd = wrangler([
      "d1", "execute", DB, "--local", "--persist-to", dir, "--command", seed, "--json",
    ]);
    assert.equal(seedCmd.code, 0, `seed failed: ${seedCmd.stdout} ${seedCmd.stderr}`);

    // Run the migration system from the older state — 0002 must apply, 0001 must be a no-op.
    const apply = applyMigrations(dir);
    assert.equal(apply.code, 0, `apply failed: ${apply.stdout} ${apply.stderr}`);

    // Existing data survived, and the new schema object exists.
    const check = wrangler([
      "d1", "execute", DB, "--local", "--persist-to", dir,
      "--command",
      "SELECT id, title, status FROM tasks WHERE id = 'task_upgrade'; "
      + "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'files'",
      "--json",
    ]);
    assert.equal(check.code, 0, `check failed: ${check.stdout} ${check.stderr}`);
    const results = JSON.parse(check.stdout.slice(check.stdout.indexOf("[")));
    const [taskRows, filesRows] = results.map((s) => s.results);
    assert.deepEqual(taskRows, [{ id: "task_upgrade", title: "pre-existing task", status: "done" }]);
    assert.equal(filesRows.length, 1, "files table must exist after upgrade");

    // The database now verifies as up to date.
    const v = verify(dir);
    assert.equal(v.code, 0, `verify after upgrade failed: ${v.stdout} ${v.stderr}`);
    assert.match(v.stdout, /✔ database is up to date/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});