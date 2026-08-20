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
5. **Browser E2E runs in Firefox.** See "Browser E2E / visual QA" below. Do
   **not** use Chrome/Chromium for the project's browser automation.
6. Open a PR with a clear description and, for UI changes, a screenshot.

## Browser E2E / Visual QA (Firefox)

The project's browser E2E and visual-inspection workflow runs in **Firefox**
via [@mozilla/firefox-devtools-mcp](https://github.com/mozilla/firefox-devtools-mcp)
(repository name `mozilla/firefox-devtools-mcp`). This replaces any Chrome /
Playwright-Chromium flow used during development.

- **Package:** `@mozilla/firefox-devtools-mcp@latest`
- **Run:** `npx @mozilla/firefox-devtools-mcp@latest`
- **Preset:** `developer` (pages, snapshot, input, screenshot, console, network,
  script, debugging, …)
- **Requirements:** Node >= 20.19.0, Firefox 100+ (auto-detected; set
  `--firefoxPath` if not found). geckodriver is auto-downloaded by the MCP.
- **Dedicated profile:** always use a dedicated automation profile, never a
  personal browsing profile (the MCP's `--autoProfile` keeps a per-browser
  persistent profile under `~/.firefox-devtools-mcp/`).

Smoke-check that the Firefox MCP launches and reaches the local app:

```bash
# with the dev server running on :5173
npm run firefox:e2e          # == node scripts/firefox-smoke.mjs
START_URL=http://localhost:5173 node scripts/firefox-smoke.mjs
```

To use the full Firefox MCP tool set inside Hermes, the server is registered
in Hermes as `firefox-devtools` (visible as `mcp_firefox_devtools_*` tools);
those load at Hermes session startup. Developer hint — start it manually:

```bash
npx @mozilla/firefox-devtools-mcp@latest \
  --toolPreset developer \
  --viewport 1440x900 \
  --autoProfile \
  --startUrl http://localhost:5173
```

Firefox is run **visibly** (no `--headless`) for screenshots and interactive
E2E. For debugging failures prefer Firefox tooling (`take_snapshot`,
`screenshot_page`, `list_console_messages`, `list_network_requests`) over
opening Chromium DevTools.

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
