# BAKSUR — INTERACTION MODEL

**Status:** V3.4.0 draft. PROPOSAL unless marked FACT.

---

## Placement

### Desktop (≥ 1180px)
**FACT.** The shell is a floating frame (`app-shell-frame`, 20px canvas
margin, `src/index.css:1102-1127`); BakaSur today is a collapsed 52px dock
at the frame's right edge (`.assistant-rail-collapsed`) that expands into a
320px column.

**PROPOSAL.** Baksur replaces the visual content of the collapsed dock —
the violet dot orb becomes the character. He sits **bottom-right**, inside
the existing dock footprint, never overlapping `main` content:

- Idle size ≈ 40–44px (fits the 52px dock).
- The dock keeps its hover-reveal glass; Baksur just lives in it.
- When the assistant is expanded (320px column), Baksur is *hidden* — the
  assistant itself is present; a second character next to it would be noise.

### Tablet (768–1179px)
**FACT.** BakaSur is a right-side overlay panel (fixed, z-55) at this range;
the collapsed dock renders as the mobile-style orb.

**PROPOSAL.** Same as desktop: Baksur occupies the collapsed orb slot; tap
opens the overlay panel.

### Mobile (≤ 767px)
**FACT.** Today: floating `[✦ BakaSur]` pill at `fixed bottom-[88px]
right-4 z-50` (`Layout.tsx:186-201`) + a 48px collapsed dock variant
(`.assistant-rail-collapsed` mobile media query) + bottom-sheet expansion
(`min(76vh,620px)`).

**PROPOSAL.** Preserve the pill behavior exactly in V1. The pill's glyph is
upgraded from `✦` to a static mini-render of Baksur (no animation on mobile
V1 — battery + reduced noise). The character-in-motion arrives on mobile in
a later phase; the bottom-sheet experience is unchanged.

## Interaction ladder (desktop)

**PROPOSAL.** Ambient → cursor awareness → contextual reaction → click →
existing BakaSur experience.

1. **Ambient (default):** idle life per [ANIMATION.md](./ANIMATION.md).
   Not clickable-looking; no tooltip; no wiggle bait.
2. **Cursor awareness:** within ~160px, Baksur's gaze tracks the cursor
   (reduced amplitude: yaw ≤10°). No other change. Free — costs no attention.
3. **Hover:** eyes widen slightly (CURIOUS-lite); dock glass reveals (FACT
   existing behavior); a `title`/`aria-label` "Open BakaSur" appears.
   No speech, no tooltip bubble spam.
4. **Click:** opens the **existing** assistant — `toggleAssistant()` via
   `useRailChrome` (FACT: single toggle at `Layout.tsx`; Escape closes,
   `BakaSurRail.tsx` already handles Escape). Baksur's click is just
   another trigger, equivalent to the ContextBar button today.
5. **Assistant open:** Baksur hidden (desktop) / pill hidden (mobile sheet
   open). While the assistant is busy (`busy` state exists in
   `BakaSurRail.tsx`), Baksur may show THINKING next session.

## Speech bubbles

**PROPOSAL.**

- Darkglass chip: `glass-strong`-family background, 1px hairline border,
  12px radius, IBM Plex Mono ~0.78rem, max-width ~220px, 8px padding.
- Appears above-right of Baksur; never overlaps nav or content focus.
- Lifetime: 3s + 300ms fade-out (or until next event replaces it).
- One bubble at a time; a new event replaces, never stacks.
- Bubbles are also announced via `aria-live="polite"` region for screen
  readers (see Accessibility).

## Event reactions

**PROPOSAL.** Driven by real store events (see
[TECHNICAL-INTEGRATION.md](./TECHNICAL-INTEGRATION.md)); visual = state
change + optional bubble per [PERSONALITY.md](./PERSONALITY.md). Queue rules:

- Queue depth 1: newest event replaces a pending one (morph-completion
  gated, no stutter).
- Cooldown ≥ 3s between reactions; burst completions (importing a batch)
  collapse into one summary reaction ("that's six.") — count derived from
  real events.
- No reaction while the assistant panel is open and focused (the user is
  already talking to him; the panel is the conversation).

## Accessibility

**PROPOSAL.**

- Baksur is a `role="img"` element with `aria-label` describing current
  state ("Baksur, idle. 2 quests done today."), updated on state change.
- Click target ≥ 44px effective (the dock/pill already provides this).
- Fully keyboard-reachable: the existing expand button keeps focus; Baksur
  is its visual, not a separate control (avoids a second tab stop).
- Speech text mirrored into a visually-hidden `aria-live="polite"` region;
  `role="status"` semantics; never `alert` (never demanding).
- Decorative motion is never the only signal: state changes also alter the
  aria-label and (where applicable) the dock LED color.
- Contrast: eyes/body tested against `--obs-void` for the 3:1 non-text
  minimum at minimum.

## Reduced motion

**FACT.** BakaTracker globally zeroes animation/transition durations under
`prefers-reduced-motion` (`src/index.css`), and the removed tunnel
background had a static fallback pattern (`useSyncExternalStore`
subscription in `AppBackground.tsx`).

**PROPOSAL.** Baksur's rAF loop checks the same media query:

- Reduced: no rAF loop; render one static frame per state (Bloub's
  `engine.sample(frozenAt)` pure function makes this trivial); blink and
  drift disabled; state changes swap the static frame with a simple opacity
  fade (which the global CSS kills to instant anyway).
- Speech bubbles still appear (text is content, not motion).

## Interruption rules

**PROPOSAL.**

- User input always wins: any reaction pauses if the user is typing,
  dragging, or has a modal open; resumes (or drops) after.
- Tab hidden (`visibilitychange`): pause rAF entirely (same pattern as the
  tunnel background's IntersectionObserver/visibility pause).
- Offline: no network-derived reactions; local events still react.
- A state morph in progress completes before the next begins (no cut).

## Layering / z-index principles

**FACT (current ladder):** mobile bottom nav z-50 · pill z-50 · assistant
collapsed z-60 · sheet z-60 · tablet panel z-55 · modals z-2000+.

**PROPOSAL.** Baksur introduces **no new z-index owner**. He renders
*inside* the existing dock/pill containers and inherits their layer. If a
temporary spotlight (e.g. level-up) ever needs elevation, it may go to the
assistant's existing layer, never above modals. Speech bubbles attach to
the same container, `pointer-events: none` except on Baksur himself.
