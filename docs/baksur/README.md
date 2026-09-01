# BAKSUR — V3.4 DESIGN BIBLE (RESEARCH PHASE)

**Version:** 3.4.0 — research & design planning
**Status:** DOCUMENTATION ONLY. No implementation. Design gate active.
**Base:** V3.3 frozen on `main` (`a9dbdc0 v3.3: canonical XP and progression loop`)

---

## Vision

Baksur is BakaTracker's living identity: a small, quiet, mischievous digital
creature — a *system familiar* — that understands the user's productivity and
progression state and helps determine the next action.

The product model it lives inside (all FACT, verified in `src/`):

```
QUESTS + HABITS + JOURNAL → XP → STATS → CHARACTER → BAKSUR → next action
```

Baksur is **not**:

- a mascot bolted onto the corner,
- a decorative animation,
- a second chatbot,
- a motivational poster with eyes.

He is the surface where the app's own state (quests, habits, journal, XP,
stats, level) becomes visible as *behavior* — a look, a posture, a two-word
remark — and the doorway into the existing BakaSur assistant.

## Goals (V3.4 series)

1. A character with a defined identity, silhouette, and personality bible —
   designed before it is drawn or coded.
2. State-driven behavior derived **only** from real BakaTracker state and
   events (`habit_completed`, `task_completed`, `journal_created`,
   streaks, level-ups). No fake events, no random motivational spam.
3. Reuse of a proven animation runtime (Bloub, MIT) rather than building a
   new animation engine — minimum subset only.
4. Native fit with V3.3's quiet graphite/darkglass visual system: silhouette
   and expression carry the character, not effects.
5. Click-through into the **existing** BakaSur rail/page. One assistant, ever.

## Non-goals (V3.4 series)

- No new store, database, persistence layer, or event system.
- No new dependency until license/size/maintenance are understood
  (see [ASSET-LICENSES.md](./ASSET-LICENSES.md)).
- No SVG/code assets during the research phase.
- No changes to Tasks/Habits/Journey/BakaSur behavior.
- No fire/particle/glow decoration, limbs, clothing, or complex anatomy.

## Current status

| Item | Status |
|---|---|
| Repository architecture audit | DONE — see [TECHNICAL-INTEGRATION.md](./TECHNICAL-INTEGRATION.md) |
| Bloub license + source audit | DONE — see [ASSET-LICENSES.md](./ASSET-LICENSES.md) and [ANIMATION.md](./ANIMATION.md) |
| Character direction | EXPLORING — 5 directions in [VISUAL-DIRECTIONS.md](./VISUAL-DIRECTIONS.md) |
| Personality bible | DRAFTED — [PERSONALITY.md](./PERSONALITY.md) |
| Motion language | DRAFTED — [ANIMATION.md](./ANIMATION.md) |
| Interaction model | DRAFTED — [INTERACTION.md](./INTERACTION.md) |
| Visual prototype (V3.4.1) | NOT STARTED — gated on direction approval |
| Implementation roadmap | SEE [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) |

## The design gate

Nothing below may proceed without explicit approval of the direction:

```
V3.4.0 research/design  ←  YOU ARE HERE
V3.4.1 visual prototype      (only after direction sign-off)
V3.4.2 interaction
V3.4.3 real product reactions
V3.4.4 existing BakaSur integration
V3.4.5 QA / polish
```

## Evidence discipline

Every document separates:

- **FACT** — verified from the actual repository, source, or license text.
- **INFERENCE** — reasoned design conclusion drawn from facts.
- **PROPOSAL** — planned future behavior; not built, not agreed until approved.

## Document map

| Document | What it decides |
|---|---|
| [CHARACTER.md](./CHARACTER.md) | Who Baksur is: identity, archetype, anatomy, colour philosophy |
| [VISUAL-DIRECTIONS.md](./VISUAL-DIRECTIONS.md) | What he looks like: 5 directions compared, recommendation |
| [ANIMATION.md](./ANIMATION.md) | How he moves: motion language, states, Bloub capability mapping |
| [PERSONALITY.md](./PERSONALITY.md) | How he speaks: tone, dialogue rules, silence |
| [INTERACTION.md](./INTERACTION.md) | How he behaves on screen: placement, cursor, click, a11y |
| [TECHNICAL-INTEGRATION.md](./TECHNICAL-INTEGRATION.md) | Where he attaches in the current codebase |
| [ASSET-LICENSES.md](./ASSET-LICENSES.md) | What we may legally reuse and what attribution is owed |
| [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) | The staged roadmap V3.4.0 → V3.4.5 |
