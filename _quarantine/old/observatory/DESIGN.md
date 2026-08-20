---
name: BakaTracker
description: Your life as a night of observation — every tool a glass instrument, the day one quiet observation.
colors:
  obs-void: "#07060c"
  obs-void-deep: "#040309"
  obs-void-lift: "#0e0c17"
  obs-paper: "#e9e6f2"
  obs-paper-dim: "#b9b5c9"
  obs-paper-muted: "#7f7c93"
  obs-paper-disabled: "#4a4759"
  obs-aurora: "#6f5bd8"
  obs-aurora-deep: "#5745b5"
  obs-aurora-bright: "#8a78f0"
  obs-teal: "#5fd8c4"
  obs-coral: "#ff6b6b"
  obs-amber: "#e8b45a"
  obs-rose: "#e86a9a"
  obs-cobalt: "#5a8cff"
typography:
  display:
    fontFamily: "'Archivo', 'Arial Black', system-ui, sans-serif"
    fontWeight: 600-800
    letterSpacing: "-0.02em"
  instrument:
    fontFamily: "'Fragment Mono', ui-monospace, monospace"
    fontWeight: 400
    letterSpacing: "0.02em"
  body:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontWeight: 400-500
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  btn-primary:
    backgroundColor: "linear-gradient(180deg, #6f5bd8 0%, #5745b5 100%)"
    textColor: "#f4f2ff"
    rounded: "{rounded.sm}"
    padding: "12px 22px"
    shadow: "0 0 28px rgba(111,91,216,0.35)"
  btn-ghost:
    backgroundColor: "rgba(233, 230, 242, 0.04)"
    textColor: "{colors.obs-paper-dim}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  glass-pane:
    backgroundColor: "linear-gradient(180deg, rgba(233,230,242,0.07) 0%, rgba(233,230,242,0.03) 100%)"
    textColor: "{colors.obs-paper}"
    rounded: "{rounded.lg}"
    border: "1px solid rgba(233,230,242,0.12)"
    blur: "blur(20px) saturate(140%)"
    shadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(233,230,242,0.09)"
  chip:
    backgroundColor: "rgba(233, 230, 242, 0.04)"
    textColor: "{colors.obs-paper-dim}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: BakaTracker

## Overview

**Creative North Star: "The Night Observatory"**

BakaTracker is an observatory at first dark — your life as a night of observation, where the daily check-in is one quiet observation and every tool is a glass instrument panel lit from behind. The world is a deep-void dome (never pure black, never warm) with a faint aurora band on the horizon, content floating on layered frosted-glass panes, and exactly ONE pane burning hot: the instrument in front of you, its glass glowing aurora-violet. Every surface is either a glass pane, an instrument header, a readout, or the dome itself; glass is the material of the world, and the aurora is its only lit color. The design refuses both the stock dark-glass dashboard default (the aurora accent and instrument grammar carry it past the category) and the app's retired arcade world entirely.

