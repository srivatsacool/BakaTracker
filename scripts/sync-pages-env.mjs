#!/usr/bin/env node
/**
 * sync-pages-env.mjs — converge the Cloudflare Pages production build env to
 * `scripts/pages-env.json` (the single source of truth).
 *
 * Why this exists: the Pages build env (VITE_*) lives in the dashboard/API and
 * had no repo owner. It drifted to a dead Auth0-era config and every build
 * shipped a broken bundle. This script makes the contract reproducible and
 * idempotent: it sets missing/changed vars and deletes vars not in the
 * contract — the live project converges to pages-env.json.
 *
 * Auth (priority order): CLOUDFLARE_API_TOKEN env var, then the `wrangler
 * login` session. The token is never printed.
 *
 * Usage:
 *   npm run sync:pages-env                    # converge (write)
 *   npm run sync:pages-env -- --dry-run       # show the plan, change nothing
 *   node scripts/sync-pages-env.mjs --project other-name --account-id xxx
 *
 * The values in pages-env.json are PUBLIC by design: VITE_* vars are baked
 * into the browser bundle. Never put secrets here (GOOGLE_CLIENT_SECRET,
 * COOKIE_ENCRYPTION_KEY, …) — those belong to Worker secrets.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTRACT = join(__dirname, "pages-env.json");
const CF_API = "https://api.cloudflare.com/client/v4";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes(name);
const dryRun = has("--dry-run");
const project = flag("--project", "bakatracker");
const accountIdFlag = flag("--account-id", null);

function resolveToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return { token: process.env.CLOUDFLARE_API_TOKEN, source: "CLOUDFLARE_API_TOKEN" };
  }
  const candidates = [
    join(process.env.APPDATA || "", "xdg.config", ".wrangler", "config", "default.toml"),
    join(process.env.HOME || "", ".wrangler", "config", "default.toml"),
    join(process.env.HOME || "", ".config", ".wrangler", "config", "default.toml"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const m = readFileSync(p, "utf8").match(/^\s*oauth_token\s*=\s*"([^"]+)"/m);
    if (m && m[1]) return { token: m[1], source: `wrangler login (${p})` };
  }
  return null;
}

function cf(path, token, init = {}) {
  const curlArgs = [
    "-s", "--max-time", "30",
    "-H", `Authorization: Bearer ${token}`,
    ...(init.method && init.method !== "GET" ? ["-X", init.method] : []),
    ...(init.data ? ["-H", "Content-Type: application/json", "-d", init.data] : []),
    `${CF_API}${path}`,
  ];
  const r = spawnSync("curl", curlArgs, { encoding: "utf8" });
  try {
    return JSON.parse(r.stdout || "{}");
  } catch {
    return { success: false, errors: [{ message: `bad response: ${(r.stdout || "").slice(0, 120)}` }] };
  }
}

async function main() {
  const auth = resolveToken();
  if (!auth) {
    console.error("✖ No Cloudflare credentials — set CLOUDFLARE_API_TOKEN or run `npx wrangler login`.");
    process.exit(1);
  }
  const want = JSON.parse(readFileSync(CONTRACT, "utf8"));

  const accounts = cf("/accounts?per_page=10", auth.token);
  const accountId = accountIdFlag || accounts.result?.[0]?.id;
  if (!accountId) {
    console.error("✖ Could not resolve account id — pass --account-id.");
    process.exit(1);
  }

  const url = `/accounts/${accountId}/pages/projects/${project}`;
  const cur = cf(url, auth.token);
  if (!cur.success) {
    console.error("✖ Could not read Pages project:", JSON.stringify(cur.errors).slice(0, 300));
    process.exit(1);
  }
  const env = cur.result.deployment_configs?.production?.env_vars ?? {};

  const toSet = {};
  const toDelete = [];
  for (const [k, v] of Object.entries(want)) {
    const curVal = env[k]?.value ?? null;
    if (curVal !== v) toSet[k] = v;
  }
  for (const k of Object.keys(env)) {
    if (!(k in want)) toDelete.push(k);
  }

  if (!Object.keys(toSet).length && !toDelete.length) {
    console.log(`✔ ${project}: Pages env in sync with scripts/pages-env.json`);
    return;
  }

  console.log(`${dryRun ? "PLAN" : "SYNC"} for ${project}:`);
  for (const [k, v] of Object.entries(toSet)) console.log(`  set    ${k} = ${v}`);
  for (const k of toDelete) console.log(`  delete ${k}`);
  if (dryRun) return;

  const envVars = {
    ...Object.fromEntries(Object.entries(toSet).map(([k, v]) => [k, { type: "plain_text", value: v }])),
    ...Object.fromEntries(toDelete.map((k) => [k, null])),
  };
  const body = { deployment_configs: { production: { env_vars: envVars } } };
  const resp = cf(url, auth.token, { method: "PATCH", data: JSON.stringify(body) });
  if (!resp.success) {
    console.error("✖ PATCH failed:", JSON.stringify(resp.errors).slice(0, 400));
    process.exit(1);
  }

  const after = cf(url, auth.token);
  const env2 = after.result?.deployment_configs?.production?.env_vars ?? {};
  const mismatches = Object.entries(want)
    .filter(([k, v]) => (env2[k]?.value ?? null) !== v)
    .map(([k]) => k)
    .concat(Object.keys(env2).filter((k) => !(k in want)));
  if (mismatches.length) {
    console.error("✖ Verify failed — still mismatched:", mismatches.join(", "));
    process.exit(1);
  }
  console.log("✔ Verified: live Pages env now matches the contract");
}

main().catch((e) => {
  console.error("✖", e);
  process.exit(1);
});
