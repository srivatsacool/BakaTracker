#!/usr/bin/env node
/**
 * BakaTracker — frontend Cloudflare Pages readiness checks (`npm run test:pages`).
 *
 * node:test suite. No browser, no network. It verifies the contract that a
 * Pages deployment depends on:
 *
 *   1. Build: a production build with a configured VITE_API_BASE_URL compiles,
 *      and the resulting bundle contains that origin.
 *   2. No localhost leakage: the production bundle must NOT contain the
 *      localhost dev fallback (env.ts fails loud when VITE_API_BASE_URL is
 *      missing in production — this proves it never silently ships localhost).
 *   3. No server secrets in the browser bundle: OAuth client secrets, cookie
 *      keys, Cloudflare tokens, `.dev.vars`-style values must never appear.
 *   4. SPA fallback is explicit in BOTH deployment shapes:
 *        - Pages: public/_redirects  →  /*  /index.html  200
 *        - wrangler assets worker: assets.not_found_handling = single-page-application
 *   5. Cacheable assets hang off the origin root (Vite `base` default '/'),
 *      so dist references don't assume a sub-path or a dev server.
 *
 * Runs the REAL build (`npm run build`) — same command Pages executes — into
 * the repo's gitignored dist/.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const TEST_ORIGIN = "https://bakatracker-platform.e2e-test.workers.dev";
const TEST_CLIENT_ID = "pages-check-test.apps.googleusercontent.com";

function buildWith(origin, clientId) {
  return spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      VITE_API_BASE_URL: origin,
      VITE_GOOGLE_CLIENT_ID: clientId,
    },
    timeout: 240_000,
  });
}

const jsAssets = () =>
  (existsSync(DIST) ? readdirSync(join(DIST, "assets")) : [])
    .filter((f) => f.endsWith(".js"))
    .map((f) => join(DIST, "assets", f));

const bundleText = () => {
  let all = "";
  for (const f of jsAssets()) all += readFileSync(f, "utf8");
  return all;
};

test("production-shaped build succeeds with a configured API origin", () => {
  const r = buildWith(TEST_ORIGIN, TEST_CLIENT_ID);
  assert.equal(r.status, 0, `build failed:\n${(r.stdout || "") + (r.stderr || "")}`.slice(-1200));
  assert.ok(jsAssets().length > 0, "dist/assets must contain JS bundles");
});

test("bundle contains the configured API origin (no silent localhost)", () => {
  const bundle = bundleText();
  assert.ok(bundle.includes(TEST_ORIGIN), "bundle must embed the configured VITE_API_BASE_URL");
  assert.ok(
    !bundle.includes("http://localhost:8787"),
    "production bundle must not contain the localhost dev fallback",
  );
});

test("bundle contains the configured Google client id (UI marker)", () => {
  const bundle = bundleText();
  assert.ok(bundle.includes(TEST_CLIENT_ID), "bundle must embed VITE_GOOGLE_CLIENT_ID");
});

const SERVER_ONLY = [
  /GOOGLE_CLIENT_SECRET\s*[:=]/i,
  /GOCSPX-[A-Za-z0-9_-]{10,}/, // Google OAuth client secret prefix
  /COOKIE_ENCRYPTION_KEY\s*[:=]/i,
  /CLOUDFLARE_API_TOKEN\s*[:=]/i,
  /GEMINI_API_KEY\s*[:=]/i,
  /wrangler\.prod/i,
  /\.dev\.vars/i,
];

test("browser bundle exposes NO server-only secrets", () => {
  const bundle = bundleText();
  for (const re of SERVER_ONLY) {
    assert.ok(!re.test(bundle), `bundle must not match ${re}`);
  }
});

test("Pages SPA fallback: public/_redirects rewrites /* to /index.html 200", () => {
  const f = join(ROOT, "public", "_redirects");
  assert.ok(existsSync(f), "public/_redirects must exist");
  const rules = readFileSync(f, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  assert.ok(
    rules.some((l) => l.startsWith("/*") && l.includes("/index.html") && l.includes("200")),
    `_redirects must contain the SPA fallback rule, got: ${rules.join(" | ")}`,
  );
  // _redirects must survive the build into dist (Vite copies public/ verbatim).
  const built = join(DIST, "_redirects");
  assert.ok(existsSync(built), "_redirects must be copied into dist/");
});

test("wrangler assets worker has single-page-application fallback configured", () => {
  const cfg = readFileSync(join(ROOT, "wrangler.jsonc"), "utf8");
  assert.ok(
    cfg.includes("single-page-application"),
    "root wrangler.jsonc must set assets.not_found_handling = single-page-application",
  );
});

test("dist index.html references root-relative (no sub-path, no dev server)", () => {
  const html = readFileSync(join(DIST, "index.html"), "utf8");
  assert.ok(!html.includes("/src/"), "production index.html must not reference the source tree");
  assert.ok(!html.includes("localhost"), "production index.html must not reference localhost");
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const p = m[1];
    if (p.startsWith("http") || p.startsWith("data:") || p.startsWith("#")) continue;
    assert.ok(p.startsWith("/"), `asset ref must be root-absolute (got "${p}")`);
  }
});

test("PWA artifacts are present in dist (manifest + service worker)", () => {
  for (const f of ["manifest.webmanifest", "sw.js", "registerSW.js"]) {
    const p = join(DIST, f);
    assert.ok(existsSync(p), `${f} must exist in dist`);
    assert.ok(statSync(p).size > 0, `${f} must be non-empty`);
  }
});
import { execFileSync } from "node:child_process";

const SETUP = join(ROOT, "scripts", "setup.mjs");

test("setup --ui-origin writes CORS_ALLOWED_ORIGINS with the Pages origin", () => {
  const out = execFileSync("node", [SETUP, "--dry-run", "--ui-origin", "https://app.pages.dev"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.ok(
    out.includes("CORS UI origins") && out.includes("https://app.pages.dev"),
    "--ui-origin output must list the Pages origin in cors allowlist",
  );
  // Must NOT have reflected an arbitrary wildcard.
  assert.ok(!out.includes("Access-Control-Allow-Origin: *"), "must never emit a wildcard CORS origin");
});

test("setup --dry-run default has no UI CORS origins (worker origin only)", () => {
  const out = execFileSync("node", [SETUP, "--dry-run"], { cwd: ROOT, encoding: "utf8", timeout: 30_000 });
  assert.ok(
    out.includes("CORS UI origins") && out.includes("(none — Worker origin"),
    "default dry-run must report no extra UI origins (worker origin only)",
  );
});
