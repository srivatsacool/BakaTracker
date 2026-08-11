#!/usr/bin/env node
/**
 * BakaTracker — Pages-like local static server (PATH A verification).
 *
 * Serves the production build in `dist/` the way Cloudflare Pages would for a
 * static SPA deployment: exact static-file matches win, every other path is
 * rewritten to /index.html with a 200 via the shipped `dist/_redirects` rule
 * (`/* /index.html 200`). This is the same artifact Pages consumes — not a
 * reimplementation of Pages, just the simplest faithful static server.
 *
 * Usage (from repo root):
 *   node scripts/pages-like-server.mjs [port]     # default 4173
 *
 * The wrangler assets-worker path (PATH B) is verified separately with
 * `wrangler dev` and `assets.not_found_handling: single-page-application`.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const PORT = Number(process.argv[2] ?? 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

// Parse the SAME `_redirects` file that ships in dist/ to Cloudflare Pages.
// Only the SPA-fallback rule shape is supported: `<pattern> <target> <status>`
// where `*` matches any path. Exact static files always win over rewrites.
function loadRedirectRules() {
  const file = join(DIST, "_redirects");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [from, to, status] = l.split(/\s+/);
      return { from, to, status: Number(status) || 200 };
    });
}

const rules = loadRedirectRules();
if (!rules.some((r) => r.from === "/*")) {
  console.error(`⚠ dist/_redirects has no SPA fallback rule — serving exact files only`);
}

function matches(pattern, pathname) {
  if (pattern === "/*") return true;
  if (!pattern.includes("*")) return pattern === pathname;
  const re = new RegExp("^" + pattern.split("*").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  return re.test(pathname);
}

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  } catch {
    res.writeHead(400).end("bad request");
    return;
  }

  // 1) Exact static file (Pages serves real files before rewriting).
  const abs = normalize(join(DIST, pathname));
  if (abs.startsWith(DIST + sep) && existsSync(abs) && statSync(abs).isFile()) {
    const body = readFileSync(abs);
    res.writeHead(200, { "Content-Type": MIME[extname(abs).toLowerCase()] ?? "application/octet-stream" });
    res.end(body);
    return;
  }

  // 2) _redirects SPA fallback → index.html (status 200).
  for (const rule of rules) {
    if (matches(rule.from, pathname)) {
      const target = join(DIST, rule.to);
      if (existsSync(target)) {
        const body = readFileSync(target);
        res.writeHead(rule.status, { "Content-Type": MIME[".html"] });
        res.end(body);
        return;
      }
    }
  }

  // 3) Bare fallback: serve the SPA entry directly (same net effect).
  res.writeHead(200, { "Content-Type": MIME[".html"] });
  res.end(readFileSync(join(DIST, "index.html")));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[pages-like-server] serving ${DIST} on http://localhost:${PORT} (SPA fallback via dist/_redirects)`);
});