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
- BakaSur AI assistant for contextual help and suggestions

## Capabilities and Constraints
- **Features:**
  - **Habits** (5 tracker types: checkbox, counter, mood, energy, numeric) with streaks and analytics
  - **Kanban Tasks** with area tags, due dates, star/today toggle, and completion XP
  - **Eisenhower Matrix** — quadrant-based priority sorting (do/schedule/delegate/delete)
  - **Today** — daily cockpit with score breakdown, habit status, journal highlight, and LVL/XP
  - **Journal** — daily entries with highlight, mood (3 levels), notes, quotes, and streak tracking
  - **Journey** — RPG progression: character stats, heatmap, weekly stats, streaks, insights, export
  - **Visual Notes** — Excalidraw-powered notebook with page CRUD, archive, duplicate, restore, reorder
  - **BakaSur AI Assistant** — route-aware chat with context from the real ledger; guest demo mode with local suggestions
  - **Notes AI Actions** — summarize, explain, ask, extract-tasks, extract-concepts, generate-questions (server-side)
  - **Notifications** — notification settings UI (opt-in, tone, quiet hours), web push subscription, notification engine
  - **File Uploads** — R2-backed file storage (upload, list, download, delete)
  - **Export Life Report** — full data export modal
  - **First Run Setup/Wizard** — onboarding flow for new users
  - **Theme System** — light/dark toggle with accent color customization
  - **Sync** — whole-state D1 push/pull; Save Lamp shows backend truth (Observing / Recording / Offline / Error)
  - **Offline Support** — PWA with service worker, demo mode for guest access
  - **App Tour** — interactive walkthrough for first-time users
  - **RPG Leveling** — XP, levels, 5 attributes (Discipline, Health, Knowledge, Creativity, Career)
- **Stack:** React 19 + Vite + Tailwind CSS v4 + TypeScript + Cloudflare Workers/D1/R2/KV
- **Auth:** Google OAuth (via the Worker's own OAuth provider; optional — works offline as guest)
- **Constraints:** Cloudflare free tier, PWA with service worker, must remain offline-capable

## Brand Commitments

- Name: **BakaTracker** (baka = playful Japanese "fool/idiot" — self-deprecating, fun)
- Voice: Casual, playful, slightly irreverent
- Logo: `/logo.png` (must be preserved)
- Tagline: "Track your life without turning it into a project"
- Visual direction (2026-08-16 evening master brief): **The Light Tunnel** — your life as a personal life operating system floating inside an animated violet-indigo fibre-optic world (the repo's React Bits LightTunnel port, ogl/WebGL), with a layered dark readability overlay between the world and the app so text always wins. The application is a floating smoked-glass shell — rounded, hairline-edged, inner highlight, layered shadow, breathing room around it, no backdrop-filter on the frame — in three zones: left instrument rail (Today/Tasks/Habits/Matrix/Journal/Journey/Notes + level, sync, settings, profile; collapsible icon rail), centre life workspace, right BakaSur intelligence pane (collapsible; route-aware suggestions over the real ledger; guest demo fallback). Violet (#8b5cf6) primary family (lavender #a78bfa text, deep #7c3aed fills), lavender/blue/muted-cyan secondary, restrained green/amber/red semantics; tool tones as hairline band edges; Fragment Mono score readouts; Archivo/Fragment Mono/Inter self-hosted; glow scarce (BakaSur, active item, XP, completion); motion physical + restrained, prefers-reduced-motion honored (tunnel becomes a static indigo frame). The daily check-in is one lit pane in the tunnel.

## Evidence on Hand

- Real feature set with 7 integrated tools + AI assistant + notifications + file storage
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
