# V3.4.3 LIVE VISUAL REVIEW — REPORT

**Date:** 2026-08-29 19:45 IST  
**Branch:** `main` with uncommitted V3.4.1→V3.4.3 worktree (DO NOT COMMIT — per gate)  
**Reviewer:** Hermes (live browser automation + vision inspection)  
**Servers:** BOTH left running for user hands-on review (see URLs at end)

---

## LIVE ENVIRONMENT

| | |
|---|---|
| **Frontend** | Vite dev server `npm run dev` → `http://localhost:5173` (V8.1.3, HMR, Cloudflare vite plugin) |
| **Backend** | `platform/wrangler dev --config wrangler.jsonc` → `http://localhost:8787` (wrangler 4.120.0, local D1 `bakas_db`, KV, R2 `bakatracker-files-local`, `.dev.vars` with `REST_DEV_BYPASS=1`, `APP_ORIGIN=http://localhost:8787`, `CORS_ALLOWED_ORIGINS=http://localhost:5173,...`) |
| **Commands used** | `cd platform && npx wrangler dev --config wrangler.jsonc` then `npm run dev` at repo root — per `README.md#Local Development` and `platform/wrangler.jsonc`. No mock server, no fixture-only environment. |
| **API origin in use** | `.env` → `VITE_API_BASE_URL=http://localhost:8787`, `.dev.vars` → `APP_ORIGIN=http://localhost:8787` — frontend and backend are wired together. `platform/.dev.vars.example` documents this. |
| **Auth / data mode** | Guest/demo mode — `bt_demo_mode=true`, `bt_first_run=done`, `bt_intro_seen=true` set via `addInitScript` before load. The app marks `DEMO` badge in the header and `OFFLINE · LOCAL`. No Google OAuth configured locally; `bt_assistant_collapsed=true` forces the collapsed dock as the entry state. Real store slices (tasks, habits, habitLogs, journal, stats, events) were used — every reaction was driven through the actual Zustand store mutations, not a fixture page. |
| **FirstRunWizard** | Dismissed before capture (`bt_first_run=done` + Escape → reload if needed). This was the blocker in the first live-review probe — without it the modal blurred the entire app. |

**Proof the backend is real and reachable:**
```bash
curl -H "X-User-Sub: live-review-probe" http://localhost:8787/api/v1/whoami
→ {"sub":"live-review-probe","name":null,"email":null}   # HTTP 200 — auth bypass works

curl -X POST -H "X-User-Sub: live-review-probe" \
  http://localhost:8787/api/v1/assistant/chat \
  -d '{"message":"hello","history":[],"context":{"route":"/today"}}'
→ {"ok":false,"error":"ai_unavailable","message":"Workers AI is not configured..."}
# HTTP 503 is the DOCUMENTED local behavior when `ai: {binding:"AI"}` is absent
# from wrangler.jsonc (see wrangler.jsonc L67-72). No token, no secret leak.
```

---

## FRONTEND URL / PORT

```
http://localhost:5173
http://localhost:5173/today   # primary review surface
http://localhost:5173/tasks
http://localhost:5173/habits
http://localhost:5173/journal
http://localhost:5173/journey
http://localhost:5173/notes
```

## BACKEND URL / PORT

```
http://localhost:8787
http://localhost:8787/api/v1/whoami
http://localhost:8787/api/v1/assistant/chat        # POST — chat contract
http://localhost:8787/api/v1/sync/push|pull       # sync — authenticated/guest
http://localhost:8787/api/v1/registry             # tool registry
```

**Both processes are still running** — `netstat` at close of run:

```
TCP 127.0.0.1:8787 — PID 9352 (wrangler)
TCP [::1]:5173     — PID 15184 (vite)
```

Open them now to inspect live. They will survive until you close the terminal or run `taskkill /F /PID 9352` + `/PID 15184`.

---

## DATA MODE USED

- **Demo ledger** with sample tasks/habits/journal pre-seeded by `loadDemoData` (guest path). LVL 5 → LVL 6 progression visible during the session.
- No real user data was altered — only localStorage in the Playwright contexts; the persisted guest ledger on disk is untouched apart from the three mutations made during the reaction sequence (one quest completed, one habit checked in, one journal entry saved).
- `calcHabitStreak`, `stats.level`, and `EventLog` rows were the sole reaction sources.

---

## SCREENS REVIEWED

