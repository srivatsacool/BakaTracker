# Phase 11 — v2.3 · Complete UI/UX Rehaul — DESIGN ONLY

Status: **PLANNED** — design reference. **No implementation until v2.3. Consumes stable v2.1/v2.2 capabilities; does not drive architecture.**

---

## 1. Scope

The complete product UI/UX rehaul — the final visual identity of BakaTracker. Everything in §2 is a v2.3 deliverable; nothing in this phase changes the backend contracts (v2.1/v2.2 already stabilized them).

## 2. Surfaces

- **Landing page** — product story, value props, auth entry (keeps the OAuth flow untouched: `APP_ORIGIN`, CORS, redirects stay exactly as v2.0).
- **Design system** — tokens (color/typography/spacing/radius/shadow), component library, dark/elegant minimal direction consistent with the product soul; glassmorphism surfaces; typography scale for dense data + long-form notes.
- **Navigation** — app shell: sidebar/command palette/contextual; mobile bottom-nav.
- **Dashboard** — overview, XP/Journey state, today's focus, notification center entry.
- **Tasks · Habits · Journal** — existing feature surfaces re-skinned on existing contracts (no contract churn).
- **Notes (final experience)** — Notebook sidebar + Excalidraw workspace + BakaSur contextual actions (from v2.1 tracks 3A/3C), image gallery, page thumbnails, trash view.
- **BakaSur** — chat/action surface over pages (v2.1 actions) + Memory answers (v2.2).
- **Notification center** — in-app history (v2.1 history endpoint), settings surface, permission states, push subscription management.
- **Animations** — motion language (enter/exit, layout, canvas interactions); performance-conscious (no jank on the Excalidraw route).
- **Responsive mobile + PWA** — install flow, offline states, iOS push caveats surfaced honestly.
- **Accessibility** — contrast, focus, keyboard, screen-reader coverage on canvas chrome (Excalidraw has an a11y baseline to build on).
- **States** — empty/loading/error for every surface; onboarding (first-run, notebook bootstrap, notification opt-in flow).

## 3. Rules

- Rehaul consumes v2.1/v2.2 capabilities; **architecture does not bend to UI** (no contract changes to fund visual preferences).
- v2.1 ships functional-minimal shells only (Notes workspace, settings surface); v2.3 is where they become the final product design.
- PWA manifest/theme polish is v2.3; the v2.1 lazy-loading + injectManifest SW changes are prerequisites this phase builds on.

## 4. Deliverables (v2.3, outline)

Design tokens + component library → shell/navigation → feature surfaces → Notes+BakaSur final UX → notification center → motion + a11y + onboarding → PWA polish → release gates (same test suite + visual regression pass).
