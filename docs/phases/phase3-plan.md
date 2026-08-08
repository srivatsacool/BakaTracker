# Phase 3 — Browser E2E + Google Interactive OAuth + Onboarding

## Status: STARTING (after `v2.0.0-phase2-migrated` is sealed)

## Goal
Close the last unverified piece between "OAuth protocol is correct" and a real
user being able to log in, own data in D1, and round-trip tasks/habits/journal
in an actual browser — plus make first-run onboarding safe and reversible.

## Boundary (read-only unless fixing a real bug)
- `platform/` — NOT touched by Phase 3 (it is the frozen transport layer).
  If the OAuth flow needs a worker change, that's a Platform 4 fix, not Phase 3.
- `src/features/auth/*` — the OAuth wiring already exists and is committed;
  Phase 3 only tunes it for the REAL browser flow (redirect_uri matching,
  the `?code=` callback handoff, dev-vs-prod origins).
- `src/services/stateService.ts` — already verified REST↔D1↔UI; untouched unless
  a real browser bug surfaces.
- `src/pages|components|store|lib|types|assets` — still frozen. Phase 3 touches
  ONLY `src/pages/Landing.tsx`, `src/pages/Dashboard.tsx` (onboarding gates),
  and new onboarding components.

## Phase 2 foundation (verified, do not regress)
- REST `/api/v1/*` with CORS bridge: ✓ (browser→worker cross-origin works)
- OAuth routes `/register` `/authorize` `/token` `/callback`: ✓ (protocol verified)
- D1 persistence via `list_tasks/list_habits/list_journal` + `sync/push`: ✓
- Platform suite 8/8, lint 58, build green, dry-run OK.

## Phase 3 steps
1. **Real Google interactive OAuth**
   - Configure a real `VITE_GOOGLE_CLIENT_ID` + worker-side Google secret
     (local `.dev.vars`, never committed).
   - Run `wrangler dev`, drive the full redirect in a browser:
     Landing → "Continue with Google" → Google consent → worker `/callback`
     → code → `/token` → `whoami` → D1.
   - Confirm the SPA callback handler consumes `?code=` once and rewrites the URL.
   - Confirm refresh-token recovery works (token expiry simulation).
2. **First-user onboarding**
   - New user (empty D1) → Landing shows setup, NOT an empty app.
   - Setup screen: pick a persona / default habit set (one click, not hardcoded).
   - On submit → seeded entities via REST tool calls (`create_task`/etc.) on D1.
3. **Demo mode**
   - "Explore Demo" one-click → demo dataset via REST seed on a *demo-scoped* user.
   - Clearly isolated: reset returns to fresh demo, never touches real data.
4. **Landing → Example → Setup/Login**
   - Landing does NOT force auth on load (auth gate stays in `main.tsx`).
   - "See Example" (demo) vs "Get Started" (Google login) vs "Set Up" (onboarding).
5. **Data management**
   - "Clear Data" → wipes D1 rows for that `sub` (via a `reset_account` tool),
     then reloads. Destructive action confirmed.
   - Scope selector: number-of-days / date-range filters (read-only).
6. **Production security pass**
   - OAuth `redirect_uri` must match `APP_ORIGIN` exactly (no open redirect).
   - `sub`-based user isolation in every repository (already enforced via rest.ts).
   - CORS reflects only known origins in prod (dev mirrors `*`).
   - CSRF `state` validation (already in AuthProvider; verify callback rejects mismatch).
7. **Browser E2E (manual + scripted)**
   - Fresh browser, no local data.
   - Google login → create task/habit/journal → reload → data present.
   - Logout → login → data intact.
   - Demo → clear → real account → data separate.
   - Document the manual flow in `docs/phases/phase3-browsers.md`.
