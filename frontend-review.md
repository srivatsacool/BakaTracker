# Frontend review notes

**Review workers:** OpenCode Go · `opencode-go/deepseek-v4-flash`
**Scope:** read-only repository audit and shell review
**Date:** 2026-08-15

## Findings accepted

### Shell blockers

- The 768–1180px grid forced the right rail to `58px` even when expanded. The responsive grid must distinguish `assistant-collapsed` from open state.
- The mobile BakaSur sheet could sit under the fixed bottom navigation. The sheet must own the upper z-index and reserve safe-area space.
- The BakaSur thinking indicator used `.spin`, but only `animate-spin` exists.
- `aria-controls="bakasur-rail"` was invalid for the collapsed rail because the collapsed element had no matching id.
- Prompt and metric groups need semantic group/list roles for screen-reader labels.
- Desktop context-bar negative margin assumed `16px` while the desktop main used `32px` padding.

## Repository cleanup findings

- Keep all current feature routes and the Notes editor route.
- Split the 1,200+ line `Layout.tsx` in a later pass; do not destabilize the shell while the visual re-architecture is landing.
- Remove Google Sheets/GAS from user-facing settings, tour copy, and demo copy.
- Rename the legacy `syncWithSheets` UI vocabulary only after verifying the Worker sync adapter; do not delete the state adapter blindly.
- `@auth0/auth0-react` and `src/types/User.ts` are likely Auth0-era leftovers; confirm import graph before removing.
- Existing `useAppTour.ts` contains stale Google Sheets copy and fragile selector casts; rewrite its copy/selectors before final walkthrough verification.
- Authenticated BakaSur chat currently has a deliberate unavailable state because `/api/v1/assistant/chat` is not yet registered in the Worker. Keep that honest until the Worker contract lands.

## Not accepted automatically

- Large store/state refactor: out of this visual pass unless a proven UI defect requires it.
- Backend deletion: requires contract/test verification, not visual cleanup.
- Documentation rewrite: separate cleanup phase after the UI surface is stable.
