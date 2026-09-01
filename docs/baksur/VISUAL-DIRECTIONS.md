# BAKSUR — VISUAL DIRECTIONS

**Status:** V3.4.0 exploration. Five directions. **Nothing is locked** —
Flamehorn is the stated *starting* point, not the verdict.

Each direction includes enough description to brief a designer or image
generator later, plus an honest animation-compatibility note against the
Bloub runtime (FACT-based; see [ANIMATION.md](./ANIMATION.md)).

---

## Comparison matrix

| # | Direction | Silhouette strength | Anim compat (Bloub) | Recognizability | V3.3 fit | Verdict |
|---|---|---|---|---|---|---|
| A | **Flamehorn** | strong (horns + crest) | good, with 1 risk | high | high | strong candidate |
| B | **Pebble Familiar** | medium (asymmetry only) | excellent | medium | very high | safe fallback |
| C | **Ember Wisp** | high (tail) | **poor** (tail breaks radial model) | high | medium | cut unless redesigned |
| D | **Horned Mochi** | medium-high | excellent | medium-high | high | strong candidate |
| E | **Void Sprite** | medium (notch crown) | excellent | medium | very high | viable, lower warmth |

**Recommendation (INFERENCE):** take **D — Horned Mochi** or **A — Flamehorn
(simplified crown)** into V3.4.1 as the two prototypes, with B as the
fallback. Rationale: D is the best blend of recognizability (horns) and
animation safety (squircle body is Bloub's `squircle`/`galet` family —
excellent 64-sample radial behaviour); A is the most distinctive but its
flame crest must be simplified into the radial silhouette or it fights the
morph engine. C is cut: tails are appendages, which the brief excludes, and
they break the one-path model.

---

## Direction A — FLAMEHORN (starting direction)

**Description (for a designer / image generator):**
A small rounded organic creature, roughly pear/pebble shaped, wider than
tall at the base. Two short curved horns rise from the upper sides of the
head and curl slightly inward. Between and behind them sits a low, smooth
flame-shaped crest — a single solid sculptural ridge shaped like a candle
flame, not fire: no glow, no particles, no gradient, no flicker. Two simple
oval eyes, no mouth or at most a hairline mouth. Solid deep graphite-violet
body, paper-white eyes. No limbs, no clothing. Flat single-color fill on a
dark graphite background. Cute but reserved, like a small desk idol.

- **Strengths:** most distinctive silhouette of the five; horns + crest give
  instant identity at any size; matches "digital creature / familiar" brief.
- **Weaknesses:** the flame crest risks reading as "fire theme" (the brief
  forbids fire effects); crest sits *above* the radial center, so it must be
  baked into the outline or it will not morph.
