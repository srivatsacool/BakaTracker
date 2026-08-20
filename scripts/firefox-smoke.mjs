#!/usr/bin/env node
/**
 * Firefox E2E smoke — proves the Firefox DevTools MCP toolchain works against
 * the local BakaTracker dev server, WITHOUT a Chrome dependency.
 *
 * This is a minimal MCP (stdio, newline-delimited JSON-RPC) client that spawns
 * the official @mozilla/firefox-devtools-mcp server and exercises the
 * `developer` preset tools: navigate -> snapshot -> console.
 *
 * Usage:
 *   npm run firefox:smoke          (or)   node scripts/firefox-smoke.mjs
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const START_URL = process.env.START_URL || 'http://localhost:5173';
const PROFILE_PATH = process.env.FIREFOX_PROFILE || 'D:/Brain/03_Projects/BakaTracker/.e2e/firefox-profile';

// Resolve the npx runner cross-platform. Use `npx` via the shell so Windows
// resolves the `.cmd` shim (direct spawn of a .cmd with piped stdio is
// unreliable — EINVAL). Allowing the shell here is safe: the command string is
// fully static (no user input).
const serverCmd = [
  'npx', '-y', '@mozilla/firefox-devtools-mcp@latest',
  '--',                     // npm exec separator: everything after goes to the package
  '--toolPreset', 'developer',
  '--viewport', '1440x900',
  '--profilePath', PROFILE_PATH, // dedicated BakaTracker E2E profile (persistent auth)
  '--startUrl', START_URL,
].join(' ');
const child = spawn(serverCmd, {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, FORCE_COLOR: '0' },
});

const pending = new Map();
let nextId = 0;
let stderr = '';

function request(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}
/** Fire a JSON-RPC notification (no id — the server never replies). */
function notify(method, params = {}) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
}
async function call(toolName, input = {}) {
  const res = await request('tools/call', { name: toolName, arguments: input });
  if (res.error) throw new Error(`${toolName} error: ${JSON.stringify(res.error)}`);
  const txt = JSON.stringify(res.result).slice(0, 600);
  return txt;
}

child.stderr.on('data', (d) => { stderr += d.toString(); if (stderr.length > 4000) stderr = stderr.slice(-4000); });

const rl = readline.createInterface({ input: child.stdout });
rl.on('line', (line) => {
  let msg; try { msg = JSON.parse(line); } catch { return; }
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg);
  }
});

const results = {};
try {
  // 1. Initialize the MCP session
  await request('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'bakatracker-e2e', version: '1.0.0' },
  });
  notify('notifications/initialized');

  // 2. List available tools (developer preset)
  const tools = await request('tools/list');
  const names = tools.result?.tools?.map((t) => t.name) ?? [];
  results.toolCount = names.length;
  results.hasNavigate = names.includes('navigate_to');
  results.hasSnapshot = names.some((n) => n.includes('snapshot'));
  results.hasScreenshot = names.some((n) => n.includes('screenshot'));

  // 3. Wait for the server to launch Firefox with the start URL
  await new Promise((r) => setTimeout(r, 5000));

  // 4. Navigate / confirm page. Choose a navigate tool by name if present.
  const nav = (names.find((n) => n.includes('navigate')) || names.find((n) => n.startsWith('navigate')));
  if (nav) {
    results.navigate = await call(nav, { url: START_URL }).catch((e) => `ERR ${e.message}`);
  }

  await new Promise((r) => setTimeout(r, 3000));

  // 5. Snapshot the page — find any snapshot tool and return its text.
  const snap = names.find((n) => n.toLowerCase().includes('snapshot') || n.toLowerCase().includes('tree'));
  if (snap) results.snapshot = await call(snap, {}).catch((e) => `ERR ${e.message}`);

  // 6. Console messages
  const con = names.find((n) => n.toLowerCase().includes('console'));
  if (con) results.console = await call(con, {}).catch((e) => `ERR ${e.message}`);

  // 7. Firefox info
  const info = names.find((n) => n.toLowerCase().includes('firefox_info') || n.startsWith('get_firefox'));
  if (info) results.firefoxInfo = await call(info, {}).catch((e) => `ERR ${e.message}`);
} catch (e) {
  results.fatal = e.message;
} finally {
  console.log('=== FIREFOX E2E SMOKE RESULT ===');
  console.log(JSON.stringify({ ...results, stderr: stderr.slice(-500) }, null, 2));
  try { child.stdin.end(); } catch {}
  child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500);
}
