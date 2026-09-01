# BAKSUR — CHARACTER DEFINITION

**Status:** research draft (V3.4.0). Directions are not locked; see
[VISUAL-DIRECTIONS.md](./VISUAL-DIRECTIONS.md).

---

## One-paragraph definition

**PROPOSAL (identity).** Baksur is a small rounded digital creature — a
*familiar* — that lives in the corner of BakaTracker, quietly watching the
user's quests, habits, and journal. He says very little, usually two to six
words, always dry. He is observant rather than encouraging: when things go
well he acknowledges it like a nod ("nice.", "that's two."); when the day is
slipping he notes the time, not the guilt ("still time."). He is chaos-
adjacent but not chaotic on screen — his mischief lives in tiny expressions
(a slow blink, a sideways glance), never in noise.

## Role in the product model

**FACT.** The V3.3 loop is: `QUESTS + HABITS + JOURNAL → XP → STATS →
CHARACTER` (canonical XP in `src/services/stats/calculateXP.ts` and
`calculateDailyXP.ts`; stats/level in `calculateCharacterStats.ts`;
character record in `src/store/useStore.ts` `compileCharacterRecord`).

**PROPOSAL.** Baksur sits at the end of that chain as its *face*:

```
... → CHARACTER → BAKSUR → understands state → helps determine next action
```

He does not compute anything. He reads the same normalized facts BakaSur
already sends to the assistant endpoint (open quests, done today, overdue,
habits done, at-risk streaks, level, xp, journalToday — FACT:
`src/components/shell/BakaSurRail.tsx` `ask()` context payload) and expresses
them as state + optional one-line remark.

## Archetype

**PROPOSAL.** *The observant familiar* — the small creature on a wizard's
desk that notices everything and comments rarely.

Reference archetypes (INFERENCE):

| Archetype | Take | Leave |
|---|---|---|
| Studio Ghibli soot sprite | ambient, quiet presence | pure decoration (no state awareness) |
| Duo-style coach | persistent, event-aware | guilt, nagging, streak-shaming |
| Terminal pet / Tama-adjacent | state-driven moods, tiny vocabulary | care-punishment loop |
| Grok/Bloub blob | morphing body, mask eyes | x.ai's exact silhouette (legal + identity) |

## Personality boundaries

Full bible in [PERSONALITY.md](./PERSONALITY.md). Hard lines (PROPOSAL):

- NEVER corporate, childish, preachy, guilt-inducing, or constantly
  motivational.
- NEVER more than one line at a time; silence is a valid state.
- NEVER punishes. A broken streak gets "okay." — not "you missed 3 days 😢".
- Mischief is expressed visually (looks, timing, deadpan), not verbally loud.

## Visual anatomy (starting direction: FLAMEHORN)

**PROPOSAL — starting direction, explicitly not locked.**

| Part | Starting spec |
|---|---|
| Body | single rounded organic mass (blob/pebble family), soft silhouette, no limbs |
| Horns | two small curved horns, symmetric, reading as one silhouette unit with the crown |
| Crown | subtle flame-shaped crest between/behind the horns — a silhouette feature, NOT fire: no particles, no gradients, no flicker effects |
| Eyes | two simple expressive eyes (Bloub-style capsule/oval pupils are the working model), no whites required, mask-cut from body |
| Face | eyes only, or eyes + at most a minimal mouth line; no nose, no cheeks |
| Limbs | none. No arms, legs, tail, clothing, accessories |
| Proportions | height : width ≈ 1 : 1.1–1.25; body dominates ≥ 85% of bounding area; crown + horns ≤ 15% |

Silhouette requirements (INFERENCE):

1. Readable as a filled shape at 16 px, 24 px, 48 px, 320 px.
2. Composed of a single filled path (Bloub engine compatibility — one body
   path + eye mask holes; FACT: Bloub renders one `bodyPath` + 2 eye shapes).
3. Horns/crown must be part of the *radial silhouette* or a simple additive
   path — they must survive the 64-sample radial morph model or be dropped
   (see [ANIMATION.md](./ANIMATION.md)).

## Face

**FACT (Bloub model).** Bloub's eyes are capsule shapes cut out of the body
via SVG `<mask>`, positioned on a sphere, with blink = vertical squash,
gaze = yaw/pitch rotation, and depth fade near the silhouette edge.

**PROPOSAL.** Baksur adopts this model unchanged: expression comes from eye
shape (height/width/tilt), blink, and gaze direction — not from eyebrows or
mouths. A minimal mouth is allowed only in CELEBRATE/CURIOUS future states if
expression proves insufficient.

## Colour philosophy

**FACT.** V3.3 canvas is a quiet graphite world: `--obs-void #060714`, paper
text `#e9e6f2`, one violet accent family (`#8b5cf6 / #7c3aed / #a78bfa`),
plus restrained semantic tones (teal `#34d399`, coral `#f87171`, amber
`#e8b45a`, rose `#f472b6`, cobalt `#38bdf8`) — `src/index.css:125-192`.

**PROPOSAL.**

- **Body:** a deep graphite-violet solid (in the `#14121f–#1a1625` family, or
  solid `--obs-aurora-deep #7c3aed` variant to be tested in V3.4.1). One
  fill, no gradients.
- **Eyes:** paper white `#e9e6f2` (mask holes read as light) or void-dark
  holes on a lighter body — pick per direction in V3.4.1.
- **Accent moments:** state colours only, borrowed from existing semantics —
  HAPPY may take teal, ALERT coral, SLEEP plain dim. Never more than one
  accent at a time.
- **Forbidden:** glows beyond the existing `orb-breathe` shadow, gradients on
  the body, particles, fire effects, cyberpunk decoration.

## What makes Baksur distinct

**INFERENCE.** Against the nearest neighbours:

| Vs. | Distinction |
|---|---|
| Generic blob | has horns/crown silhouette + state-driven gaze tied to *real* user data |
| Robot mascot (current `PixelIcon robot` placeholder) | organic, asymmetric life; no panel lines, no screens |
| Tamagotchi | no health meter to babysit; he reflects *you*, he is not a chore |
| AI chatbot avatar | he is the door to the chat, not the chat; most of his life is non-verbal |
| x.ai Grok / Bloub default | different silhouette (horns/crown), different colour, different behaviour model — see ASSET-LICENSES trade-dress note |

## State vocabulary

**PROPOSAL** (full motion spec in [ANIMATION.md](./ANIMATION.md)):

| State | Communicates | V1? |
|---|---|---|
| IDLE | present, quiet, alive | yes |
| THINKING | processing / assistant busy / day planning | yes |
| HAPPY | completion acknowledged | yes |
| ALERT | something needs attention (overdue, at-risk streak) | yes |
| SLEEP | long inactivity, night hours | yes |
| CURIOUS | user browsing data, hover | future |
| CELEBRATE | milestone / level-up | future |