- **Animation compatibility (FACT-based):** body is blob-family → excellent
  morph. Horns/crest are additive geometry. Bloub's model is one radial
  silhouette (`PROFILE_SAMPLES = 64`, single `bodyPath` + eye mask holes).
  Horns must either (a) be included in the radial profile as part of the
  outline (bumpy radii — feasible), or (b) drawn as a separate static path
  layered behind the morphing body (simpler, horns don't animate). Option (b)
  is the V3.4.1 plan if A is chosen.
- **Recognizability:** excellent at 16–320 px.
- **BakaTracker fit:** strong; graphite-violet body sits naturally on
  `--obs-void`.

## Direction B — PEBBLE FAMILIAR

**Description:** A smooth, slightly asymmetric pebble — like a sea stone
that decided to be alive. No horns, no crest, no protrusions at all.
Identity comes entirely from a subtle lean (the pebble is 3–5° off-axis),
two large expressive eyes placed slightly off-center, and motion quality.
Solid deep-graphite body, white capsule eyes.

- **Strengths:** perfectly native to the quiet graphite world — reads as "a
  stone with a soul on your desk". Zero animation risk: essentially Bloub's
  `galet` (pebble) skin already in `skins.ts`.
- **Weaknesses:** low inherent distinctiveness; a pebble with eyes is close
  to the generic-blob territory the brief warns about. Identity must be
  carried 100% by behavior and typography.
- **Animation compatibility:** excellent — no additive geometry, pure radial
  silhouette; the entire Bloub engine applies unmodified.
- **Recognizability:** medium at small sizes (could be any blob).
- **BakaTracker fit:** the best of the five; almost invisible until it moves.

## Direction C — EMBER WISP

**Description:** A teardrop-shaped wisp with a softly tapering flame-tail
that curls to one side, and a single small horn on the crown. Slight
upward buoyancy in posture. Deep-violet body fading to near-void at the
tail tip (single solid tone in the flat version), paper eyes.

- **Strengths:** most "alive"/dynamic silhouette; strong recognizability;
  the tail gives unique lean and drift behavior.
- **Weaknesses:** tail = an appendage the brief explicitly excludes; the
  tapering tail cannot be represented in Bloub's radial 64-sample model
  (radial profiles can bulge but a trailing curl is non-radial); risks
  reading as fire-themed decoration.
- **Animation compatibility: POOR (FACT-based).** Would require a custom
  path-morphing layer outside the Bloub engine — precisely what the brief
  says to avoid ("prefer reusing a suitable existing runtime").
- **Recognizability:** high.
- **BakaTracker fit:** medium — the dynamism fights the still, quiet shell.

## Direction D — HORNED MOCHI

**Description:** A soft squircle — a rounded square like a mochi dumpling —
sitting square to the viewer, with two tiny stub horns poking from the top
corners (almost nubs). Eyes are wide-set capsules. The flat top edge plus
horns forms a distinctive "crown line" silhouette. Solid graphite-violet,
white eyes, nothing else.

- **Strengths:** squircle is instantly distinguishable from every circular
  blob avatar; stub horns give just enough identity without a fire motif;
  horizontal top edge reads well behind UI chrome.
- **Weaknesses:** less "organic" than A/B; the mochi/cute-square family is
  used by some productivity mascots.
- **Animation compatibility:** excellent (FACT-based). Bloub's `skins.ts`
  contains analytical `squircle` and `superellipseProfile` — the exact
  geometry already exists and is normalized for morphing; stub horns are
  small radial bumps on the top corners, trivially representable in the
  64-sample profile.
- **Recognizability:** medium-high.
- **BakaTracker fit:** high.

## Direction E — VOID SPRITE

**Description:** A near-perfect circle with a single clean notch cut from
the top — a crescent-moon crown formed by absence, not addition. Two
minimal eyes set low. The darkest of the five directions: body barely
lighter than the canvas, defined by its hairline edge and eyes.

- **Strengths:** most restrained and most "quiet darkglass native"; the
  negative-space crown is an elegant, ownable idea; cheapest to animate.
- **Weaknesses:** low warmth; may read as "settings icon" rather than
  companion; the notch is invisible at very small sizes.
- **Animation compatibility:** excellent — circle + one notch is fully
  radial.
- **Recognizability:** medium (strong up close, weak at 16 px).
- **BakaTracker fit:** very high, perhaps too quiet for a "living identity".

---

## Prototype plan for V3.4.1 (PROPOSAL)

1. Build the Bloub-backed React runtime once (see
   [TECHNICAL-INTEGRATION.md](./TECHNICAL-INTEGRATION.md)).
2. Implement D (Horned Mochi) and A (Flamehorn, static horn layer variant)
   as two profile/shape configurations — they share 100% of the runtime.
3. Render both side-by-side in the collapsed orb position at 24 px / 48 px /
   320 px, over the real shell.
4. Decide by review; B remains the documented fallback.

## Image-generation prompt seeds (per direction)

> Flat vector character concept sheet, single solid silhouette, dark
> graphite background `#060714`, body in deep graphite-violet `#1a1625` /
> `#7c3aed` variants, paper-white `#e9e6f2` simple oval eyes, minimal
> features, no limbs, no gradients, no glow, no outline strokes, front view
> + 3/4 view, sizes: 16 px, 48 px, 320 px readability rows.

Then per direction: A — "…two small curved horns and a smooth flame-shaped
sculptural crest, candle-flame silhouette, no fire effects"; B — "…smooth
asymmetric sea-stone pebble, 3–5° lean, no protrusions"; C — "…teardrop
wisp with a tapering flame-tail curling to one side, single small horn";
D — "…soft rounded square (squircle) with two tiny stub horns on the top
corners"; E — "…near-perfect circle with one clean crescent notch cut from
the top, defined by a hairline edge".
