# BakaTracker frontend re-architecture

**Status:** In progress
**Owner:** Hermes Agent + OpenCode review workers
**Scope:** React/Vite frontend re-architecture; preserve completed backend contracts
**Primary direction:** Dark glass command deck inside an animated LightTunnel environment

## Product outcome

BakaTracker should feel like a personal life operating system floating inside an ambient digital environment—not a conventional dashboard with a sidebar and disconnected cards.

The product has three experiences:

1. **Landing:** explain the entire product and make the live demo understandable within seconds.
2. **Demo:** open the real app with seeded guest data and a guided walkthrough.
3. **Workspace:** run the day with a left navigation rail, centered feature surface, persistent context bar, and collapsible global BakaSur rail.

## Repository truth

- Routes: Today, Habits, Tasks, Eisenhower Matrix, Journal, Journey, Notes, and Excalidraw page workspace.
- Existing data model: habits, habit logs, tasks, journal entries, quotes, events, character stats, weekly stats, settings.
- Existing auth: Worker-owned OAuth client using PKCE; guest/demo provider exists.
- Existing resilience: local-first store, offline state, PWA install flow, Notes autosave/conflict handling, notification settings.
- Existing AI: Notes-specific read-only actions exist; a global assistant endpoint is not yet present.
- Existing visual direction: first dark-glass pass exists but is incomplete; legacy neo-brutalist and Google Sheets concepts still leak into the UI.
- Branding: `public/logo.png` is the canonical app logo and must be used for favicon, PWA, landing, shell, mobile header, and identity surfaces.

## Non-negotiable direction

- Deep violet-black environment with slow animated LightTunnel motion.
- Inset glass application frame with visible outer margins.
- Desktop three-column structure: left rail, main workspace, right BakaSur rail.
- Both rails collapse without losing task context.
- Date, local time, weekday, level, XP, daily score, quest count, sync/offline state, and demo state remain visible.
- Day/night mode remains glass-based; it does not revert to the old beige neo-brutalist theme.
- Preserve product behavior and REST contracts.
- No direct React-to-MCP or React-to-model calls.
- No fake production AI claims in guest/demo mode.

## Landing page

- Hero with existing BakaTracker tagline, product explanation, real interface preview, date/time context, and two actions: **Explore live demo** and **Sign in**.
- Product story: daily loop, tasks, habits, Today, Matrix, Journal, Journey, Notes, BakaSur, ownership/privacy.
- Interactive walkthrough using the existing guest/demo flow and tour infrastructure.
- Demo opens the actual app with seeded data; it is not a static mockup.

## Workspace shell

- `AppShellFrame`: centered, rounded, translucent, blurred, inset with margins.
- `ContextBar`: time/date, progress, XP, quests, sync/offline, mode toggle, BakaSur toggle.
- `LeftRail`: logo, route navigation, level/XP, demo/local state, settings, collapse.
- `BakaSurRail`: global assistant UI with current route context, suggestions, messages, composer, loading/error state, collapse.
- Mobile: bottom navigation, left drawer, BakaSur bottom sheet.

## BakaSur contract boundary

The frontend panel is being built now with an honest guest/demo adapter and an authenticated API seam:

```text
POST /api/v1/assistant/chat
```

The global Worker route must be added separately before authenticated global chat can be production-live. It must use the existing Tool Registry/AI boundary, return structured sources and action proposals, and require explicit confirmation for mutations. Until then, authenticated UI must show a recoverable unavailable state—not fabricate an answer.

## Cleanup targets

1. Remove Google Sheets/GAS setup from user-facing settings and copy.
2. Audit and rename compatibility functions such as `syncWithSheets` only after verifying current Worker usage.
3. Remove stale neo-brutalist hard borders, offset shadows, and duplicate theme overrides.
4. Update stale architecture copy that still describes Google Sheets as the current backend.
5. Audit unused packages/components before deleting anything required by runtime contracts.

## Implementation phases

- [x] Shape confirmed with user
- [x] Shared shell components started
- [ ] Shell integration and responsive verification
- [ ] Landing product walkthrough
- [ ] Feature surface migration
- [ ] Legacy user-facing cleanup
- [ ] Global assistant Worker contract
- [ ] Desktop/mobile/reduced-motion/offline verification

## Verification gates

```bash
npm run lint
npm run build
npm run test:pages
npx playwright test
```

Visual gates: desktop with rails open/collapsed, mobile with drawers/sheet, day/night, reduced motion, guest demo, empty/error/offline states, and Notes editor route.

## Working-tree note

This repository contains uncommitted design changes from the previous dark-glass pass and logo replacement. Do not reset or discard them automatically. Re-baseline with `git diff --stat` before committing the re-architecture.