All screenshots are **live application**, not the prototype fixture `/baksur-prototype`:

| # | File | Viewport | What it proves |
|---|---|---|---|
| 1 | `01-today-desktop-1440.png` | 1440×900 | Today page loads after wizard dismissal, left nav + center workspace + collapsed dock |
| 2 | `02-tasks-desktop-1440.png` | 1440×900 | Tasks kanban |
| 3 | `02-habits-desktop-1440.png` | 1440×900 | Habits tracker |
| 4 | `02-journal-desktop-1440.png` | 1440×900 | Journal |
| 5 | `02-journey-desktop-1440.png` | 1440×900 | Journey analytics |
| 6 | `02-notes-desktop-1440.png` | 1440×900 | Notes library |
| 7 | `03-today-collapsed-dock.png` | 1440×900 | **Collapsed dock evidence** — Baksur Flamehorn at 38×40, BAKASUR label fits |
| 8 | `04-expanded-rail-desktop.png` | 1440×900 | **Expanded rail** — header character 24px, terminal header, chat |
| 9 | `05-quest-completed-react.png` | 1440×900 | **QUEST_COMPLETED** — HAPPY state |
| 10 | `06-habit-completed-react.png` | 1440×900 | **HABIT_COMPLETED** — HAPPY |
| 11 | `07-journal-logged-react.png` | 1440×900 | **JOURNAL_LOGGED** — subtle HAPPY |
| 12 | `08-user-opened-baksur-react.png` | 1440×900 | **USER_OPENED_BAKSUR** — attentif, rail open |
| 13 | `09-rail-opened-for-chat.png` | 1440×900 | Chat input visible, demo context |
| 14 | `10-bakasur-chat-response.png` | 1440×900 | Chat reply (guest demo reasoning — see Chat section) |
| 15 | `11-mobile-today-390.png` | 390×844 | Mobile Today |
| 16 | `12-mobile-tasks-390.png` | 390×844 | Mobile Tasks |
| 17 | `12-mobile-habits-390.png` | 390×844 | Mobile Habits |
| 18 | `13-reduced-motion-desktop.png` | 1440×900 | `prefers-reduced-motion: reduce` static render |
| 19 | `14-final-today-desktop.png` | 1440×900 | Final state after all reactions — no overflow |

Dir: `visual-qa/baksur-v343-live/` (19 files). Before-evidence for dock label: `visual-qa/baksur-v342/01-desktop-collapsed.png` (≈52px dock with clipping) vs `visual-qa/baksur-v343/00-dock-label-BEFORE-v342.png` (copied for side-by-side).

---

## CHARACTER REVIEW

- **Identity:** Hybrid Flamehorn — rounded body + two small horns + three-point flame crest + eyes-only face. Preserved from V3.4.1 gate. No limbs/tail/clothing/particles/gradients/glow.
- **Production sizes:**
  - Collapsed dock: **40×40 SVG** rendered inside a **52px-wide** aside (`assistant-rail-collapsed`). Measured: `railWidth: 52, railLeft: 1367, railRight: 1419, svgWidth: 38` after centering/baksur-dock padding. Meets ≥32px desktop minimum.
  - Expanded header: **24×24** — meets ≥24px mobile minimum; kept at spec (the earlier 20px draft was bumped to 24).
- **States observed live:**
  - `IDLE` — default after boot-quiet and after each reaction decay.
  - `HAPPY` (`heureux`) — QUEST/HABIT/JOURNAL (verified via `data-baksur-state=HAPPY`).
  - `CELEBRATE` (`wink` pose) — defined in `baksurShared.ts` → `wink` + `neutre` for STREAK/LEVEL_UP escalation; retained body silhouette.
  - `THINKING` — `busy=true` path (chat busy) — bug-fixed in V3.4.2 to keep body visible (no dot collapse).
  - `SLEEP` — defined, tested (body 190–212 vs 203 IDLE), not triggered in live demo — **documented, not fabricated.**
  - `ALERT` — defined, not triggered in live demo — **documented, not fabricated.**
  - `CELEBRATE` character path is quiet: wink pose, no particle explosion — matches V3.4.3 spec.

**Visual verdict:** Character is small but readable at collapsed width; in expanded header it sits cleanly beside `> BAKASUR`. No overflow beyond the aside. Reduced-motion renders a static SVG (`data-baksur-static="true"` observed in check).

---

## REACTION REVIEW

### How reactions are sourced (FACT — not fixture-only)

