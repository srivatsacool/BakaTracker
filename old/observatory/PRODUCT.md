# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Gamification-minded individuals (ADHD-friendly, self-improvement) who track habits, tasks, journal entries, and RPG-style character progression. Primary context: daily use on desktop and mobile browsers as a PWA.

## Product Purpose

Turn daily life tasks, habits, and journaling into an RPG progression system. Users earn XP, level up attributes, maintain streaks, and visualize their journey. Aims to be minimal, self-hostable, and zero-cost.

## Positioning

Open-source, local-first life RPG planner with MCP integration for AI assistants, deployed on Cloudflare's free tier. The mechanism is gamification-as-operating-system: life becomes the quest log.

## Operating Context

- Daily check-ins (habits, tasks, journal) — sub-30-second interactions
- Weekly reviews via Journey analytics (heatmaps, XP charts, RPG stats)
- PWA install on desktop/mobile for app-like experience
- MCP protocol allows AI assistants (Cursor, Claude, ChatGPT) to read/write data

## Capabilities and Constraints

- **Features:** Habits (5 tracker types), Kanban tasks, Eisenhower matrix, Today focus board, Journal, Journey analytics, Visual Notes (Excalidraw), RPG leveling system
- **Stack:** React 19 + Vite + Tailwind CSS v4 + TypeScript + Cloudflare Workers/D1/R2/KV
- **Auth:** Google OAuth (via the Worker's own OAuth provider; optional — works offline as guest)
- **Constraints:** Cloudflare free tier, PWA with service worker, must remain offline-capable

## Brand Commitments

- Name: **BakaTracker** (baka = playful Japanese "fool/idiot" — self-deprecating, fun)
- Voice: Casual, playful, slightly irreverent
- Logo: `/logo.png` (must be preserved)
- Tagline: "Track your life without turning it into a project"
- Visual direction (chosen 2026-08-16 on the roll board, seed 2efaae3b —
  reroll 1 after the arcade was retired; steer: dark glassmorphism): **The
  Night Observatory** — your life as a night of observation, where every
  tool is a glass instrument panel lit from behind and the daily check-in
  is one quiet observation. Today is the pane you read each morning,
  Habits is the consistency instrument, Journey is the night sky's charts,
  Notes is the diary pane. The dome sits at deep void — dark glass panes
  floating on black, the horizon aurora breathing, exactly one pane hot:
  the instrument in front of you. Deep-void walls, instrument-white
  readouts, aurora violet (#6f5bd8) as the only lit color, tool tones as
  hairline band edges, Fragment Mono score readouts, named pane states
  (OFF / ATTRACT / PLAYING / HIGH SCORE / OUT OF ORDER), the Day Line as
  one unbroken track with a running light. The daily check-in is one
  observation.

## Evidence on Hand

- Real feature set with 7 integrated tools
- Working production deployment at bakatracker.buildsrivatsa.qzz.io
- MIT-licensed GitHub repo at github.com/srivatsacool/BakaTracker
- Real users using the gamification system

## Product Principles

1. **Minimal friction** — daily check-ins under 30 seconds
2. **Local-first, cloud-synced** — works offline, syncs when possible
3. **Gamification as OS** — life events become XP, streaks become stats
4. **Zero cost** — free tier infrastructure, no per-seat fees
5. **AI-native** — MCP protocol lets assistants participate

## Accessibility & Inclusion

Mobile-responsive PWA, keyboard-navigable, screen-reader compatible form inputs. Dark mode is the primary aesthetic.
