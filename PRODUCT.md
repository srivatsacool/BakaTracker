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
