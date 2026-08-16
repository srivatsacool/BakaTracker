/**
 * BakaTracker v2 — entry point.
 *
 * One Worker = OAuth Provider (to MCP clients) + OAuth Client (to Google) +
 * Native Remote MCP server + thin REST API. Everything funnels through the
 * Tool Registry.
 *
 *   UI / AI / MCP clients / REST  ──▶  Tool Registry  ──▶  Storage (D1/KV/R2)
 */
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { MyMCP } from "./mcp/server";
import { GoogleHandler } from "./auth/google-handler";
import { buildRestApp, REST_PREFIX } from "./http/rest";
import { todayISO } from "./shared/util";
import { runNotificationEvaluation } from "./notifications/engine";
import type { Env } from "./env";

// Wrangler needs the Durable Object class exported from the entrypoint so it
// can route to it; the OAuthProvider further dispatches /mcp to it.
export { MyMCP } from "./mcp/server";

// Catch-all handler: Google OAuth pages + thin REST API, all in one Hono app.
const defaultApp = new Hono();
defaultApp.route("/", GoogleHandler);
defaultApp.route(REST_PREFIX, buildRestApp());

// Friendly landing page at `/`.
defaultApp.get("/", (c) =>
  c.html(`<!doctype html>
<html><head><meta charset="utf-8"><title>BakaTracker v2</title>
<style>body{font-family:system-ui;background:#0b0f1a;color:#e8ecf6;display:grid;place-items:center;height:100vh;margin:0}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:2.5rem;max-width:560px;text-align:center}
h1{background:linear-gradient(90deg,#a78bfa,#22d3ee,#fbbf24);-webkit-background-clip:text;background-clip:text;color:transparent}
code{background:rgba(255,255,255,.08);padding:.15rem .4rem;border-radius:6px;font-size:.85em}</style></head>
<body><div class="card">
<h1>BakaTracker v2</h1>
<p>Local-first AI productivity OS — one Tool Registry, many interfaces.</p>
<p>
<a href="/mcp" style="color:#22d3ee">MCP endpoint</a> ·
<a href="/.well-known/oauth-authorization-server" style="color:#22d3ee">OAuth metadata</a> ·
<a href="/api/v1/registry" style="color:#22d3ee">Tool registry (REST)</a>
</p>
<footer style="font-size:.75rem;color:#8b93a7">today: ${todayISO()}</footer>
</div></body></html>`),
);

const oauthProvider = new OAuthProvider({
  apiHandler: MyMCP.serve("/mcp"),
  apiRoute: "/mcp",
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: defaultApp as any,
  tokenEndpoint: "/token",
});

/**
 * Export shape: `fetch` (the OAuth provider) + `scheduled` (proactive
 * BakaSur evaluation + OAuth KV hygiene). Wrangler Cron Triggers invoke
 * `scheduled`; the evaluation engine itself is fully deterministic and
 * directly unit-tested (injected clock + fake AI/delivery).
 */
export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const res = await oauthProvider.fetch(request, env, ctx);
    // Add CORS headers to ALL responses for /api/v1/* routes.
    // This runs AFTER OAuthProvider, so its headers survive.
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/v1/")) {
      const origin = request.headers.get("Origin");
      const allowed = env.CORS_ALLOWED_ORIGINS?.split(",").map(s => s.trim()) || [];
      const appOrig = env.APP_ORIGIN?.trim();
      const isAllowed = origin && ((appOrig && origin === appOrig) || allowed.includes(origin));
      const reflectOrigin = isAllowed ? origin : (allowed[0] || appOrig);
      if (reflectOrigin) {
        const newRes = new Response(res.body, res);
        newRes.headers.set("Access-Control-Allow-Origin", reflectOrigin);
        newRes.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        newRes.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-User-Sub");
        newRes.headers.set("Access-Control-Max-Age", "86400");
        newRes.headers.set("Vary", "Origin");
        return newRes;
      }
    }
    return res;
  },
  scheduled: async (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    const summary = await runNotificationEvaluation(env, ctx);
    console.log(`[baka:scheduled] evaluated=${summary.users_evaluated} candidates=${summary.candidates_found} delivered=${summary.delivered} suppressed=${summary.suppressed} failed=${summary.failed}`);
    await oauthProvider.purgeExpiredData(env);
  },
};
