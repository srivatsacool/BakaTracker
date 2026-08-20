#!/usr/bin/env node
/**
 * Drive the BakaTracker OAuth login round-trip through Firefox (dedicated
 * profile) and evidence-check where the flow actually lands.
 *
 *   START_URL=... node scripts/firefox-login.mjs
 *
 * Steps: open app -> find SIGN IN link -> follow it -> follow any Google
 * /OAuth redirects -> report final URL + page snapshot text.
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const START_URL = process.env.START_URL || 'http://localhost:5173';
const PROFILE_PATH = process.env.FIREFOX_PROFILE || 'D:/Brain/03_Projects/BakaTracker/.e2e/firefox-profile';

const cmd = [
  'npx', '-y', '@mozilla/firefox-devtools-mcp@latest', '--',
  '--toolPreset', 'developer', '--viewport', '1440x900',
  '--profilePath', PROFILE_PATH, '--startUrl', 'about:blank',
].join(' ');
const child = spawn(cmd, { stdio: ['pipe', 'pipe', 'pipe'], shell: true, env: { ...process.env, FORCE_COLOR: '0' } });

const pending = new Map(); let nextId = 0;
const rl = readline.createInterface({ input: child.stdout });
rl.on('line', (l) => { try { const m = JSON.parse(l); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); (m.error ? reject(new Error(m.error.message)) : resolve(m.result)); } } catch {} });
let errBuf = ''; child.stderr.on('data', (d) => { errBuf += d; });

function request(method, params = {}) { return new Promise((res, rej) => { const id = ++nextId; pending.set(id, { resolve: res, reject: rej }); child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`); }); }
function notify(method, params = {}) { child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`); }
async function call(name, input = {}) { const r = await request('tools/call', { name, arguments: input }); const t = r?.content?.[0]?.text ?? JSON.stringify(r); return t; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function textFrom(snap) { try { const o = JSON.parse(snap); return o?.content?.[0]?.text ?? ''; } catch { return snap || ''; } }

const results = {};
async function main() {
  const names = (await request('tools/list')).tools.map((t) => t.name);
  results.tools = names.filter((n) => /navigat|snapshot|screenshot/.test(n));
  await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'bt-login', version: '1' } });
  notify('notifications/initialized');
  await wait(5000);

  const nav = names.find((n) => n.includes('navigate_to') || n.includes('navigate'));
  const snap = names.find((n) => n.includes('snapshot'));
  const sshot = names.find((n) => n.includes('screenshot'));
  const click = names.find((n) => n.includes('click'));
  const exec = names.find((n) => /session_.*?script|evaluate|exec/.test(n));

  // 1. open the app
  results.step1 = await call(nav, { url: START_URL }); await wait(4000);
  let page = await textFrom(await call(snap, {})); results.landing = page.slice(0, 900);

  // find the sign-in link href from the snapshot
  const m = page.match(/href="([^"]*login[^"]*)"/i) || page.match(/href="([^"]*auth[^"]*)"/i) || page.match(/href="([^"]*sign[^"]*)"/i) || page.match(/\[([A-Za-z]+)`?([^\]]*?)\]([^)]*)/i);
  results.signinHint = m ? m[0] : '(none)';
  results.fullLanding = page.slice(0, 3000);

  console.log(JSON.stringify(results, null, 2));
  console.error('--- MCP STDERR ---\n' + errBuf.slice(-1500));
  child.kill();
}
main().catch((e) => { results.fatal = e.message; console.log(JSON.stringify(results, null, 2)); child.kill(); });
