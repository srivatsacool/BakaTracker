# BakaTracker — Production Release Checklist

## Overview
This release checklist establishes the release gating criteria for deploying the unified BakaSur, WebMCP, Remote MCP, and CRUD architecture to the production environment (`https://bakatracker.buildsrivatsa.qzz.io/`).

---

## 1. Pre-Release Quality Gates

| Verification Gate | Command / Target | Requirement | Actual Status | Exit Code / Result |
|:---|:---|:---|:---|:---|
| **TypeScript Compilation** | `npx tsc -b` | Zero compile errors across all workspaces | **PASS** | Exit code 0, 0 errors |
| **Static Code Analysis (ESLint)** | `npm run lint` | Zero ESLint errors and zero warnings | **PASS** | Exit code 0, 0 errors |
| **Automated Test Suite** | `npm test` | 100% test pass rate across all suites | **PASS** | 32/32 files, 309/309 tests passing |
| **Vite Client Production Build** | `npm run build` | Clean client bundle generation | **PASS** | Exit code 0 (5,757 modules transformed, chunk build complete) |
| **Safety Tier Enforcement** | `dispatcher.test.ts`, `confirmation.test.ts` | Tier 3 operations trigger confirmation queue | **PASS** | Verified with 60s timeout & auto-deny |
| **Schema Alignment** | `contract.test.ts` | 40/40 tools strictly conform to schema | **PASS** | 14/14 contract tests passing |
| **Token Refresh Mutex** | `tokenRefreshConcurrency.test.ts` | Single-flight promise on concurrent 401s | **PASS** | Verified single refresh call executed |
| **Action Parser Resilience** | `actionParser.test.ts` | Handles nested braces, multi-tags, escapes | **PASS** | 6/6 test cases passing |

---

## 2. Environment & Secrets Verification

| Secret / Variable | Target System | Scope | Purpose | Verification Requirement |
|:---|:---|:---|:---|:---|
| `VITE_API_URL` | Client Vite build | Production build env | Points to `/api` or Cloudflare Worker base | Must match production custom domain or worker route |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Deployments | CI/CD or Wrangler CLI | Deploying worker and static assets | Verified non-empty in secure secrets store |
| `JWT_SECRET` | Cloudflare Worker KV / Env | Worker Runtime | Signing & verifying access/refresh tokens | Min 256-bit high-entropy secret |
| `D1_DATABASE` | Cloudflare D1 | Worker Binding | SQL persistent storage | Database `bakatracker-db` bound |
| `R2_BUCKET` | Cloudflare R2 | Worker Binding | Binary file storage | Bucket `bakatracker-files` bound |
| `KV_NAMESPACE` | Cloudflare KV | Worker Binding | Key-value memory & cache | Namespace `bakatracker-kv` bound |

---

## 3. Worker & Storage Architecture Compatibility

- [x] **Cloudflare D1 Migrations:** All tables (`tasks`, `habits`, `habit_logs`, `journal`, `notebooks`, `pages`, `sync_events`) match the data schema.
- [x] **Cloudflare R2 Object Lifecycles:** Files uploaded via `file_upload` store MIME types and binary chunks cleanly; deletion verified via `file_delete`.
- [x] **Cloudflare KV Memory Engine:** `remember`, `recall`, and `forget` properly key user namespace without collisions.
- [x] **Account Reset Sync Barrier:** Reset endpoint `/api/account/reset` executes in tandem with client `setSyncBlocked(true)` to guarantee zero ghost records are pushed after database zeroing.

---

## 4. End-to-End Smoke Test Runbook

Perform the following manual and automated smoke tests after deploying to staging or preview environments:

1. **Authentication Flow:**
   - Log in with valid credentials. Verify access token stored in memory/session and refresh token securely handled.
   - Fire 5 concurrent API requests with expired token. Verify only a single refresh request is sent over network.
2. **Local-First Task CRUD:**
   - Create task "Deploy production release".
   - Update task status to `in_progress` and priority to `urgent`.
   - Toggle completion status.
   - Verify task appears in Zustand store and local event queue `bt_sync_pending`.
