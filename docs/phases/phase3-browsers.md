# Phase 3 — Browser E2E: documentation of the committed harness and results

Status: **DONE** — Browser E2E committed, full gates green, pushed to `origin/main`.

## Objective

The OAuth protocol was already verified at the HTTP level (platform suite, headless
probes). What Phase 3's browser E2E verifies is the **last unverified boundary**:
a real browser driving the real React SPA through the real Worker's OAuth chain,
ending in authenticated, user-scoped data. It answers the question: "can a real
user actually log in and use the app, end to end?" — with only Google's external
consent/token surface faked.

Boundary verified by the suite:

```text
browser (Chromium)
   ↓ real UI, real JS
Vite SPA (dev server)
   ↓ real HTTP, real cookies, real redirects
Worker (Miniflare-booted, real code)
   ↓ real bindings
D1 (notes/tasks/etc.) · KV (OAuth state/DCR) · R2 (files) · DO (MCP)
   ↓ only external seam
Google token + userinfo (stubbed)
```

## Architecture

```text
Playwright
   ↓
Vite SPA
   ↓
real Worker
   ↓
real D1 / KV / R2 / DO
   ↓
Google-only external mock
```

Everything inside BakaTracker is **real**: the SPA does real DCR + PKCE, the
Worker runs its actual handlers against real (Miniflare-backed) D1/KV/R2/DO, and
the browser follows real 302s. The single faked seam is Google's token/userinfo
endpoints, stubbed through Miniflare's `outboundService` (see below).

## Harness

`platform/scripts/e2e-worker.mjs` boots the real application Worker, mirroring
`wrangler dev` as closely as Miniflare allows:

- **Wrangler config loading** — `unstable_getMiniflareWorkerOptions("wrangler.jsonc")`
  parses the SAME config `wrangler dev` uses: compatibility date/flags,
  module rules, KV/D1/R2/DO bindings are all derived from it, so the harness
  cannot drift from the real dev configuration.
- **esbuild bundling** — the Worker entry (`src/index.ts`) is bundled with
  esbuild to ESM (`format: "esm"`, `platform: "node"`, Cloudflare runtime
  aliases external) and written to a temp `.mjs` so Miniflare loads it as a
  real ESModule via `modulesRules`. This is the same bundling wrangler performs
  before deploy.
- **Miniflare** — two workers: `bakatracker-platform` (the bundled app) and an
  inline `google-mock` worker. All app bindings come from the wrangler config
  plus `.dev.vars`, exactly like `wrangler dev`.
- **D1 migration handling** — Miniflare does NOT auto-apply migrations, so the
  harness applies `migrations/*.sql` to the D1 instance before serving
  (statement-split + `db.batch`), replicating what `wrangler dev` does via
  `applyD1Migrations`.
- **HTTP proxy** — a raw `node:http` server on `127.0.0.1:8787` forwards each
  browser request to `mf.dispatchFetch(..., { redirect: "manual" })`, so the
  Worker's 302s (→ Google, → SPA) reach the browser untouched and the real
  redirect chain executes in the browser.
- **Detached Windows launch** — during bring-up the worker was also launched
  detached from the shell (survives parent exit) for headless probing; that
  helper was a debugging artifact and has been removed. The committed flow
  starts the harness automatically via Playwright's `webServer` (one command,
  see "Running locally").
- **dispatchFetch** — `redirect: "manual"` is essential: automatic redirect
  following would swallow the Worker's Location headers and hide the OAuth
  redirect chain.
- **Set-Cookie forwarding** — response headers are collected with
  `headers.getSetCookie()` BEFORE `writeHead` (node finalizes the header block
  there), so every `Set-Cookie` (including the loopback-relaxed OAuth cookies)
  reaches the browser intact.