`src/components/shell/baksurReactions.ts` — **pure watcher**, no new store:

```
QUEST/HABIT/JOURNAL  → scan EventLog for type `task_completed|habit_completed|journal_created`
STREAK_MILESTONE     → habits + habitLogs fed through existing calculateHabitStreak; thresholds 7/14/30/50/100
LEVEL_UP             → stats.level delta
USER_OPENED_BAKSUR   → useRef comparing collapsed→expanded transition in BakaSurRail.tsx
```

- Seed baseline on first observation — pre-existing completed ledger never replays.
- Per-fact dedupe (`Set` of acknowledged event ids / streak thresholds / levels) — same state re-render is silent.
- **2.5s boot-quiet** after birth — hydrate bursts from `loadDemoData`/`init()` are acknowledged but not fired.
- **4s deterministic cooldown** — biggest-moment-wins priority: `LEVEL_UP > STREAK_MILESTONE > QUEST > HABIT > JOURNAL`.

Signals are **visual-only**: `REACTION_VISUAL` maps to `BaksurState + expression + hold ms` (journal 1.6s < quest/habit 2.2s < streak 2.6s < level 3.4s wink; `USER_OPENED` → `attentif` 1.5s). No chat spam — `BaksurCharacter` is `decorative aria-hidden` so no `aria-live` announcement.

### Live reproduction (real mutations, not mocks)

| Required event | Method | Result | Screenshot | Notes |
|---|---|---|---|---|
| **QUEST_COMPLETED** | Clicked `button[aria-label^="Complete"]` ("Complete Write today's journal") on `/today` | **PASS** — `data-baksur-signal=QUEST_COMPLETED`, `data-baksur-state=HAPPY`, decayed to `null/IDLE` after ~2.2s | `05-quest-completed-react.png` | EventLog grew `events 27→28` in earlier isolated probe; same path here. Measured hold + decay in browser. |
| **HABIT_COMPLETED** | Clicked `CHECK IN` on `/habits` | **PASS** — `HABIT_COMPLETED` | `06-habit-completed-react.png` | Priority rule tested: if habit XP had crossed level, LEVEL_UP would correctly elevate. |
| **JOURNAL_LOGGED** | Typed into `input[placeholder*="One sentence"]` and submitted on `/journal` | **PASS** — `JOURNAL_LOGGED` | `07-journal-logged-react.png` | Submitted via `button[type="submit"]` / `form.requestSubmit()` fallback. |
| **USER_OPENED_BAKSUR** | Clicked collapsed dock `button.assistant-rail-expand` | **PASS** — `USER_OPENED_BAKSUR` (attentif), rail opens | `08-user-opened-baksur-react.png` | Note: opens the rail — not a chat message, per spec. |
| **STREAK_MILESTONE** | Needs a streak at 7/14/30/50/100 exactly | **NOT REPRODUCED WITH CURRENT DEMO DATA** | — | Documented, not fabricated. Threshold logic is unit-tested (see `reactions.test.ts` — streak 7, still-7 silent, 14 fires). Existing ledger had no streak at threshold. |
| **LEVEL_UP** | Needs `stats.level` delta via XP burst | **NOT REPRODUCED IN THIS LIVE RUN** (LEVEL_UP did fire in earlier automated probe when habit XP crossed boundary — priority correctly elevated) | — | Unit-tested (`level 3→4 fires, 3→3 silent, seed baseline silent`). Not fabricated with demo XP this run. |

**Deduplication & cooldown** — verified live:
- After QUEST_COMPLETED, a second immediate Complete within 4s stayed silent (cooldown) — confirmed in unit suite and browser `for(let i...)` decay loop.
- Route change `/today → /habits → /today` did not replay the same quest event (dedupe).
- Hydrate burst after reload is boot-quiet, not a reaction.

**Reduced-motion & visibility** — preserved from V3.4.2:
- `prefers-reduced-motion: reduce` → static SVG.
- `hidden-tab rAF pause` — unchanged (V3.4.2 probe logic still in place; not re-spammed each turn).
- `followPointer` gaze pauses when hidden, decorative so no a11y spam.

---

## DOCK REVIEW

- **Geometry (measured live):**
  ```
  railWidth: 52, railLeft: 1367, railRight: 1419
  label: BAKASUR — labelWidth: 23, labelHeight: 87
          labelLeft: 1382, labelRight: 1404
  viewportWidth: 1440 — labelRight 1404 < 1440
  svg: IDLE, svgWidth: 38
  signal: null (rest)
  ```
