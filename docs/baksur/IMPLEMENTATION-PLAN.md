# BAKSUR — IMPLEMENTATION ROADMAP

**Status:** V3.4.0 (research/design) is CURRENT. Each phase below requires
explicit approval to begin. Phases are sequential; non-goals are binding.

---

## V3.4.0 — Research & Design ← CURRENT

- **Scope:** this documentation set only. Character definition, 5 visual
  directions, animation/Bloub audit, personality bible, interaction model,
  integration map, license verification, roadmap.
- **Files affected:** `docs/baksur/*` (new) — nothing else.
- **Dependencies:** none.
- **Validation:** docs reviewed; FACT/INFERENCE/PROPOSAL separated;
  `git status` shows only new docs; no `src/` or manifest diffs.
- **Non-goals:** everything in V3.4.1+.
- **Exit gate:** direction recommendation approved (from
  [VISUAL-DIRECTIONS.md](./VISUAL-DIRECTIONS.md): prototype D + A, fallback B).

## V3.4.1 — Visual prototype

- **Scope:** vendor trimmed Bloub `src/bot/` subset into `src/lib/bloub/`
  (MIT headers + NOTICE file per [ASSET-LICENSES.md](./ASSET-LICENSES.md));
  port `BloubBot.vue` → `src/components/shell/BaksurCharacter.tsx` (SVG mask
  render + rAF loop + reduced-motion static frame); implement the two
  approved directions (Horned Mochi + simplified Flamehorn) as shape
  configurations; static gallery/fixture view (e.g. hidden dev route or
  test page) showing both at 24/48/320px in all 5 states.
- **Files likely affected:** NEW `src/lib/bloub/*`, `NOTICE`,
  `BaksurCharacter.tsx`, a dev fixture; NO existing-file edits.
- **Dependencies:** V3.4.0 sign-off.
- **Validation:** `tsc -b` clean; `vitest run` green (existing suite
  untouched); visual screenshot review of the fixture.
- **Non-goals:** store wiring, events, placement in Layout, bubbles, speech.

## V3.4.2 — Interaction

- **Scope:** mount character into the collapsed dock (`BakaSurRail.tsx`
  collapsed branch) + static mini-render in the mobile pill
  (`Layout.tsx`); cursor gaze follow; hover states; click → existing
  `toggleAssistant()`; z-index/layer integration; visibilitychange /
  IntersectionObserver pause of the rAF loop.
- **Files likely affected:** `src/components/shell/BakaSurRail.tsx`,
  `src/components/shared/Layout.tsx`, `src/index.css` (dock sizing
  adjustments only), `BaksurCharacter.tsx`.
- **Dependencies:** V3.4.1 direction chosen.
- **Validation:** manual matrix — desktop expanded/collapsed, tablet
  overlay range, mobile pill/sheet, editor flush route (`/notes/:id` no
  character), reduced-motion static, keyboard tab path, Escape close.
- **Non-goals:** event-driven reactions, speech, any store changes.

## V3.4.3 — Real product reactions

- **Scope:** `deriveBaksurView()` selector + `useBaksurState()` hook
  (event diffing, reaction queue, cooldowns) per
  [TECHNICAL-INTEGRATION.md](./TECHNICAL-INTEGRATION.md) §1.3/§3; map the
  six product events to states; speech bubbles per
  [PERSONALITY.md](./PERSONALITY.md) (copy table, silence rules, budgets);
  THINKING wired to real assistant busy state.
- **Files likely affected:** NEW `src/lib/baksurView.ts`,
  `src/hooks/useBaksurState.ts`; `BakaSurRail.tsx` (consume hook);
  `BaksurCharacter.tsx` (bubble slot).
- **Dependencies:** V3.4.2 placed correctly.
- **Validation:** scripted scenario tests — complete quest → HAPPY once;
  second rapid completion → count line, no spam; overdue → ALERT ≤1/3s;
  journal → HAPPY quiet; level change → CELEBRATE (as extended HAPPY);
  guest mode → visuals only, no ambient lines; localStorage-cleared first
  run → silence.
- **Non-goals:** assistant chat changes, new persistence, notification
  system changes.

## V3.4.4 — Existing BakaSur integration

- **Scope:** unify click flow so every Baksur entry point opens the one
  existing assistant (rail / overlay / sheet / `/bakasur` page parity);
  THINKING state fed from the real `busy` flag; deduplicate the
  rail/page helper drift (`buildRouteSuggestions`/`demoReply` live in both
  files today — extract to a shared module *only if* touched for this);
  verify guest vs API paths through the character entry.
- **Files likely affected:** `BakaSurRail.tsx`, `BakaSurPage.tsx`,
  `src/components/shell/ContextBar.tsx` (trigger parity),
  possibly NEW `src/components/shell/bakasurShared.ts`.
- **Dependencies:** V3.4.3.
- **Validation:** E2E smoke (existing firefox script) + manual: open via
  character = open via ContextBar button = open via pill; no second chat
  history; context facts identical across entries.
- **Non-goals:** backend/worker changes, prompt changes.

## V3.4.5 — QA / polish / release

- **Scope:** a11y audit (aria-live, roles, contrast, reduced-motion,
  keyboard); perf pass (rAF cost, pause coverage, bundle diff ≤ ~12KB gzip
  from vendored engine); visual QA screenshots
  (`visual-qa/v34/…` desktop/tablet/mobile × states); license NOTICE
  final check; version bump + CHANGELOG entry (repo convention: version
  fields were stale at 2.3.0 — update as part of release, not before).
- **Files likely affected:** `package.json`, `CHANGELOG.md`,
  `src/index.css` (micro-polish), docs.
- **Dependencies:** V3.4.4.
- **Validation:** full `vitest run`, `tsc -b`, build, E2E smoke; visual QA
  report like V3.3's.
- **Non-goals:** new states (CURIOUS/CELEBRATE stay future), new events.

---

## Standing non-goals (all phases)

- No new dependency in `package.json` (Bloub is vendored MIT source).
- No new store/context/DB/persistence; no writes to `useStore.ts`.
- No second chatbot; assistant behavior/endpoint unchanged.
- No guilt/motivational-spam mechanics ever (PERSONALITY prohibitions).
- No fire particles, glow, gradients, limbs, clothing.
