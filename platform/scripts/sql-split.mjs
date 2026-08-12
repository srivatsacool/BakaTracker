/**
 * Miniflare/D1 compatibility adapter — SQL statement splitting.
 *
 * THIS IS TEST-INFRASTRUCTURE CODE, NOT THE CANONICAL MIGRATION MECHANISM.
 *
 * Why it exists: Miniflare's D1 `exec()` rejects the comment-leading,
 * multi-statement migration files, so every runtime that hands SQL to a
 * Miniflare D1 handle (E2E harness, vitest worker pool) must split a
 * migration file into individual statements first. Wrangler's native
 * `d1 migrations apply` does this itself and remains the authoritative
 * mechanism; this module only mirrors that split for Miniflare transports.
 *
 * Authoritative migration source: platform/migrations/*.sql
 *   ┌──────────────────────────────┐
 *   │ platform/migrations/*.sql    │
 *   ├──────────────────────────────┤
 *   │ wrangler d1 migrations apply │  ← production/local mechanism
 *   └──────────────────────────────┘
 *   └→ Miniflare transports (E2E harness, vitest pool) use splitSqlStatements()
 *      against the SAME files — never a second schema source.
 */

/** Strip SQL line comments (`-- …` to end of line) and split on `;`
 * (mirrors what `wrangler d1 migrations apply` does internally per migration
 * file). Comments are removed BEFORE splitting so that trailing comments after
 * a `;` and `;` characters inside comments cannot corrupt the statement list. */
export function splitSqlStatements(raw) {
  return raw
    // strip every `--` line comment, full-line or trailing (e.g. `-- Google \`sub\``)
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}