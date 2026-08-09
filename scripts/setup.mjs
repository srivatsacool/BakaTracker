#!/usr/bin/env node
/**
 * BakaTracker — `npm run setup`
 *
 * One-command bootstrap for a fresh (or existing) Cloudflare instance.
 * Creates the account resources, writes `platform/wrangler.prod.jsonc`
 * (gitignored), stores secrets via `wrangler secret put`, and prints the
 * exact Google OAuth redirect URI to register.
 *
 * Auth (in priority order):
 *   1. CLOUDFLARE_API_TOKEN env var (recommended for CI / scripting)
 *   2. wrangler login session (interactive `wrangler login` first)
 *
 * Usage:
 *   npm run setup                      # interactive prompts
 *   npm run setup -- --name my-tracker # custom worker name
 *   npm run setup -- --domain api.example.com
 *   npm run setup -- --with-r2         # also create an R2 bucket
 *   npm run setup -- --with-ai         # add the Workers AI binding
 *   npm run setup -- --dry-run         # validate only, change nothing
 *
 * Google OAuth creds can be supplied via flags or GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET env vars to skip the interactive prompt.
 * The client secret is never echoed and never written to disk.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PLATFORM = join(ROOT, "platform");
const WRANGLER_JS = join(PLATFORM, "node_modules", "wrangler", "bin", "wrangler.js");
const PROD_CONFIG = join(PLATFORM, "wrangler.prod.jsonc");
const CF_API = "https://api.cloudflare.com/client/v4";

const D1_NAME = "bakas_db";
const KV_NAME = "OAUTH_KV";
const DEFAULT_WORKER = "bakatracker-platform";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes(name);

const opts = {
  name: flag("--name", DEFAULT_WORKER),
  domain: flag("--domain", null),
  accountId: flag("--account-id", null),
  d1Name: flag("--d1-name", D1_NAME),
  kvName: flag("--kv-name", KV_NAME),
  bucketName: flag("--bucket-name", null),
  r2: !!has("--with-r2"),
  ai: !!has("--with-ai"),
  dryRun: !!has("--dry-run"),
  googleClientId: flag("--google-client-id", process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: flag("--google-client-secret", process.env.GOOGLE_CLIENT_SECRET),
};

const log = (...a) => console.log("›", ...a);
const warn = (...a) => console.log("⚠", ...a);
const ok = (...a) => console.log("✔", ...a);

// ---------------------------------------------------------------------------
// Auth — resolve an API token (never printed)
// ---------------------------------------------------------------------------
function resolveToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return { token: process.env.CLOUDFLARE_API_TOKEN, source: "CLOUDFLARE_API_TOKEN" };
  }
  // wrangler login session — read the stored oauth token on this machine.
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
  const res = spawnSync("curl", ["-s", "--max-time", "30", "-H", `Authorization: Bearer ${token}`,
    ...(init.method && init.method !== "GET" ? ["-X", init.method] : []),
    ...(init.data ? ["-H", "Content-Type: application/json", "-d", init.data] : []),
    `${CF_API}${path}`], { encoding: "utf8" });
  try {
    return JSON.parse(res.stdout || "{}");
  } catch {
    return { success: false, errors: [{ message: `bad API response: ${res.stdout?.slice(0, 120)}` }] };
  }
}

// ---------------------------------------------------------------------------
// Wrangler runner (reuses whatever auth wrangler itself has)
// ---------------------------------------------------------------------------
function wrangler(argsArr, { input } = {}) {
  if (!existsSync(WRANGLER_JS)) {
    console.error("✖ wrangler not found — run `npm install` in platform/ first");
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [WRANGLER_JS, ...argsArr],
    { cwd: PLATFORM, encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });
  if (!r.stdout && !r.stderr) return { code: r.status, out: "", err: "" };
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}

function runWrangler(argsArr, { input, label } = {}) {
  const r = wrangler(argsArr, { input });
  const text = (r.out + r.err).trim();
  if (r.code !== 0) {
    console.error(`✖ ${label || argsArr.join(" ")} failed (${r.code})\n${text.slice(0, 600)}`);
    process.exit(1);
  }
  if (text) log(`${label || argsArr.join(" ")}:\n${indent(text, 2)}`);
  return text;
}

const indent = (s, n) => s.split("\n").map((l) => " ".repeat(n) + l).join("\n");

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------
function ask(question, def = "") {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(def ? `${question} [${def}]: ` : `${question}: `, (a) => { rl.close(); resolve(a.trim() || def); });
  });
}

/** Prompt without echoing the typed value. */
function askSecret(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const orig = rl._writeToOutput?.bind(rl);
    if (orig) rl._writeToOutput = (s) => orig(s.replace(/[^\n]/g, "*"));
    rl.question(`${question}: `, (a) => { rl.close(); resolve(a.trim()); });
  });
}

