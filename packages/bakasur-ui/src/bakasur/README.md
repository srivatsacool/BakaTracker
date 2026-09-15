# `src/bakasur/` — Bakasur character definitions (populated Phases 3–6)

**Status:** Phases 3–6 landed — profile, palette, lighting, eyes and render
(Phase 3), expressions (Phase 4), animation adaptations (Phase 5) and the
preset/combination system (Phase 6: `presets/` catalogue, themes, timelines,
treatments, validation + `docs/bakasur-presets.md`). See
`docs/BAKASUR-DESIGN.md` for the direction they serve.

It will hold **original Bakasur work** (not upstream code):

- Phase 3 — Bakasur shapes/geometry (dark organic silhouette, rim/inner
  purple light; upstream `engine/skins.ts` catalogues stay untouched
  alongside — multi-shape support is preserved, never overwritten).
- Phase 4 — Bakasur expression set (data-driven, composable).
- Phase 5 — Bakasur animation adaptations (KEEP/MODIFY/REMAP/REMOVE/NEW
  disposition of the upstream catalogue).
- Phase 6 — presets (`bakasur-thinking`, `bakasur-suspicious`, …) and the
  Shape × Expression × Animation × Colour × Timeline validation model.

Provenance rule: every file added here carries an `Original Bakasur work`
header. Nothing from BakaTracker's trimmed vendor (`mochi`/`flamehorn`,
`BaksurCharacter`, reactions) is copied in — geometry is re-authored
natively against the `src/engine/` radial machinery.