The Vite SPA runs as a real dev server on `127.0.0.1:5173`
(`VITE_API_BASE_URL=http://127.0.0.1:8787`, `VITE_GOOGLE_CLIENT_ID` = a dummy
`e2e-browser-test.apps.googleusercontent.com` — the SPA never talks to real
Google; the Worker's outbound calls are stubbed, DCR is real against the fake).

## Google mock boundary

The ONLY external endpoints stubbed (via Miniflare `outboundService` → the
inline `google-mock` worker):

```text
POST https://oauth2.googleapis.com/token            (code exchange)
GET  https://www.googleapis.com/oauth2/v2/userinfo  (profile)
```

The mock derives the authenticated subject from the authorization code
(`code=e2e-<sub>` → bearer `at-<sub>` → userinfo `sub`), which is what makes
per-user isolation assertions possible in a real browser flow. Every other
entity in the stack is real: the Worker, its handlers, D1, KV, R2, the DO, and
the SPA's DCR + PKCE + token storage.

## OAuth / browser flow

What one logged-in browser round-trip exercises:

```text
DCR             SPA registers a PKCE public client via POST /register (real)
→ PKCE          SPA generates verifier + S256 challenge, stores verifier
→ authorize     browser hits GET /authorize → real approval dialog + CSRF cookie
→ consent       POST /authorize (CSRF-validated) → 302 to Google (state bound to session cookie)
→ callback      /callback?code=…&state=… (KV state + session-bound state hash verified)
→ token exchange  Worker exchanges code at the fake Google token endpoint;
                completeAuthorization → 302 to SPA with provider code
                SPA exchanges provider code at /token with its PKCE verifier
→ session       SPA stores bt_oauth_token in sessionStorage
→ whoami        GET /api/v1/whoami with Bearer → 200 { sub: "<google sub>" }
```

Note: the browser never actually navigates to accounts.google.com — the spec
captures the worker's `Location` header, then drives `/callback` itself. The
Google *server* side of the flow is the mocked outbound endpoint.

## Local cookie behavior — `TEST_LOCAL` (loopback compatibility mode)

Why it exists: production sets `__Host-`-prefixed cookies with the `Secure`
flag (RFC 6265bis — a `__Host-` cookie MUST carry `Secure` or the browser
rejects it outright). Plain-HTTP loopback (wrangler dev, the E2E harness)
cannot accept `Secure` cookies, so the OAuth flow would silently fail in local
browsers.

The E2E environment therefore uses an explicit, local-only escape hatch:
`TEST_LOCAL=1`, set by the harness. It relaxes cookie naming/flags to plain
names without `Secure` — a **loopback HTTP compatibility mode**, not a
"disabling of security for tests".

Crucially, the relaxation is gated on BOTH conditions:

```text
TEST_LOCAL=1 env  AND  request origin is loopback (localhost / 127.0.0.1 / [::1])
```

`testLocalEnabledForRequest()` enforces this at every cookie site in the OAuth
handler. Consequences:

- Production (`__Host-` names, `Secure`, `HttpOnly` where applicable,
  `SameSite=Lax`, `Path=/`) is **unchanged** — production origins are never
  loopback, so even setting `TEST_LOCAL=1` on a deployed Worker has no effect.
  This invariant is enforced by dedicated regression tests
  (`platform/test/security.spec.ts` → "TEST_LOCAL cookie relaxation loopback gate").
- The vitest pool runs with NO `TEST_LOCAL`, so the platform suite always sees
  production cookie semantics (`__Host-CSRF_TOKEN` + `Secure` asserted live).
- The E2E harness runs with `TEST_LOCAL=1` + loopback, so the browser accepts
  the cookies and the full flow executes.

Same opt-in pattern as the pre-existing `REST_DEV_BYPASS` (also loopback-gated).

## Test coverage (browser, real stack)

`e2e/auth.e2e.spec.ts`, 5 tests, serial, chromium:

```text
5/5 passed · 0 retries · clean single run
```

1. Landing renders auth entry; `whoami` is 401 unauthenticated
2. Real OAuth login → authenticated `whoami` returns the subject (`e2e-user-a`)
3. Per-user R2 isolation: A and B each see only their own files; cross-user
   `GET /files/:id` → 404 (no existence oracle)
4. Logout (sessionStorage token cleared) → `whoami` → 401
5. Malformed bearer → deterministic 401

Run with the same command as the platform suite's TypeScript gates — see
"Running locally".

## R2 isolation

User-scoped file storage verified in a real browser with two isolated browser
contexts (A = `e2e-user-a`, B = `e2e-user-b`):

- A uploads `a.txt`, B uploads `b.txt` — both 201.
- A's listing contains only `a.txt`; B's only `b.txt` (no cross-user leak in
  listings).
- B's `GET /files/<A's id>` → 404 (cross-user access blocked, existence
  oracle closed).

The worker derives `user_id` from the OAuth `sub`, scoping every file
read/write to the authenticated subject.

## Running locally

Prerequisites: `npm install` at the repo root and in `platform/` (Playwright
browsers: `npx playwright install chromium` if not already present).

One command boots everything — the harness (real worker on :8787) and the Vite
dev server (:5173) are auto-started by Playwright's `webServer`, and shut down
when the run ends:

```bash
# from the repo root
npx playwright test --config=e2e/playwright.config.ts
```

To run a single test or headed:

```bash
npx playwright test --config=e2e/playwright.config.ts --grep "isolation"
npx playwright test --config=e2e/playwright.config.ts --headed
```

Platform unit/integration suite (same wrangler config, vitest pool):

```bash
cd platform && npm test
```

Manual bring-up (worker only, for probing without Playwright):

```bash
cd platform && node scripts/e2e-worker.mjs
# then hit http://localhost:8787 directly; Vite: npx vite --host 127.0.0.1
```

Timeouts: the suite raises both the test timeout (120s) and the navigation
timeout (90s) because a cold Vite dev server's first full dep transform can
exceed the 30s default `page.goto` timeout; the first test previously flaked
on exactly that (passed on retry) before the navigation timeout was raised.

## DCR cleanup

During bring-up, two temporary dynamic clients were registered against the
production OAuth KV to smoke-test the deployed Worker:

```text
client:preflight-smoke-test
client:smoke-test-local
```

Cleanup (reads only, then delete-if-present) against production `OAUTH_KV`:

```text
READ → VERIFY exact temporary DCR client → DELETE → READ again → VERIFY ABSENT
```

Result: **both keys were already absent** — production KV contains no
`client:` or `oauth:` keys at all (sessions/state expire via TTL). No writes
were performed; no unrelated KV keys exist or were touched. The Worker, D1,
and R2 were not modified by this phase.

## Final verification (actual numbers)

```text
Platform tests        41/41 passed   (36 baseline + 5 new TEST_LOCAL gate)
Browser E2E            5/5 passed    (0 retries, clean single run)
TypeScript (platform)  clean         (npx tsc --noEmit)
TypeScript (root)      clean         (npm run build → tsc -b)
TypeScript (e2e)       clean         (npx tsc -p e2e/tsconfig.json --noEmit)
Lint                   baseline 58 problems (55 errors, 3 warnings) — no new
Build (root)           green         (tsc -b && vite build; PWA generated)
Wrangler dry-run       green         (wrangler deploy --dry-run — no deploy)
```

Production state: Worker not deployed, D1 unchanged, R2 unchanged, KV unchanged
(the two smoke-client keys were already absent). HEAD after phase close:
see the commit that shipped this document.