// ---------------------------------------------------------------------------
// Existence checks (idempotent create)
// ---------------------------------------------------------------------------
function findD1(token, accountId, name) {
  const d = cf(`/accounts/${accountId}/d1/database?per_page=50`, token);
  return (d.result || []).find((x) => x.name === name)?.uuid || null;
}
function findKV(token, accountId, title) {
  const d = cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=50`, token);
  return (d.result || []).find((x) => x.title === title)?.id || null;
}
function findBucket(token, accountId, name) {
  const d = cf(`/accounts/${accountId}/r2/buckets`, token);
  return (d.result || []).find((x) => x.name === name)?.name || null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== BakaTracker setup (${opts.dryRun ? "DRY RUN" : "configure"}) ===\n`);

  // 1. Auth ---------------------------------------------------------------
  const auth = resolveToken();
  if (!auth) {
    console.error(
      "✖ No Cloudflare credentials found.\n" +
      "  Option A: set CLOUDFLARE_API_TOKEN=<token>\n" +
      "  Option B: run `wrangler login` in platform/ (interactive), then re-run setup.");
    process.exit(1);
  }
  ok(`Cloudflare auth: ${auth.source}`);

  // 2. Account -------------------------------------------------------------
  let accountId = opts.accountId;
  if (!accountId) {
    const accounts = cf("/accounts?per_page=10", auth.token);
    if (!accounts.success || !accounts.result?.length) {
      console.error("✖ Could not list Cloudflare accounts:", JSON.stringify(accounts.errors).slice(0, 300));
      process.exit(1);
    }
    accountId = accounts.result[0].id;
    log(`Account: ${accounts.result[0].name} (${accountId})`);
    if (accounts.result.length > 1) {
      warn(`${accounts.result.length} accounts found — using the first. Pass --account-id to choose.`);
    }
  }

  // 3. workers.dev subdomain ----------------------------------------------
  const sub = cf(`/accounts/${accountId}/workers/subdomain`, auth.token);
  let subdomain = null;
  if (sub.success && sub.result?.subdomain) subdomain = sub.result.subdomain;
  if (!subdomain) {
    console.error("✖ Could not resolve your workers.dev subdomain. Either pass --domain or enable Workers on the account.");
    process.exit(1);
  }

  if (opts.domain) {
    // strip scheme so users can pass https://api.example.com or api.example.com
    opts.domain = opts.domain.replace(/^https?:\/\//, "");
  }
  const origin = opts.domain ? `https://${opts.domain}` : `https://${opts.name}.${subdomain}.workers.dev`;
  ok(`Worker origin (APP_ORIGIN): ${origin}`);

  // 4. D1 ------------------------------------------------------------------
  let d1Id = opts.dryRun ? null : findD1(auth.token, accountId, opts.d1Name);
  if (opts.dryRun) {
    log(`D1: would ensure database "${opts.d1Name}" exists (reuse if present)`);
  } else if (d1Id) {
    ok(`D1 "${opts.d1Name}" already exists — reusing (id ${d1Id.slice(0, 8)}…)`);
  } else {
    const out = runWrangler(["d1", "create", opts.d1Name], { label: `creating D1 ${opts.d1Name}` });
    const m = out.match(/database_id\s*[=:]\s*"?([0-9a-f-]{36})"?/i) || out.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (!m) { console.error("✖ Could not parse D1 id from wrangler output"); process.exit(1); }
    d1Id = m[1];
    ok(`D1 "${opts.d1Name}" created (id ${d1Id})`);
  }

  // 5. KV -------------------------------------------------------------------
  let kvId = opts.dryRun ? null : findKV(auth.token, accountId, opts.kvName);
  if (opts.dryRun) {
    log(`KV: would ensure namespace "${opts.kvName}" exists (reuse if present)`);
  } else if (kvId) {
    ok(`KV "${opts.kvName}" already exists — reusing (id ${kvId.slice(0, 8)}…)`);
  } else {
    const out = runWrangler(["kv", "namespace", "create", opts.kvName], { label: `creating KV ${opts.kvName}` });
    const m = out.match(/([0-9a-f]{32})/i);
    if (!m) { console.error("✖ Could not parse KV id from wrangler output"); process.exit(1); }
    kvId = m[1];
    ok(`KV "${opts.kvName}" created (id ${kvId})`);
  }

  // 6. R2 -------------------------------------------------------------------
  let r2Binding = null;
  if (opts.r2) {
    const bucketName = opts.bucketName || `${opts.name.replace(/[^a-z0-9-]/g, "-")}-files`;
    if (opts.dryRun) {
      log(`R2: would ensure bucket "${bucketName}" exists + add R2_BUCKET binding`);
      r2Binding = { binding: "R2_BUCKET", bucket_name: bucketName };
    } else {
      const existing = findBucket(auth.token, accountId, bucketName);
      if (existing) {
        ok(`R2 bucket "${bucketName}" already exists — reusing`);
      } else {
        const out = runWrangler(["r2", "bucket", "create", bucketName], { label: `creating R2 bucket ${bucketName}` });
        if (out.includes("10042") || out.includes("enable")) {
          warn("R2 is not enabled on this account — enable it in the dashboard, then re-run with --with-r2.");
          r2Binding = null;
        } else {
          ok(`R2 bucket "${bucketName}" created`);
        }
      }
      if (!r2Binding) r2Binding = { binding: "R2_BUCKET", bucket_name: bucketName };
    }
  } else {
    log("R2: skipped (pass --with-r2 to provision file storage)");
  }

  // 7. Cookie encryption key ------------------------------------------------
  // Reuse an existing key when re-running setup on a live instance (idempotent:
  // re-running must not invalidate active sessions). Otherwise generate fresh.
  const cookieKey = process.env.COOKIE_ENCRYPTION_KEY || randomBytes(32).toString("hex");
  ok(cookieKey === process.env.COOKIE_ENCRYPTION_KEY
    ? "COOKIE_ENCRYPTION_KEY: reused from environment (no rotation)"
    : "Generated COOKIE_ENCRYPTION_KEY (64 hex chars)");

  // 8. Google OAuth prompts --------------------------------------------------
  let { googleClientId, googleClientSecret } = opts;
  if (opts.dryRun) {
    log("Google: would prompt for GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  } else {
    while (!googleClientId) {
      googleClientId = (await ask("Google OAuth Client ID (from Google Cloud Console)")).trim();
      if (!googleClientId) warn("Client ID cannot be empty");
    }
    while (!googleClientSecret) {
      googleClientSecret = (await askSecret("Google OAuth Client Secret (input hidden)")).trim();
      if (!googleClientSecret) warn("Client secret cannot be empty");
    }
    ok("Google OAuth credentials captured (secret held in memory only, never written to disk)");
  }

  // 9. Write production config ------------------------------------------------
  const prod = {
    $schema: "node_modules/wrangler/config-schema.json",
    name: opts.name,
    main: "src/index.ts",
    compatibility_date: "2026-08-07",
    compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
    migrations: [{ new_sqlite_classes: ["MyMCP"], tag: "v1" }],
    durable_objects: { bindings: [{ class_name: "MyMCP", name: "MCP_OBJECT" }] },
    kv_namespaces: [{ binding: "OAUTH_KV", id: kvId }],
    d1_databases: [{ binding: "BAKA_DB", database_name: opts.d1Name, database_id: d1Id, migrations_dir: "./migrations" }],
    ai: opts.ai ? { binding: "AI" } : undefined,
    r2_buckets: r2Binding ? [r2Binding] : undefined,
    routes: opts.domain ? [{ pattern: opts.domain, custom_domain: true }] : undefined,
    vars: {
      APP_ORIGIN: origin,
      // Explicit CORS allowlist (security pass): the worker's own origin is the
      // safe default; self-hosters serving the UI from Pages/a custom domain
      // extend this with their UI origin (comma-separated). Never a wildcard.
      CORS_ALLOWED_ORIGINS: origin,
      SYNC_LOCK_TTL_SECONDS: 60,
    },
    observability: { enabled: true },
  };
  // drop undefined keys
  for (const k of ["ai", "r2_buckets", "routes"]) if (prod[k] === undefined) delete prod[k];

  if (opts.dryRun) {
    log(`config: would write ${PROD_CONFIG} (gitignored) with:`);
    log(`  name=${opts.name}  d1=${opts.d1Name}  kv=${opts.kvName}  origin=${origin}`);
    log(`  cors allowlist: ${origin} (+ edit vars.CORS_ALLOWED_ORIGINS for a Pages/UI origin)`);
    if (prod.ai) log("  ai binding enabled");
    if (prod.r2_buckets) log(`  r2 binding: ${JSON.stringify(prod.r2_buckets[0].bucket_name)}`);
    if (prod.routes) log(`  routes: ${JSON.stringify(prod.routes)}`);
  } else {
    writeFileSync(PROD_CONFIG, JSON.stringify(prod, null, 2) + "\n");
    ok(`Wrote ${PROD_CONFIG}`);

    // 10. Secrets -------------------------------------------------------------
    const secrets = [
      ["GOOGLE_CLIENT_ID", googleClientId],
      ["GOOGLE_CLIENT_SECRET", googleClientSecret],
      ["COOKIE_ENCRYPTION_KEY", cookieKey],
    ];
    if (process.env.GEMINI_API_KEY) secrets.push(["GEMINI_API_KEY", process.env.GEMINI_API_KEY]);
    else if (!opts.ai) log("GEMINI_API_KEY: skipped (set it later with `npx wrangler secret put GEMINI_API_KEY` if needed)");

    for (const [name, value] of secrets) {
      const r = wrangler(["secret", "put", name, "--name", opts.name], { input: value + "\n" });
      if (r.code !== 0) {
        console.error(`✖ Failed to set secret ${name}:\n${(r.out + r.err).slice(0, 400)}`);
        process.exit(1);
      }
      ok(`Secret ${name} stored (${name === "COOKIE_ENCRYPTION_KEY" ? "generated" : "value not shown"})`);
    }

    // 11. Migrations ------------------------------------------------------------
    const mig = runWrangler(["d1", "migrations", "apply", opts.d1Name, "--remote", "--config", "wrangler.prod.jsonc"],
      { label: "applying D1 migrations (remote)" });
    if (!/0001_init\.sql.*✅|✅.*0001_init\.sql|no migrations to apply|already applied/i.test(mig)) {
      log("migration output above — verify 0001_init.sql applied or already recorded");
    }
  }

  // 12. Redirect URI + next steps -----------------------------------------
  const redirect = `${origin}/callback`;
  console.log("\n" + "=".repeat(64));
  console.log("✅ Setup complete.");
  console.log("=".repeat(64));
  console.log(`\n  Worker name      : ${opts.name}`);
  console.log(`  APP_ORIGIN       : ${origin}`);
  console.log(`  Google redirect  : ${redirect}`);
  console.log(`  Deploy config    : ${PROD_CONFIG}`);
  console.log(`\n  → Register this EXACT redirect URI in Google Cloud Console`);
  console.log(`    (APIs & Services → Credentials → your OAuth client → Authorized redirect URIs).`);
  console.log(`\n  Next step: npm run deploy\n`);
}

main().catch((e) => { console.error("✖", e); process.exit(1); });