**Key Characteristics:**
- The aurora violet (#6f5bd8) is the single lit color — the primary action, the active pane, the one hot source. A deep variant fills buttons; a bright variant (#8a78f0) carries text on the void at AA contrast.
- The pane in front of you is the only thing hot — the Day Line track with its running light tells you where now is (the drum-machine discipline raised in).
- Tool tones render as hairline band edges, never fields: teal = Habits, coral = Tasks, amber = Eisenhower, rose = Journal + Notes, cobalt = Journey.
- The save lamp tells the backend's truth in one LED: Observing / Recording… / Offline / Out of order.
- Score readouts are Fragment Mono, tabular: XP, streaks, levels, dates.
- One shouting word never shrinks: page headlines hold full size at every width; ornament drops in declared tiers.
- Selection pulls focus: the active pane's numbers come forward while the rest of the dome dims.

## Colors

The palette is a night dome: deep-void ground, instrument-white paper (cool, never warm), and one aurora accent. No warm grays anywhere; secondary text is tinted from the paper scale, never the slate scale.

### Primary
- **Aurora Violet** (#6f5bd8): the only lit color. Primary actions, the active pane, the Day Line fill, focus rings. Its deep variant (#5745b5) is the button fill; its bright variant (#8a78f0) is text on the void (5.79:1, AA). White on the deep fill passes 4.56:1.
- **Teal** (#5fd8c4): Habits — the consistency instrument. Also success and the saved lamp.
- **Coral** (#ff6b6b): Tasks. Also danger, OUT OF ORDER, destructive.
- **Cobalt** (#5a8cff): Journey — the night sky's charts.
- **Rose** (#e86a9a): Journal + Notes — the diary pane.
- **Amber** (#e8b45a): Eisenhower — the priority matrix.

> **Palette provenance.** The roll's core palette (seed key 2efaae3b, assigned THE NIGHT OBSERVATORY, chosen on the decision board after a dark-glassmorphism steer) is the void, paper, and aurora violet, with teal/coral/amber/rose/cobalt as documented extensions for the seven tools — each an instrument tone, rendered only as hairline band edges.

### Neutral
- **Deep Void** (#07060c): the dome ground. Fades to #040309 in the corners and lifts to #0e0c17 where glass beds sit.
- **Instrument White** (#e9e6f2): primary text — the readout white.
- **Paper Dim** (#b9b5c9): secondary text.
- **Paper Muted** (#7f7c93): captions, quiet labels.
- **Paper Disabled** (#4a4759): disabled states.

### Named Rules
**The One-Hot-Pane Rule.** Aurora appears on at most one clear action per viewport, and only the pane in front of you burns hot. The horizon aurora breathes dim as ambient identity — it never competes for the action. A screen full of hot violet is a screen on fire.

**The No-Warm-Gray Rule.** Secondary text is tinted from the paper scale, never the warm gray. Warm grays belong to the retired worlds.

**The Hairline-Edge Rule.** Tool colors exist only as hairline band edges (1px instrument lines, LED dots, thin accents) — never as full fields. The text field stays achromatic; only the instrument edges carry hue.

## Typography

**Display Font:** Archivo (self-hosted, variable 100–900, with Arial Black fallback) — a technical grotesque with the observatory's precision; headings and the one shouting word.
**Instrument Font:** Fragment Mono (self-hosted, with ui-monospace fallback) — tabular instrument readouts: XP, streaks, levels, timestamps, status lines, all score register.
**Body Font:** Inter (variable, self-hosted, 100–900) — the workhorse UI face.

**Character:** The pairing is technical at the top, tabular in the numbers, precise underneath — a glass instrument over its readout panel. All three faces are self-hosted WOFF2 so the world survives offline PWA installs.

### Hierarchy
- **Display** (Archivo 800, ~57px hero / 24px section): page titles and the one shouting word.
- **Headline** (Archivo 700, ~20px): section headings, card titles.
- **Instrument** (Fragment Mono, 400, tabular): XP, levels, streaks, INSERT-COIN-style CTAs, the score register.
- **Body** (Inter, 400, ~0.95rem, 65–75ch max): content and descriptions.
- **Label** (Fragment Mono, 400, 0.22em tracking, uppercase): kickers, chips, status, save readouts, nav labels.

## Layout

The app shell is a three-column grid on desktop (instrument rail / main / assistant pane) inside the night dome; at ≤1180px the rail compresses to icon-only; ≤767px collapses to a stacked mobile layout with a fixed bottom instrument nav, a sticky header, and the assistant as a bottom sheet. The sidebar is the instrument rail: logo, the Status card (level, save lamp, theme/settings, XP bar, Day Line), then the tool nav — each tool a glass row, the active one lit (aurora-tinted, glowing). Spacing rhythm: tight groups (8px) inside cards, generous separation (16–24px) between cards, more space above headings than below.

## Elevation & Depth

Depth is glass, not luminous: panes float on the void with backdrop blur, a hairline edge, a top highlight that reads as the glass rim, and a deep soft shadow. There is no neon glow except at the aurora pane. The one authored motion moment is the pane lighting on completion — a quick luminance settle (brightness up, settle back), a star joins the night, the save lamp blinks. Everything else moves on 200ms expo-out for micro-interactions, 360ms for surfaces, and honors prefers-reduced-motion with static frames.

### Shadow Vocabulary
- **Glass shadow** (`0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(233,230,242,0.09)`): panes, cards.
- **Aurora glow** (`0 0 28px rgba(111,91,216,0.35)`): the active pane, primary CTA, Day Line.
- **LED glow** (`0 0 8px <lamp-color>`): the sync indicator dot.

### Named Rules
**The Pane-Light Rule.** Completion animates as a single pane lighting (luminance settle, one quick scale), never as confetti or bounce. The save lamp blinks once; the day's headline holds.

## Shapes

Forms are glass: rounded rectangles with a 16px corner radius for panes, 8–10px for buttons and inputs, pills (999px) for chips, status lamps, and the assistant toggle. The instrument header carries a small square LED before its title. Panes read as frosted glass: a faint top-edge highlight, hairline border, translucent body. Borders are 1px hairlines from the paper scale at 7–12% alpha; the active pane raises its border to aurora at 40%+.

## Components

### Buttons
- **Shape:** rounded (8px), inline-flex, gap 8px.
- **Primary (btn-primary):** the aurora fill — gradient #6f5bd8 → #5745b5, near-white label (#f4f2ff, 4.56:1), aurora glow, top white highlight. Hover lifts 1px and brightens the glow.
- **Ghost (btn-ghost):** paper haze (4% alpha) with hairline border; hover deepens to 8%.
- **Text buttons (btn-text):** paper-muted, weight 600, no border.

### Chips
- **Style:** pill (999px), paper haze background, hairline border, paper-dim text, Fragment Mono 400. Tone chips tint by instrument color (aurora/teal/coral/amber/rose/cobalt) with matching alpha backgrounds.

### Cards / Containers — Glass Pane
- **Corner Style:** rounded (16px).
- **Background:** paper haze gradient (7% → 3%).
- **Shadow Strategy:** glass shadow (see Elevation).
- **Border:** 1px paper at 12%.
- **Blur:** backdrop-filter blur(20px) saturate(140%).
- **Internal Padding:** 16–24px.

### Instrument Header (signature container)
Every tool surface is a glass pane: an instrument header (LED + title, colored by tool) over a frosted body. Named states, patterned so color is never the only signal:
- **OFF** — dim header, unlit LED.
- **ATTRACT** — blinking title/LED (loading, empty, demo).
- **PLAYING** — lit aurora edge + glow (active surface).
- **HIGH SCORE** — aurora pulse (celebration, level-up, cleared board).
- **OUT OF ORDER** — coral edge + diagonal hazard stripe (error, destructive).

### Inputs / Fields
- **Style:** paper haze (5%), hairline border, 10px radius, paper text.
- **Focus:** aurora border, aurora ring at 15% alpha, aurora caret.
- **Selection:** aurora at 40% alpha with paper text.

### Navigation
- **Desktop rail:** the instrument rail — tools stacked with 8px gaps; the active tool is aurora-tinted with glow; inactive are transparent with paper-muted LEDs that brighten on hover.
- **Mobile bottom nav:** fixed bar of seven instruments, active one aurora; labels in 10px Fragment Mono.

### Save Lamp (signature component)
The backend's truth in one LED: Observing (teal, lit), Recording… (aurora, blinking), Offline (dim), Out of order (coral, click to retry), Offline · local (muted, guest). The dot carries the glow; the label sits beside it.

### Day Line (signature component)
The day's progress as one unbroken track with a running light telling you where now is (raised from the drum-machine challenger). The fill is the aurora gradient, scaled via transform (no layout animation); the now-marker is a lit vertical rule.

## Do's and Don'ts

### Do:
- **Do** keep the aurora the only hot color — one primary action per viewport, the pane in front of you.
- **Do** render every stat in Fragment Mono tabular figures (XP, streaks, levels, dates).
- **Do** tint secondary text from the paper scale, never warm gray.
- **Do** let the active pane pull focus: its numbers come forward, the dome dims.
- **Do** animate completion as the pane lighting — quick luminance settle, save lamp blinks.
- **Do** keep the one shouting word at full size on every width.
- **Do** name pane states (OFF / ATTRACT / PLAYING / HIGH SCORE / OUT OF ORDER) so color is never the only signal.
- **Do** render tool colors only as hairline band edges — never as full fields.

### Don't:
- **Don't** use the retired worlds' colors — arcade gold #ffd24a, warm amber, or any warm gray.
- **Don't** use gradient text; the brand word is solid paper or solid aurora.
- **Don't** bounce or confetti on completion; the pane light is the celebration.
- **Don't** let the aurora glow multiply across a screen; one hot pane, the horizon aurora ambient behind it.
- **Don't** use white ink on the bright aurora; white sits on the deep fill, dark ink on nothing.
