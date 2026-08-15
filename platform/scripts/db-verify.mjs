#!/usr/bin/env node
/**
 * BakaTracker — `npm run db:verify` / `npm run db:verify:remote`
 *
 * Non-mutating check: "is this D1 database at the expected migration/schema
 * state?"
 *
 *   * Expected migrations are DERIVED from the authoritative migration set
 *     (platform/migrations/*.sql, sorted — never a hardcoded list).
 *   * Expected schema objects (tables + indexes) are parsed from those same
 *     migration files, so there is exactly ONE schema source.
 *   * The live database is inspected with SELECT-only queries via
 *     `wrangler d1 execute` (--json). Nothing is written.
 *
 * Usage (run from platform/):
 *   node scripts/db-verify.mjs                    # local dev D1 (default)
 *   node scripts/db-verify.mjs --remote           # remote D1 via wrangler.prod.jsonc
 *   node scripts/db-verify.mjs --persist-to <dir> # explicit local state dir (tests)
 *
 * Exit codes: 0 = up to date · 1 = missing/divergent · 2 = could not inspect
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLATFORM = join(__dirname, "..");
const MIGRATIONS_DIR = join(PLATFORM, "migrations");
const WRANGLER_JS = join(PLATFORM, "node_modules", "wrangler", "bin", "wrangler.js");
const DB_NAME = "bakas_db";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const persistIdx = args.indexOf("--persist-to");
const persistTo = persistIdx >= 0 ? args[persistIdx + 1] : null;

const ok = (s) => console.log("✔ " + s);
const bad = (s) => console.log("✗ " + s);

// ---------------------------------------------------------------------------
// Expected state, derived from the authoritative migration set.
// ---------------------------------------------------------------------------
const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
if (migrationFiles.length === 0) {
  console.error("✖ no migrations found in " + MIGRATIONS_DIR);
  process.exit(2);
}

// Parse CREATE TABLE / CREATE INDEX names out of the migration SQL.
// Comments are stripped FIRST: a prose comment like "CREATE INDEX uses
// IF NOT EXISTS" must never count as a schema object (0003 had exactly
// that, silently adding a phantom index named `uses` to the expectations).
const SCHEMA_RE = /^\s*CREATE\s+(?:TABLE|INDEX)(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"' ]?([a-zA-Z_][a-zA-Z0-9_]*)/gim;
const expected = { tables: new Set(), indexes: new Set() };
for (const file of migrationFiles) {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  const withoutComments = sql
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .split("\n")
    .map((line) => line.replace(/--.*$/, "")) // line comments
    .join("\n");
  for (const m of withoutComments.matchAll(SCHEMA_RE)) {
    const kind = /INDEX/i.test(m[0]) ? "indexes" : "tables";
    expected[kind].add(m[1].toLowerCase());
  }
}

// ---------------------------------------------------------------------------
// Read-only inspection via wrangler d1 execute --json
// ---------------------------------------------------------------------------
function inspect(sql) {
  const cmd = ["d1", "execute", DB_NAME, remote ? "--remote" : "--local", "--json", "--command", sql];
  if (remote) cmd.push("--config", "wrangler.prod.jsonc");
  if (!remote && persistTo) cmd.push("--persist-to", persistTo);
  const r = spawnSync(process.execPath, [WRANGLER_JS, ...cmd], {
    cwd: PLATFORM,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const stdout = (r.stdout ?? "").trim();
  const start = stdout.indexOf("[");
  if (start >= 0) {
    try {
      return JSON.parse(stdout.slice(start)); // array of per-statement results
    } catch {
      /* fall through to error handling */
    }
  }
  // wrangler --json may return an error OBJECT instead of an array, e.g.
  // {"error":{"text":"no such table: d1_migrations: SQLITE_ERROR"}} for a
  // database that has never been migrated. Return it so callers can decide.
  try {
    const obj = JSON.parse(stdout);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
  } catch {
    /* not JSON either — hard failure below */
  }
  console.error("✖ could not inspect database — wrangler d1 execute produced no parseable output");
  console.error((r.stderr ?? "").slice(0, 400) || stdout.slice(0, 400));
  process.exit(2);
}

/** Normalize a per-statement result or the whole-response error object into
 * the array shape callers expect, converting "no such table: d1_migrations"
 * into an empty result + a flag the caller reads. */
function asStatements(result) {
  if (Array.isArray(result)) return result;
  // {"error":{"text": "..."}} → two synthetic statements: first fails (reason
  // preserved), second is empty so multi-query callers can distinguish.
  const text = result?.error?.text ?? "";
  return [
    { success: false, error: text },
    { success: true, results: [] },
  ];
}

const applied = new Set();
let migrationsTableMissing = false;
for (const st of asStatements(inspect("SELECT name FROM d1_migrations ORDER BY id"))) {
  if (st.success === false) {
    migrationsTableMissing = /no such table/i.test(st.error ?? "");
    continue;
  }
  for (const row of st.results ?? []) applied.add(row.name);
}

const liveObjects = new Set();
for (const st of asStatements(inspect("SELECT name, type FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' ORDER BY name"))) {
  if (st.success === false) {
    console.error("✖ schema inspection failed: " + (st.error ?? "unknown"));
    process.exit(2);
  }
  for (const row of st.results ?? []) liveObjects.add(row.name.toLowerCase());
}

// ---------------------------------------------------------------------------
// Compare + report
// ---------------------------------------------------------------------------
console.log(
  `\nBakaTracker D1 verification — ${remote ? "REMOTE (wrangler.prod.jsonc)" : "local"}\n` +
  `  expected migrations : ${migrationFiles.length} (${migrationFiles.join(", ")})\n` +
  `  applied migrations  : ${applied.size} (${[...applied].join(", ") || "none"})\n` +
  `  expected schema     : ${expected.tables.size} tables, ${expected.indexes.size} indexes\n`,
);

let problems = 0;
if (migrationsTableMissing) {
  bad(`no d1_migrations table — database has never been migrated (run \`npm run db:migrate\`)`);
  problems++;
}
for (const f of migrationFiles) {
  if (!applied.has(f)) {
    bad(`migration ${f} not applied`);
    problems++;
  }
}
// applied-but-unknown rows (e.g. migration file deleted/reverted) — warn only
for (const name of applied) {
  if (!migrationFiles.includes(name)) console.log(`ℹ d1_migrations records ${name}, not in the migration set — ignorable stale entry`);
}
for (const tbl of expected.tables) {
  if (!liveObjects.has(tbl)) { bad(`schema object missing: table ${tbl}`); problems++; }
}
for (const idx of expected.indexes) {
  if (!liveObjects.has(idx)) { bad(`schema object missing: index ${idx}`); problems++; }
}

if (problems === 0) {
  ok("database is up to date");
  process.exit(0);
}
console.log(`\n✗ ${problems} problem(s) found — fix with \`npm run db:migrate\` (local) and re-verify.`);
process.exit(1);