- **Fix:** vertical-rl (`writing-mode: vertical-rl; text-orientation: mixed` in `src/index.css` `assistant-rail-collapsed .assistant-rail-label`) — 23×87 label now fully **inside** the 52px dock (1382 ≥ 1367, 1404 ≤ 1440, 0px page overflow). Before: ~87px horizontal text in 52px dock clipped to `BAKASU`.
- **What was NOT changed:** rail width (52 collapsed / 320 expanded), `toggleAssistant()` path, `z-index` ownership, tablet overlay, mobile pill. The 52↔320 structure is intact; only typography/presentation inside collapsed was touched.
- **Before/after:**
  - Before: `visual-qa/baksur-v342/01-desktop-collapsed.png` and `visual-qa/baksur-v343/00-dock-label-BEFORE-v342.png` (copied from V3.4.2)
  - After: `visual-qa/baksur-v343-live/03-today-collapsed-dock.png` and `14-final-today-desktop.png`

---

## MOBILE REVIEW

- **Viewport:** 390×844 (Playwright device).
- **Entry point:** Preserved `[✦ BakaSur]` pill / collapsed rail — `aside#bakasur-rail` with `assistant-rail-collapsed` (52px) remains; `pillExists: true` in the probe. No second mobile assistant architecture introduced.
- **Screens:** `11-mobile-today-390.png`, `12-mobile-tasks-390.png`, `12-mobile-habits-390.png` — no horizontal overflow, bottom-nav clearance maintained (left InstrumentRail visible, right dock not overlapping center).
- **Sheet:** Expands via same `toggleAssistant()` path; pill → sheet is the mobile interaction (desktop dock → rail is separate).

---

## CHAT / BACKEND VERIFICATION

- **Guest mode (this live run):** `isGuest = user?.provider === 'guest'` → `demoReply()` — local deterministic reasoning from real ledger facts; **no** `/api/v1/assistant/chat` request is sent. This is **correct** per `BakaSurRail.tsx:387-389` and by design: guest/demo is offline-capable.
  - Live demo reply visible in `10-bakasur-chat-response.png`:
    > "Your highest-priority quest today is 'Review operations report' (+25 XP)…"
    — derived from open quests, not hallucinated; source shown as `Today · demo data`.
- **Backend still verified (direct proof above):**
  - `GET /api/v1/whoami` with `X-User-Sub` → 200 `{"sub":"live-review-probe"}` — auth bypass works, CORS allows `X-User-Sub, Authorization, Content-Type`.
  - `POST /api/v1/assistant/chat` with same header → **503 `ai_unavailable`** — the documented local response when `ai` binding is absent. No `{ok:true, result:{reply}}` because no Workers AI token is provisioned locally; `npm run setup -- --with-ai` would add `ai: {binding:"AI"}` to `wrangler.prod.jsonc`.
  - **API contract unchanged:** the UI posts `{message, history: [{role, content}] × ≤10, context: {route, route_name, date, facts}}` to `/api/v1/assistant/chat` and expects `{ok, result:{reply|answer, model, request_id}}` — route not touched in V3.4.3 (only `GET /api/v1/registry` introspection exists alongside it). The `X-User-Sub` bypass and `REST_DEV_BYPASS` guard remain gated to `isLocalDevOrigin(APP_ORIGIN)` (localhost).
- **Conclusion:** Frontend **is** connected to the real local backend (whoami + assistant 503 prove it). BakaSur reads live via `useShallow` selectors; chat via `apiClient.post('/api/v1/assistant/chat', ...)` when authenticated. Guest path being local is not a regression — it's the documented offline behavior.

**Known test false-negatives fixed in this review run:**
- Initial script reported `chat contract ✘ no /assistant response` — that was guest-mode demoReply, not a missing backend. Re-probed with explicit `X-User-Sub` curls → backend is live.
- Initial `bakasur z-index set ✘ auto` — `#bakasur-rail` is `z-index: auto` by design; the app shell layers via `isAssistantCollapsed` frame class and `assistantOverlayOpen` tablet overlay — no stacking regression vs `main` was observed (expanded rail renders over center without clipping; no overflow).

---

## VISUAL BUGS

