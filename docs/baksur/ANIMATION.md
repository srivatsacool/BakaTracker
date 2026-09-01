# BAKSUR — ANIMATION

**Status:** V3.4.0 research. Nothing implemented. This document fixes the
motion language, defines REQUIRED-V1 vs FUTURE behavior, and maps Baksur's
needs against Bloub's *actual, verified* capabilities.

Legend: **FACT** = verified from Bloub source / BakaTracker source.
**INFERENCE** = design conclusion. **PROPOSAL** = planned behavior.

---

## 1. Motion language (house rules)

**FACT.** BakaTracker's motion grammar (V3.3, `src/index.css`): one authored
moment per action ("pane lights"), 200ms expo-out micro-transitions, 360ms
surface motion, and a global `prefers-reduced-motion` kill-switch.

**FACT.** Bloub's motion grammar: exponential ease-outs (`easeOutQuint:
1-(1-t)^5`), body **never overshoots**, only one local spring (notification
pop `1.14`), idle is drift + breath, not float.

**PROPOSAL.** Baksur adopts both, merged:

| Rule | Value |
|---|---|
| Transitions | ease-out, no bounce/overshoot except one sanctioned "pop" |
| State morph | 0.3–0.6s (Bloub's measured `morph` range) |
| Surface entrances (bubbles) | 360ms, matching `assistant-sheet-up` |
| Always-on motion | exactly one: idle breathing/drift. Nothing else loops |
| Reduced motion | rAF stops; static frame at a chosen pose; state changes swap the static frame |

## 2. Required states — V1

### IDLE
- **Communicates:** present, quiet, alive.
- **Behavior (PROPOSAL):** body at rest; slow breathing (~0.5% scale, ~3.4s
  cycle); micro drift of gaze (looping noise, ±5° yaw/pitch); blink schedule
  ~1.9–4.6s intervals with occasional double-blink.
- **Bloub source (FACT):** `idle` state + `liveliness()` in `face.ts`
  (`loopNoise` drift `0.006/0.007`, breath `0.005`, `BLINKS` RNG schedule
  `0x5eed`, `BLINK_DUR 0.18s`, 18% double-blink). Documented warning:
  *the avatar doesn't float at rest — do not add float on top*.

### THINKING
- **Communicates:** assistant busy / planning / processing.
- **Behavior (PROPOSAL):** three-dot pulse reading (body condenses to a
  dot, side dots emerge and pulse), forced blink on entry.
- **Bloub source (FACT):** `thinking` state (2.6s cycle, `blinkIn: true`,
  dot-pulse geometry in `decor.ts`: middle dot + two emerging side dots).

### HAPPY
- **Communicates:** completion acknowledged (quest/habit/journal logged).
- **Behavior (PROPOSAL):** body stays IDLE; eyes switch to the "happy"
  expression (relaxed, slightly tilted, smaller), optionally one slow wink.
  Short (1.5–2.5s), then back to IDLE. No jumping, no confetti.
- **Bloub source (FACT):** `wink` state exists; `expressions.ts` contains a
  measured happy expression (eyes `0.27×0.17`, tilt `14°`, "heureux").
  Two viable routes: expression-swap on idle body, or brief `wink` state.
  V1 plan: expression route (keeps body still, matches quiet grammar).

### ALERT
- **Communicates:** something needs attention (overdue quest, at-risk
  streak, sync error).
- **Behavior (PROPOSAL):** eyes widen; posture tilts a few degrees toward
  the user; optionally a small traveling exclamation mark beside the body.
  Returns to IDLE after ~2.4s min hold.
- **Bloub source (FACT):** `wide` state (eyes `0.356×0.875`, `blinkIn`);
  `alert` state (tilted `!` bar with teardrop dot, 17.7° tilt, 2.5Hz buzz,
  `minDuration 2`); `exclaim` (upright `!`, static) as a calmer alternative.

### SLEEP
- **Communicates:** long inactivity / late hours; do not disturb.
- **Behavior (PROPOSAL):** eyes closed; body bounces very gently on a slow
  cycle; no blink (already closed); wakes with one wide-eyed beat on click.
- **Bloub source (FACT):** `sleep` state (2.4s; closed-eye dot bouncing
  `cy 0.11 + sin(t·τ/0.6)·0.19`, `eyeAlpha: 0`).

## 3. Future states (documented, not built)

| State | Communicates | Planned motion (PROPOSAL) | Bloub basis |
|---|---|---|---|
| CURIOUS | user hovers / browses data | gaze follows cursor with slightly wider eyes, head-tilt | `Look` follow + `wide` eyes (FACT components) |
| CELEBRATE | streak milestone / level-up | single sanctioned "pop" (scale 1.14 peak, ~0.3s) + one happy wink; never longer than 1.5s | `notify` pop curve `NOTIF_POP=1.14` (FACT) |

## 4. Cross-cutting motion systems

### Blink
**FACT (Bloub):** deterministic RNG schedule (`0x5eed`): first blink 1.4s,
then every `1.9 + rng·2.7`s, 18% chance of double-blink (+0.24s), duration
0.18s, fast-close/slow-open curve. Shape changes are *hidden by a forced
0.2s blink* on states with `blinkIn`.
**PROPOSAL:** adopt unchanged. This measured system is better than anything
we would hand-tune.

### Gaze / cursor awareness
**FACT (Bloub):** `Look {yaw, pitch, mix, spin, wander}` — absolute aim,
mixed by the engine. Follow-pointer constants: `YAW_MAX 16°`,
`PITCH_MAX 13°`, `PITCH 10°`, `TURN_TIME 1.1s`, `SPIN 360°` free-turn.
Follow is only enabled on `baseFace` states (idle/swirl).
**PROPOSAL:** Baksur follows the cursor with reduced amplitude
(`YAW_MAX ~10°, PITCH_MAX ~8°` — a desk pet watches, it doesn't gawk).
On mobile: no pointer follow; occasional slow autonomous look-arounds using
idle wander only.

### State transitions
**FACT (Bloub):** engine `setState` with morph durations 0.3–0.6s; freezes
the composed pose if interrupted mid-fade to avoid jumps.
**PROPOSAL:** event reactions queue; a new event during a reaction replaces
it after the current morph completes (no stutter). Cooldown ≥ 3s between
event reactions (anti-spam; see [PERSONALITY.md](./PERSONALITY.md)).

## 5. Bloub capability evaluation (verified)

| Need | Bloub provides? | Evidence |
|---|---|---|
| Body morphing | YES | `shape.ts blend()` — 64-radius lerp + Catmull-Rom closed path (FACT) |
| Eye shapes/expressions | YES | `expressions.ts` 16 measured expressions, blendable (FACT) |
| Blink | YES | schedule + forced blink + squash model (FACT) |
| Idle life | YES | `liveliness()` loopNoise drift/breath (FACT) |
| Gaze/follow | YES | `gaze.ts lookTarget()`, engine `setLook` (FACT) |
| IDLE/THINKING/ALERT/SLEEP states | YES, pre-built | `states.ts` (FACT) |
| HAPPY | YES via expression or `wink` (FACT) |
| Horns/crown silhouette | PARTIAL | radial bumps OK in profile; additive layer needs a small custom static path behind the body (INFERENCE) |
| React runtime | REIMPLEMENT | `BloubBot.vue` is Vue; port mask-SVG render + rAF loop to a React component (FACT) |
| Non-radial features (tails, limbs) | NO | violates one-path radial model — direction C cut for this reason (FACT+INFERENCE) |

**Minimum subset BakaTracker needs** (detail in
[TECHNICAL-INTEGRATION.md](./TECHNICAL-INTEGRATION.md)): `math`, `repere`,
`shape`, `face`, `expressions`, `engine`, a trimmed `states` catalog
(5 states), the alert `!` decor subset, and — only if a non-circular body is
chosen — `skins`/`eyefit`. Excluded: Vue editor UI, timeline/cycles,
export pipeline (PNG/GIF/MP4), `mediabunny`, i18n.

## 6. Explicitly forbidden motion

- Fire/particle effects, glows, gradients animating.
- Floating/bobbing on top of idle (Bloub documents this as a measured trap).
- Squash-and-stretch comedy, overshoot, elastic easings.
- Looping attention-seeking animations (wiggle to bait clicks).
- Any motion that ignores `prefers-reduced-motion`
  (BakaTracker kills all animation globally — `src/index.css` — Baksur must
  respect the same switch and render a static pose).
