# Contributing to BakaTracker

Thanks for wanting to contribute to BakaTracker v2! This is a small,
opinionated, self-hosted life-RPG. Please keep PRs focused and aligned with
the architecture below.

---

## Code of Conduct

Be kind, be direct, assume good intent. That's it.

## How to Contribute

1. **Fork** the repo and create a feature branch
   (`git checkout -b feat/your-thing`).
2. **Keep changes small** — one concern per PR; squash-commit friendly.
3. **Follow the architecture rules** (below).
4. **Verify locally** before pushing:
   ```bash
   npm run build
   npm run lint
   npm run test:pages
   cd platform && npm test
   ```
5. Open a PR with a clear description and, for UI changes, a screenshot.

## Architecture Rules (v2)

1. **Store actions only.** React components never call the REST API directly —
   all mutations go through Zustand store actions in `src/store/useStore.ts`
   (local cache + sync queue).
2. **Registry over duplication.** New business logic goes into
   `platform/src/tools/` as a registry tool. REST, MCP, and cron all call the
   same registry — never reimplement logic in a transport.
3. **D1 migrations are append-only.** Add a numbered file in
   `platform/migrations/`; never edit an applied migration.
4. **REST for the UI, MCP for AI clients.** The browser must not speak MCP.
5. **Design system.** New UI uses the glass primitives in
   `src/components/shell/` (GlassContainer, GlassSurface, ContextBar, BakaSurRail)
   and tokens from `DESIGN.md`. No legacy light-mode hardcodes
   (`bg-white`, `text-black`, `border-black`).
6. **Never ship dev-only things** — no `localhost` scripts in `index.html`,
   no `REST_DEV_BYPASS` in production config.

## What Not to Do

- Do **not** reintroduce Google Sheets / Apps Script / Auth0 / the Python
  backend — those are v1 legacy, archived in `extra/`.
- Do **not** add global state managers or new transport layers without
  discussion.
- Do **not** commit secrets, `.dev.vars`, or `wrangler.prod.jsonc`.

## Project Docs

- `README.md` — overview, quick start, routes
- `ARCHITECTURE.md` — system design
- `DEPLOYMENT.md` — deploy your own instance
- `SECURITY.md` — security model
- `DESIGN.md` — dark glassmorphism design system
- `PRODUCT.md` — product spec
- `CHANGELOG.md` — release history