| # | Bug | Severity | Status |
|---|---|---|---|
| 1 | **Collapsed dock label clipping** — ~87px "BAKASUR" in 52px dock read as "BAKASU" | Was P0, now **FIXED** in V3.4.3 | Vertical-rl; inside-dock verified |
| 2 | Character at 40px in collapsed dock reads small at 1440 — but intentional per spec (32px desktop minimum, Mochi readability) | — | As-designed; do not enlarge without gate |
| 3 | No horizontal overflow at 1440 or 390 | **PASS** | `scrollWidth 1440 == clientWidth 1440` |

---

## DESIGN CONCERNS

- Dock Baksur vs header Baksur: two instances exist simultaneously when expanded (40 + 24). This is the correct architecture (dock is hidden when expanded — `assistantCollapsedEffective` flips), but vision QA should keep checking they don't both show.
- Streak/level reactions are quiet by design — a level-up is the *strongest* V1 reaction but still just a wink + 3.4s hold. If users expect confetti, the docs (`PERSONALITY.md`) explain why not — observant familiar, not a coach.

---

## P0 / P1 / P2 RECOMMENDATIONS

**P0 — before any ship**
- None — gate is green. Do not block on streak/level live repro; they are unit-proved and would require fabricating demo state.

**P1 — V3.4.4 candidate**
- V3.4.4 "existing BakaSur integration" — surface the same reaction facts *inside* the opened rail as a subtle hint ("Review ops report cleared · +25 XP") rather than only the dock expression. Keep `decorative` on the character, hint in text near suggestions.
- Remove dev fixtures `/baksur-prototype` and `/baksur-reactions` and `scripts/baksur-*` before release tag (they are hidden routes but still in `src/App.tsx`).

**P2 — polish**
- Consider a `prefers-reduced-motion` gold outline on the collapsed label for extra contrast — currently paper-muted violet.
- Keep `16px` baksur only for tests — never production.

---

## SCREENSHOT PATHS

All under `visual-qa/baksur-v343-live/`:

```
01-today-desktop-1440.png
02-tasks-desktop-1440.png
02-habits-desktop-1440.png
02-journal-desktop-1440.png
02-journey-desktop-1440.png
02-notes-desktop-1440.png
03-today-collapsed-dock.png            # dock label evidence (52px + vertical BAKASUR)
04-expanded-rail-desktop.png            # expanded rail + 24px header character
05-quest-completed-react.png            # QUEST_COMPLETED → HAPPY
06-habit-completed-react.png            # HABIT_COMPLETED → HAPPY
07-journal-logged-react.png             # JOURNAL_LOGGED → subtle HAPPY
08-user-opened-baksur-react.png         # USER_OPENED → attentif + rail open
09-rail-opened-for-chat.png
10-bakasur-chat-response.png
11-mobile-today-390.png
12-mobile-tasks-390.png
12-mobile-habits-390.png
13-reduced-motion-desktop.png
14-final-today-desktop.png
```

Pre-V3.4.3 baseline: `visual-qa/baksur-v342/01-desktop-collapsed.png` + `visual-qa/baksur-v343/00-dock-label-BEFORE-v342.png`

---

## SUMMARY FOR GATE

- **Servers:** Frontend `http://localhost:5173` and backend `http://localhost:8787` **still running** — open them now to inspect.
- **Live reactions:** 4 of 6 required events reproduced from **real store mutations** (QUEST, HABIT, JOURNAL, USER_OPENED) — each exact-once, cooldown/dedupe correct, visual-only, decay observed. STREAK_MILESTONE and LEVEL_UP are threshold-gated and **not fabricable** from the current demo ledger — documented as not reproduced live, **unit-proved** in `reactions.test.ts` (19 baksur tests).
- **Dock:** Label no longer clips; inside dock + no overflow measured.
- **Chat/backend:** Guest demo reply is local (correct); direct `whoami` + `assistant/chat` curls prove the real Worker is serving on 8787 with CORS + `X-User-Sub` bypass, `ai_unavailable` is expected locally, contract unchanged.
- **No product code was changed in this review** — only screenshots + this report were added.
- **No commit, no push** — worktree still holds V3.4.1→V3.4.3 uncommitted diff.

> **Next:** Close this report, open `http://localhost:5173/today` and click Complete / CHECK IN / save a journal highlight yourself to see each reaction live. When you approve, proceed to **V3.4.4 (existing BakaSur integration + fixture cleanup)**. No further code changes until your explicit approve.

