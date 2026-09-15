/*
 * BAKASUR-UI — Public API Entry Point (Phase 11).
 *
 * Runtime-safe exports for consumers (BakaTracker, Lab, embeds).
 * Exposes character runtime, preset catalogues, scene resolution,
 * dialogue timing, reaction mappings, and essential TypeScript interfaces.
 * Editor/Lab internals are excluded from this boundary.
 */

// Runtime Vue Components
export { default as BakasurBot } from './runtime/BakasurBot.vue'
export { default as SceneView } from './cinematic/SceneView.vue'
export { default as Playground } from './cinematic/Playground.vue'
export { default as DialogueLayer } from './dialogue/DialogueLayer.vue'

// Canonical Character Geometry & Lighting
export { BAKASUR_RADII, BAKASUR_SHAPE_ID, BAKASUR_MIN_RADIUS, BAKASUR_UNROUNDNESS } from './bakasur/profile'
export { FLAMEHORN_RADII } from './bakasur/flamehorn'
export { BAKASUR_LIGHTING, type BakasurLighting } from './bakasur/lighting'
export {
  renderBakasurSvg,
  renderBakasurInner,
  BAKASUR_RENDER_COLOURS,
  type BakasurRenderOpts,
  type BakasurRenderColours
} from './bakasur/render'
export {
  BAKASUR_BODY_BASE,
  BAKASUR_INNER_LIGHT,
  BAKASUR_RIM,
  BAKASUR_EYE_GLOW,
  BAKASUR_PASTILLE,
  BAKASUR_VOID
} from './bakasur/palette'

// Preset Catalogue & Resolution
export { getBakasurPreset, listBakasurPresets, BAKASUR_PRESETS } from './bakasur/presets/catalogue'
export { resolvePresetDef } from './bakasur/presets/validate'
export { resolveBakasurTheme, isBakasurThemeId, BAKASUR_THEMES, BAKASUR_THEME_IDS } from './bakasur/presets/colours'

// Scene Catalogue & Resolution
export { getScene, listScenes, CINEMATIC_SCENES, SCENE_IDS } from './cinematic/scenes'
export { resolveSceneFrame, validateScene, validateFrameValues, frameViewport } from './cinematic/resolve'
export { renderSceneSvg, cameraTransform } from './cinematic/render'

// Dialogue System
export { getDialogueSequence, listDialogueSequences, DIALOGUE_SEQUENCES } from './dialogue/sequences'
export { dialogueStateAt, scheduleSequence, revealText } from './dialogue/timeline'
export { applyPersonality, cueToResolved, findRule, DEFAULT_RULES } from './dialogue/reactions'

// Types
export type { BakasurIntent } from './bakasur/animations/types'
export type { BakasurColourTheme } from './bakasur/presets/colours'
export type { ResolvedFrame } from './cinematic/resolve'
export type {
  BakasurPersonality,
  BakasurTimeline,
  ResolvedBakasurPreset,
  BakasurThemeId
} from './bakasur/presets/types'

export type {
  CinematicScene,
  ChoreographyDef,
  EntranceCueDef,
  GazeCueDef,
  PortalCouplingDef,
  DialogueSyncDef,
  MicroMotionDef,
  CameraDef,
  PortalDef,
  EnvDef,
  ActorDef
} from './cinematic/types'

export type {
  DialogueSequence,
  DialogueLine,
  DialogueState,
  ReactionCue,
  DialogueInteractionState,
  DialogueEventType
} from './dialogue/types'
