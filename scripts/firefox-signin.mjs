#!/usr/bin/env node
/**
 * Drive the BakaTracker Google OAuth sign-in and VERIFY the session persists.
 *
 * Flow:
 *   1. Launch Firefox with the DEDICATED profile (visible).
 *   2. Navigate to the app.
 *   3. Click "SIGN IN / CREATE YOUR INSTANCE".
 *   4. Follow redirects — leaves the browser at Google consent for you to
 *      complete live in the window.
 *   5. After CONSENT_WAIT seconds, navigate to /today and snapshot to confirm
 *      the authenticated session persisted.
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const START = process.env.START_URL || 'http://localhost:5173';
const CONSENT_WAIT = Number(process.env.CONSENT_WAIT || 120); // seconds for manual Google consent
const PROFILE = process.env.FIREFOX_PROFILE || 'D:/Brain/03_Projects/BakaTracker/.e2e/firefox-profile';

const cmd = ['npx','-y','@mozilla/firefox-devtools-mcp@latest','--','--toolPreset','developer','--viewport','1440x900','--profilePath',PROFILE,'--startUrl','about:blank'].join(' ');
const child = spawn(cmd, { stdio: ['pipe','pipe','pipe'], shell: true, env: { ...process.env, FORCE_COLOR: '0' } });
const pending = new Map(); let nextId = 0;
const rl = readline.createInterface({ input: child.stdout });
rl.on('line', (l) => { try { const m = JSON.parse(l); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } } catch {} });
let errBuf = ''; child.stderr.on('data', (d) => { errBuf += d; });
const request = (method, params={}) => new Promise((res, rej) => { const id = ++nextId; pending.set(id,{resolve:res,reject:rej}); child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',id,method,params})}\n`); });
const notify = (method, params={}) => child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',method,params})}\n`);
async function call(name, input={}) { const r = await request('tools/call', { name, arguments: input }); return r?.content?.[0]?.text ?? JSON.stringify(r); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function snapText(snapTool) { try { const t = await call(snapTool, {}); return JSON.parse(t)?.content?.[0]?.text ?? t; } catch { return ''; } }

const out = {};
async function main() {
  await request('initialize', { protocolVersion:'2024-11-05', capabilities:{}, clientInfo:{ name:'bt-signin', version:'1' } });
  notify('notifications/initialized');
  await wait(3000);
  const tl = await request('tools/list'); const names = tl.tools.map((t)=>t.name);
  out.tools = names.filter((n)=>/(navigate|snapshot|click|press|input|type|focus|script)/.test(n));
  const nav = names.find((n)=>n.includes('navigate_to')||n.includes('navigate'));
  const snap = names.find((n)=>n.includes('snapshot'));
  const click = names.find((n)=>n.includes('click'));

  // 1. open app
  await call(nav, { url: START }); await wait(5000);
  let page = await snapText(snap);
  out.openedAt = START;
  out.landingIsApp = /BakaTracker home/.test(page) ? 'landing' : 'not-landing?';
  // find the SIGN IN button uid
  const m = page.match(/button "SIGN IN \/ CREATE YOUR INSTANCE"/) && page.match(/uid=([a-zA-Z0-9]+) button "SIGN IN/) ;
  // cheaper: find a button whose label contains SIGN IN
  const re = /uid=([a-zA-Z0-9]+) button "([^"]*SIGN IN[^"]*)"/i;
  const mm = page.match(re);
  out.signinUid = mm ? mm[1] : null; out.signinLabel = mm ? mm[2] : null;

  if (mm && click) {
    out.clicking = 'click uid ' + mm[1];
    await call(click, { refId: mm[1] });   // try refId (uid)
    await wait(6000);
    let after = await snapText(snap);
    const urlRe = after.match(/URL:\s*([^\s]+)/) || after.match(/(about:|https?:\/\/[^\s"]+)/);
    out.afterClick = after.slice(0, 700);
    out.afterClickUrl = urlRe ? urlRe[1] : '(see snapshot)';
  } else {
    out.clicking = 'SIGN IN button not found — landing snapshot head: ' + page.slice(0, 400);
  }

  // Leave browser open for manual consent, then verify /today.
  out.willWaitSeconds = CONSENT_WAIT;
  console.log(JSON.stringify(out, null, 2));
  console.error('--- WAITING', CONSENT_WAIT, 's for manual Google consent in the Firefox window, then verifying /today ---');
  console.error(errBuf.slice(-800));
  await wait(CONSENT_WAIT * 1000);

  // verify authenticated /today
  await call(nav, { url: START + '/today' }); await wait(5000);
  const today = await snapText(snap);
  const todayJson = { authenticated: !/BakaTracker home|Landing page navigation/.test(today), head: today.slice(0, 900) };
  console.log(JSON.stringify({ verifiedToday: todayJson }, null, 2));
  child.kill();
}
main().catch((e)=>{ out.fatal=e.message; console.log(JSON.stringify(out,null,2)); child.kill(); });
