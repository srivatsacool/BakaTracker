---
name: BakaTracker
description: Your life inside a light tunnel — every tool a smoked-glass instrument pane floating over the fibre-optic world, the daily check-in one lit pane in the tunnel.
colors:
  obs-void: "#060714"
  obs-void-deep: "#03040b"
  obs-void-lift: "#0d1022"
  obs-paper: "#e9e6f2"
  obs-paper-dim: "#b9b5c9"
  obs-paper-muted: "#7f7c93"
  obs-paper-disabled: "#4a4759"
  obs-aurora: "#8b5cf6"
  obs-aurora-deep: "#7c3aed"
  obs-aurora-bright: "#a78bfa"
  obs-teal: "#34d399"
  obs-coral: "#f87171"
  obs-amber: "#e8b45a"
  obs-rose: "#f472b6"
  obs-cobalt: "#38bdf8"
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
    backgroundColor: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)"
    textColor: "#f4f2ff"
    rounded: "{rounded.sm}"
    padding: "12px 22px"
    shadow: "0 0 28px rgba(139,92,246,0.35)"
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

**Creative North Star: "The Light Tunnel"**

BakaTracker is a personal life operating system floating inside an animated fibre-optic world. A violet-indigo LightTunnel (the repo's React Bits port — ogl/WebGL, cables #8B5CF6, pulses #A78BFA, tunnel #312E81, outward flow, restrained glow/brightness, grain, subtle mouse) runs slowly behind everything. A layered dark readability overlay sits between the world and the app — translucent base (rgba(4,5,15,0.58)) + radial darkening + edge vignette, never a flat black layer — so the tunnel stays visible while text stays immediately readable. **TEXT ALWAYS WINS:** if an animation hurts readability, the overlay darkens; typography never suffers for atmosphere.

The application is a floating smoked-glass shell: 20px breathing room around it on desktop, 20px radius, hairline border, inner top highlight, layered shadow — and **no backdrop-filter on the shell frame** (fixed children — the mobile bottom nav and the AI bottom sheet — must keep anchoring to the viewport). Three zones: the left instrument rail (*where am I*), the centre life workspace (*what am I doing*), the right BakaSur intelligence pane (*who is helping me*). The shell is a stable structure floating inside a moving environment; the background never moves with cards and never causes layout shift.

**Key Characteristics:**
- Violet (#8b5cf6) is the primary accent family — lavender #a78bfa for text, deep #7c3aed for fills — used for actions, active items, progress, XP, and BakaSur. **Glow is scarce:** BakaSur, the active item, XP, and completion moments — never every border or every card.
- The majority of the interface is dark and neutral; color represents attention.
- Tool tones render as hairline band edges, never fields: teal = Habits, coral = Tasks, amber = Eisenhower, rose = Journal + Notes, cobalt = Journey.
- The save lamp tells the backend's truth in one LED: Observing / Recording… / Offline / Out of order / Offline · local.
- Score readouts are Fragment Mono, tabular: XP, streaks, levels, dates.
- Motion is physical and restrained: background very slow, shell smooth, panels responsive, cards subtle, action feedback immediate. `prefers-reduced-motion` turns the tunnel into a static indigo frame and stops every animation.
- Completing a quest lights the pane: `float-xp` + `star-join` + `pane-light` — the one authored moment, kept verbatim.

## Colors

The palette is an indigo-tinted night: deep void ground (cool, never warm), instrument-white paper, and one violet accent family. Secondary text is tinted from the paper scale, never the slate/warm-gray scale.

### Primary
- **Violet** (#8b5cf6): primary actions, active items, progress, focus rings — 4.73:1 on void (AA). Its deep variant (#7c3aed) is the button fill (white text 4.56:1); its bright variant (#a78bfa) is text on void (7.36:1) and on glass (6.66:1).
- **Teal** (#34d399): Habits — the consistency instrument. Also success and the saved lamp (10.42:1).
- **Coral** (#f87171): Tasks. Also danger, OUT OF ORDER, destructive (7.24:1).
- **Cobalt** (#38bdf8): Journey — the charts and stats (9.35:1).
- **Rose** (#f472b6): Journal + Notes — the diary pane (7.56:1).
- **Amber** (#e8b45a): Eisenhower — the priority matrix (10.60:1).

> **Palette provenance.** The Light Tunnel world was pinned by the user's master brief (2026-08-16 evening): violet/indigo fibre-optic background, layered dark readability overlay, floating smoked-glass shell. Supersedes the Night Observatory (aurora #6f5bd8 — retired) and all earlier worlds. Token NAMES (`--obs-*`) are kept because the code and the compat/alias layer depend on them; their VALUES are the Light Tunnel world.

### Neutral
- **Deep Void** (#060714): the world ground, indigo-tinted. Fades to #03040b and lifts to #0d1022 where glass beds sit.
- **Instrument White** (#e9e6f2): primary text — the readout white.
- **Paper Dim** (#b9b5c9): secondary text.
- **Paper Muted** (#7f7c93): captions, quiet labels.
- **Paper Disabled** (#4a4759): disabled states (WCAG-exempt).

### Named Rules
**The One-Hot-Pane Rule.** Violet appears on at most one clear action per viewport. A screen full of hot violet is a screen on fire.

**The TEXT-ALWAYS-WINS Rule.** Readability beats atmosphere. If a surface is hard to read over the tunnel, darken the overlay or raise the surface opacity — never add text shadows, never sacrifice usability for aesthetics.

**The No-Warm-Gray Rule.** Secondary text is tinted from the paper scale, never warm gray. Warm grays belong to the retired worlds.

**The Hairline-Edge Rule.** Tool colors exist only as hairline band edges (1px instrument lines, LED dots, thin accents) — never as full fields.

**The Glow-Scarce Rule.** Glow is reserved for BakaSur, the active item, XP, and successful completion. If everything glows, nothing is important.

## Typography

**Display Font:** Archivo (self-hosted, variable 100–900, with Arial Black fallback) — a technical grotesque with precision; headings and the one shouting word.
**Instrument Font:** Fragment Mono (self-hosted, with ui-monospace fallback) — tabular instrument readouts: XP, streaks, levels, timestamps, status lines, all score register.
**Body Font:** Inter (variable, self-hosted, 100–900) — the workhorse UI face.

**Character:** Technical at the top, tabular in the numbers, precise underneath — an instrument panel inside a smoked-glass shell. All three faces are self-hosted WOFF2 so the world survives offline PWA installs. No gratuitous uppercase and no futuristic display faces; the hierarchy carries the confidence.

### Hierarchy
- **Display** (Archivo 800, ~57px hero / 24px section): page titles and the one shouting word.
- **Headline** (Archivo 700, ~20px): section headings, card titles.
- **Instrument** (Fragment Mono, 400, tabular): XP, levels, streaks, CTAs, the score register.
- **Body** (Inter, 400, ~0.95rem, 65–75ch max): content and descriptions.
- **Label** (Fragment Mono, 400, 0.22em tracking, uppercase): kickers, chips, status, save readouts, nav labels.

## Layout

The app is a floating glass shell inside the tunnel: 20px breathing room on desktop, 20px rounded frame, hairline border + inner top highlight + layered shadow, translucent smoked glass — **no backdrop-filter on the frame or its ancestors** (a filtered ancestor becomes the containing block for fixed children; the mobile bottom nav and AI sheet would break). Three zones: left instrument rail (collapsible to an icon rail; auto icon-rail at ≤1180px), centre life workspace, right BakaSur pane (collapsible orb; overlay tier on tablet; bottom sheet on mobile). ≤767px: stacked mobile layout with a fixed bottom instrument nav, a sticky header, and the assistant as a bottom sheet. The sidebar is the instrument rail: logo, the Status card (level, save lamp, theme/settings, XP bar), then the tool nav — each tool a glass row, the active one violet-tinted with a tool-tone hairline band. Spacing rhythm: tight groups (8px) inside cards, generous separation (16–24px) between cards, more space above headings than below.

## Elevation & Depth

Depth is smoked glass, not luminous: panes float on the void with backdrop blur, a hairline edge, a top highlight that reads as the glass rim, and a deep soft shadow. The world's own depth comes from the tunnel behind the layered overlay (z0 tunnel → z1 readability overlay → z10+ app). There is no neon glow except at the violet moments. The one authored motion moment is the pane lighting on completion — a quick luminance settle, a star joins the tunnel, the save lamp blinks. Everything else moves on 200ms expo-out for micro-interactions, 360ms for surfaces, and honors `prefers-reduced-motion` with static frames.

### Shadow Vocabulary
- **Glass shadow** (`0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(233,230,242,0.09)`): panes, cards.
- **Violet glow** (`0 0 28px rgba(139,92,246,0.35)`): the active pane, primary CTA, Day Line fill.
- **LED glow** (`0 0 8px <lamp-color>`): the sync indicator dot.

### Named Rules
**The Pane-Light Rule.** Completion animates as a single pane lighting (luminance settle, one quick scale) plus a star joining the tunnel — never confetti or bounce. The save lamp blinks once; the day's headline holds.

## Shapes

Forms are glass: rounded rectangles with a 16px corner radius for panes, 8–10px for buttons and inputs, pills (999px) for chips, status lamps, and the assistant toggle. The instrument header carries a small square LED before its title. Panes read as frosted glass: a faint top-edge highlight, hairline border, translucent body. Borders are 1px hairlines from the paper scale at 7–12% alpha; the active pane raises its border to violet at 40%+.

## Components

### Buttons
- **Shape:** rounded (8px), inline-flex, gap 8px.
- **Primary (btn-primary):** the violet fill — gradient #8b5cf6 → #7c3aed, near-white label (#f4f2ff, 4.56:1), violet glow, top white highlight. Hover lifts 1px and brightens the glow.
- **Ghost (btn-ghost):** paper haze (4% alpha) with hairline border; hover deepens to 8%.
- **Text buttons (btn-text):** paper-muted, weight 600, no border.

### Chips
- **Style:** pill (999px), paper haze background, hairline border, paper-dim text, Fragment Mono 400. Tone chips tint by instrument color (violet/teal/coral/amber/rose/cobalt) with matching alpha backgrounds; small text uses the bright variants for AA.

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
- **PLAYING** — lit violet edge + glow (active surface).
- **HIGH SCORE** — violet pulse (celebration, level-up, cleared board).
- **OUT OF ORDER** — coral edge + diagonal hazard stripe (error, destructive).

### Inputs / Fields
- **Style:** paper haze (5%), hairline border, 10px radius, paper text (16px floor — no iOS focus-zoom).
- **Focus:** violet border, violet ring at 15% alpha, violet caret.
- **Selection:** violet at 40% alpha with paper text.

### Navigation
- **Desktop rail:** the instrument rail — tools stacked with 8px gaps; the active tool is violet-tinted with a tool-tone hairline band on its left edge; inactive are transparent with paper-muted LEDs that brighten on hover. Collapsible to an icon rail (w-20); smooth expo-out collapse animation; auto icon-rail at ≤1180px.
- **Mobile bottom nav:** fixed bar of seven instruments, active one violet; labels in 10px Fragment Mono; ≥44px touch targets.

### Save Lamp (signature component)
The backend's truth in one LED: Observing (teal, lit), Recording… (violet, blinking), Offline (dim), Out of order (coral, click to retry), Offline · local (muted, guest). The dot carries the glow; the label sits beside it.

### Day Line (signature component)
The day's progress as one unbroken track with a running light telling you where now is. The fill is the violet gradient, scaled via transform (no layout animation); the now-marker is a lit vertical rule.

### BakaSur Rail (signature component)
The intelligence presence — the one allowed persistent glow source. Collapsed: a violet orb tab. Expanded: identity header (violet LED + marquee), route-aware suggested questions derived from the REAL ledger (top quest, streak at risk, N open quests…), conversation, input. Mobile: bottom sheet (slide-up, Escape-to-close). The chat contract is `POST /api/v1/assistant/chat` `{message, history(last 6), context{route, route_name, date}}` → `result.reply`; guests get a route-aware local `demoReply` with "· demo data" badges. No new backend.

## Do's and Don'ts

### Do:
- **Do** keep violet the only hot accent family — one primary action per viewport, the pane in front of you.
- **Do** render every stat in Fragment Mono tabular figures (XP, streaks, levels, dates).
- **Do** tint secondary text from the paper scale, never warm gray.
- **Do** let the active pane pull focus: its numbers come forward, the world dims behind the overlay.
- **Do** animate completion as the pane lighting + a star joining the tunnel — quick luminance settle, save lamp blinks.
- **Do** keep the one shouting word at full size on every width.
- **Do** name pane states (OFF / ATTRACT / PLAYING / HIGH SCORE / OUT OF ORDER) so color is never the only signal.
- **Do** render tool colors only as hairline band edges — never as full fields.
- **Do** darken the overlay before ever sacrificing text readability.

### Don't:
- **Don't** use the retired worlds' colors — observatory aurora #6f5bd8, arcade gold #ffd24a, warm amber, or any warm gray.
- **Don't** use gradient text; the brand word is solid paper or solid violet.
- **Don't** bounce or confetti on completion; the pane light is the celebration.
- **Don't** multiply glow across a screen; one hot pane, BakaSur ambient beside it.
- **Don't** add backdrop-filter to the shell frame or any ancestor of fixed children.
- **Don't** use white ink on the bright violet; white sits on the deep fill, dark ink on nothing.
- **Don't** let the background move with cards or cause layout shift; the tunnel is the environment, the shell floats inside it.
