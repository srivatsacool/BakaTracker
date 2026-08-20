#!/usr/bin/env node
/**
 * Reproducible Firefox E2E launcher for BakaTracker.
 *
 * Thin wrapper around scripts/firefox-smoke.mjs — spawns the official
 * @mozilla/firefox-devtools-mcp server (developer preset, dedicated profile)
 * against the local dev server and runs a connectivity smoke (launch Firefox,
 * navigate, snapshot, console). No Chrome involved.
 *
 *   npm run firefox:e2e          # default -> http://localhost:5173
 *   START_URL=... npm run firefox:e2e
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const smoke = path.join(here, 'firefox-smoke.mjs');
const res = spawnSync(process.execPath, [smoke], { stdio: 'inherit', env: process.env });
process.exit(res.status ?? 1);