3. **Idempotent Habit Logging:**
   - Create habit "Morning Deep Work".
   - Trigger `log_habit` twice for the current date.
   - Verify the second call returns `{ success: true, alreadyCompleted: true }` and does **not** untoggle the habit.
4. **BakaSur Chat & Action Card Lifecycle:**
   - Prompt BakaSur: "Create a task for server monitoring and create a page in notebook X".
   - Verify BakaSur emits `[[ACTION:create_task {...}]]` and `[[ACTION:create_page {...}]]`.
   - Verify UI renders interactive ActionCards with Parameter Inspection drawer.
   - Execute the action; verify the card transitions from `idle` $\to$ `executing` $\to$ `success`.
   - Verify the action cannot be re-executed accidentally (idempotent / disabled execution button).
5. **Human-in-the-Loop Confirmation:**
   - Trigger `delete_task` or `reset_account`.
   - Verify confirmation modal displays tool name, safety warnings, and parsed arguments.
   - Allow 60 seconds to elapse without user input; verify action automatically cancels and rejects promise with `'Action timed out or cancelled by user'`.
   - Trigger `delete_task` again and click "Confirm"; verify deletion proceeds and modal closes.
6. **WebMCP Registration:**
   - Inspect `navigator.modelContextTesting` or WebMCP client.
   - Verify all 40 tools registered with descriptions, schemas, and confirmation hooks.

---

## 5. Rollback Considerations

In the event of an unexpected regression or deployment failure:

1. **Static Assets Rollback:**
   - Cloudflare Pages / Workers Sites enables instant atomic rollback to the previous deployment version hash via the Cloudflare Dashboard or `wrangler pages rollback`.
2. **Worker Script Rollback:**
   - Roll back Worker script deployment to the previous deployment ID via `wrangler rollback <deployment-id>`.
3. **Local State Resilience:**
   - Client stores state in `localStorage` under `bt_store`. Since the store schema version has not been incremented breakingly, previous client bundles can read the state without data corruption.
4. **Account Reset Safety:**
   - If an account reset is aborted midway, the `isSyncBlocked()` flag automatically resets upon page reload, preventing permanent store lockouts.

---

## 6. Release Sign-off

- **Architecture Audit Completed:** Yes (`bakatracker_unified_architecture_post_implementation_audit.md`)
- **Remediation Implemented:** Yes (`BAKATRACKER_UNIFIED_ARCHITECTURE_REMEDIATION_REPORT.md`)
- **Tool Contracts Aligned:** Yes (`BAKATRACKER_TOOL_CONTRACT_MATRIX.md`)
- **Automated Verification:** **PASS (Exit code 0)**
  - `tsc -b`: 0 errors
  - `npm run lint`: 0 errors, 0 warnings
  - `npm test`: 309/309 passed (100% pass rate)
  - `npm run test:pages`: 10/10 checks passed
  - Platform `npm test`: 23/23 unit + 3/3 DB verify passed
  - Platform `tsc --noEmit`: 0 errors
- **GitHub Release Commit:** `ddf7e7f` (pushed to `main`, base commit `82538bc`)
- **Production Deployment Executed:**
  - **Backend Worker:** `bakatracker-platform`
    - Version ID: `9f7c9387-e959-4deb-a050-77b781b9360e`
    - URL: `https://bakatracker-platform.srivatsagorti.workers.dev`
    - Status: Deployed (Exit code 0)
  - **Frontend SPA:** `bakatracker`
    - Version ID: `95ac1438-40a9-4d1a-bae5-7c896dbfdec8`
    - Live Production URL: `https://bakatracker.buildsrivatsa.qzz.io/`
    - Status: Deployed (Exit code 0)
- **Live Smoke Tests:** **PASS (HTTP 200 on /, /tasks, /habits, /journal; HTTP 204 CORS on API)**
- **Final Status:** **RELEASE VERIFIED & DEPLOYED**
