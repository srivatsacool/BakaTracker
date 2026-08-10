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

/** Strip full-line `--` comments and split on `;` (mirrors what `wrangler d1
 * migrations apply` does internally per migration file). */
export function splitSqlStatements(raw) {
  return raw
    // strip full-line comments (e.g. `-- Google \`sub\``)
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}