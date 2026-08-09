#!/usr/bin/env node
/**
 * BakaTracker — `npm run deploy`
 *
 * Deploys the WORKER using the generated production config
 * (`platform/wrangler.prod.jsonc`). Run `npm run setup` first — this
 * script refuses to run without a generated production config so a
 * misconfigured repo can never silently deploy a localhost-tuned worker
 * to production.
 *
 * Frontend (Cloudflare Pages) is deployed separately — see
 * docs/DEPLOYMENT.md.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLATFORM = join(__dirname, "..", "platform");
const PROD_CONFIG = join(PLATFORM, "wrangler.prod.jsonc");
const WRANGLER_JS = join(PLATFORM, "node_modules", "wrangler", "bin", "wrangler.js");

if (!existsSync(PROD_CONFIG)) {
  console.error(
    "✖ platform/wrangler.prod.jsonc not found.\n" +
    "  Run `npm run setup` first to generate your production configuration.",
  );
  process.exit(1);
}

// Sanity: the prod config must not point at localhost (fail-fast guard).
const cfg = JSON.parse(readFileSync(PROD_CONFIG, "utf8"));
const origin = cfg?.vars?.APP_ORIGIN || "";
if (!origin || origin.startsWith("http://localhost")) {
  console.error("✖ APP_ORIGIN in wrangler.prod.jsonc is localhost — refusing to deploy. Re-run `npm run setup`.");
  process.exit(1);
}

console.log("🚀 Deploying worker with production config …");
console.log(`   origin: ${origin}`);

const r = spawnSync(process.execPath, [WRANGLER_JS, "deploy", "--config", "wrangler.prod.jsonc"],
  { cwd: PLATFORM, stdio: "inherit", maxBuffer: 64 * 1024 * 1024 });

if (r.status !== 0) {
  console.error("✖ deploy failed");
  process.exit(r.status ?? 1);
}
console.log("✔ deployed");