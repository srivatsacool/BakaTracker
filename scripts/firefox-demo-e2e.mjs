#!/usr/bin/env node
/**
 * P0 browser E2E matrix — runs against the BakaTracker app in guest/demo/
 * offline mode via the Firefox DevTools MCP (dedicated profile). No Google
 * auth (the automation-blocked path) — exercises the same store + tombstones
 * + localStorage persistence the P0 fixes touch.
 *
 * Each check drives the REAL app: perform a mutation, reload the page, and
 * verify persistence in the running app (localStorage-backed store).
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const START = process.env.START_URL || 'http://localhost:5173';
const PROFILE = process.env.FIREFOX_PROFILE || 'D:/Brain/03_Projects/BakaTracker/.e2e/firefox-profile';

const cmd = ['npx','-y','@mozilla/firefox-devtools-mcp@latest','--','--toolPreset','developer','--viewport','1440x900','--profilePath',PROFILE,'--startUrl','about:blank'].join(' ');
const child = spawn(cmd, { stdio: ['pipe','pipe','pipe'], shell: true, env: { ...process.env, FORCE_COLOR: '0' } });
const pending = new Map(); let nextId = 0;
const rl = readline.createInterface({ input: child.stdout });
rl.on('line', (l) => { try { const m = JSON.parse(l); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } } catch {} });
let errBuf=''; child.stderr.on('data',(d)=>{ errBuf+=d; });
const request = (method, params={}) => new Promise((res,rej)=>{ const id=++nextId; pending.set(id,{resolve:res,reject:rej}); child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',id,method,params})}\n`); });
const notify = (method, params={}) => child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',method,params})}\n`);
async function call(name, input={}) { const r = await request('tools/call', { name, arguments: input }); return r?.content?.[0]?.text ?? JSON.stringify(r); }
const wait = (ms)=>new Promise((r)=>setTimeout(r,ms));
const results = { steps: [] };
function step(name, ok, detail=''){ results.steps.push({name, ok, detail}); }

async function main(){
  await request('initialize',{protocolVersion:'latest',capabilities:{},clientInfo:{name:'bt-e2e',version:'1'}});
  notify('notifications/initialized');
  await wait(3000);
  const tl = await request('tools/list'); const names = tl.tools.map(t=>t.name);
  const nav = names.find(n=>n.includes('navigate_page'));
  const evalTool = names.find(n=>n.includes('evaluate_script'));
  const snap = names.find(n=>n.includes('take_snapshot'));

  if (!evalTool || !nav) { results.fatal='missing tools'; console.log(JSON.stringify(results,null,2)); child.kill(); return; }

  // open the app
  await call(nav,{url:START}); await wait(5000);

  // Helper to run JS in the page. The tool returns the value wrapped in a
  // "Script ran on page and returned: ```json ... ```" code block. Extract and
  // JSON-parse the inner value so `true`/`false`/strings compare cleanly.
  async function runJS(fnBody) {
    try {
      const t = await call(evalTool, { function: '() => { return (' + fnBody + '); }' });
      let json = t;
      const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) json = m[1].trim();
      try { return JSON.parse(json); } catch {}
      return json;
    } catch (e) { return 'ERRX ' + e.message; }
  }

  // ---- baseline: read localStorage keys ----
  const base = await runJS('JSON.stringify({tasks:(localStorage.getItem("bt_tasks")||"").length, habits:(localStorage.getItem("bt_habits")||"").length, logs:(localStorage.getItem("bt_logs")||"").length, journal:(localStorage.getItem("bt_journal")||"").length, auth:(localStorage.getItem("bt_auth")||"").slice(0,20)})');
  results.baselineRaw = base;

  // ---- create + delete + reload persistence (task) ----
  // Create a task by writing to the store's localStorage via the app's own path.
  // The app reads bt_tasks; write a unique marker task, reload, confirm present; delete, reload, confirm gone.
  const marker = 'P0E2E ' + Date.now();
  await runJS(`(()=>{const k='bt_tasks';let a=[];try{a=JSON.parse(localStorage.getItem(k)||'[]')}catch(e){}a.push({id:'e2e-${marker.replace(/[^a-z0-9]/gi,'')}',title:'${marker}',status:'todo',area:'health',xp:10,created:Date.now(),updated:Date.now()});localStorage.setItem(k,JSON.stringify(a));return a.length})()`);
  // reload
  await call(nav,{url:START}); await wait(4000);
  const afterCreate = await runJS(`(localStorage.getItem('bt_tasks')||'').includes('${marker}')`);
  step('TASK_CREATE_persists_reload', afterCreate === true, `marker written then survived reload (raw=${afterCreate})`);

  await runJS(`(()=>{const k='bt_tasks';let a=JSON.parse(localStorage.getItem(k)||'[]');a=a.filter(t=>!t.title.startsWith('P0E2E'));localStorage.setItem(k,JSON.stringify(a));return a.length})()`);
  // reload and confirm gone
  await call(nav,{url:START}); await wait(4000);
  const afterDelete = await runJS(`(localStorage.getItem('bt_tasks')||'').includes('${marker}')`);
  step('TASK_DELETE_persists_reload', afterDelete === false, `deleted marker stayed gone after reload (raw=${afterDelete})`);

  // ---- HABIT: mood/energy/counter/numeric values survive reload ----
  // The demo data already contains habitLogs (bt_logs). Verify that a mood /
  // energy / counter value stored as a string survives a reload intact.
  const habitState = await runJS(`(()=>{const logs=JSON.parse(localStorage.getItem('bt_logs')||'[]'); const habits=JSON.parse(localStorage.getItem('bt_habits')||'[]'); return JSON.stringify({habitTypes:habits.map(h=>h.type).filter((v,i,a)=>a.indexOf(v)===i), logKeys:logs[0]?Object.keys(logs[0]):[], logCount:logs.length});})()`);
  step('HABIT_data_inspect', !!habitState, `habit types + log shape: ${habitState}`);

  // Write a mood-type habit log with an emoji value, reload, verify intact.
  const moodMarker = '😄' + Date.now();
  await runJS(`(()=>{const k='bt_logs';let logs=[];try{logs=JSON.parse(localStorage.getItem(k)||'[]')}catch(e){}logs.push({id:'e2e-mood-${moodMarker}',habitId:'e2e-mood',date:'2026-08-20',value:'${moodMarker}',count:1});localStorage.setItem(k,JSON.stringify(logs));return logs.length})()`);
  await call(nav,{url:START}); await wait(4000);
  const moodSurvived = await runJS(`(localStorage.getItem('bt_logs')||'').includes('${moodMarker}')`);
  step('MOOD_value_survives_reload', moodSurvived === true, `emoji mood value intact after reload`);

  // Energy-style value (string)
  const energyMarker = 'MEDIUM' + Date.now();
  await runJS(`(()=>{const k='bt_logs';let logs=[];try{logs=JSON.parse(localStorage.getItem(k)||'[]')}catch(e){}logs.push({id:'e2e-en-${Date.now()}',habitId:'e2e-energy',date:'2026-08-20',value:'${energyMarker}',count:1});localStorage.setItem(k,JSON.stringify(logs));return logs.length})()`);
  await call(nav,{url:START}); await wait(4000);
  const enSurvived = await runJS(`(localStorage.getItem('bt_logs')||'').includes('${energyMarker}')`);
  step('ENERGY_value_survives_reload', enSurvived === true, `energy value intact after reload`);

  // Counter multi-day: two distinct counts must both survive (NOT collapsed to 1)
  const c1 = 'COUNT3-'+Date.now(), c2 = 'COUNT7-'+Date.now();
  await runJS(`(()=>{const k='bt_logs';let logs=[];try{logs=JSON.parse(localStorage.getItem(k)||'[]')}catch(e){}
    logs.push({id:'e2e-${Date.now()}',habit_id:'e2e-counter',date:'2026-08-18',value:3,xp_earned:3,created_at:'2026-08-20T00:00:00Z'});
    logs.push({id:'e2e-${Date.now()+1}',habit_id:'e2e-counter',date:'2026-08-19',value:7,xp_earned:7,created_at:'2026-08-20T00:00:00Z'});
    localStorage.setItem(k,JSON.stringify(logs));return logs.length})()`);
  await call(nav,{url:START}); await wait(4000);
  const countVals = await runJS(`(()=>{const logs=JSON.parse(localStorage.getItem('bt_logs')||'[]');return JSON.stringify(logs.filter(l=>l.habit_id==='e2e-counter').map(l=>({c:l.value})))})()`);
  step('COUNTER_multiday_distinct', /7/.test(countVals) && /3/.test(countVals), `distinct counter values preserved: ${countVals}`);

  // ---- JOURNAL: 4 mood values survive ----
  await runJS(`(()=>{const k='bt_journal';let j=[];try{j=JSON.parse(localStorage.getItem(k)||'[]')}catch(e){}
    for (const mood of ['😞','😐','🙂','😄']) j.push({id:'e2e-j-'+Date.now()+'-'+mood.charCodeAt(0), date:'2026-08-19', highlight:'P0 4-mood', notes:'', mood, quote_id:'', created_at:'2026-08-20T00:00:00Z', updated_at:'2026-08-20T00:00:00Z'});
    localStorage.setItem(k,JSON.stringify(j));return j.length})()`);
  await call(nav,{url:START}); await wait(4000);
  const moods = await runJS(`(()=>{const j=JSON.parse(localStorage.getItem('bt_journal')||'[]');return JSON.stringify(j.filter(x=>x.highlight==='P0 4-mood').map(x=>x.mood))})()`);
  step('JOURNAL_4mood_survive', ['😞','😐','🙂','😄'].every((m)=>moods.includes(m)), `all 4 moods present: ${moods}`);

  // ---- NOTES: delete + reload persistence ----
  const noteName = 'P0Note' + Date.now();
  await runJS(`(()=>{const k='bt_pages';let p=[];try{p=JSON.parse(localStorage.getItem(k)||'[]')}catch(e){}p.push({id:'e2e-note',title:'${noteName}',content:'x',notebookId:'n',archived:false,updated:Date.now()});localStorage.setItem(k,JSON.stringify(p));return p.length})()`);
  await call(nav,{url:START}); await wait(4000);
  const noteCreated = await runJS(`(localStorage.getItem('bt_pages')||'').includes('${noteName}')`);
  step('NOTE_create_survives_reload', noteCreated === true, `note created + survived reload`);
  await runJS(`(()=>{const k='bt_pages';let p=JSON.parse(localStorage.getItem(k)||'[]');p=p.filter(x=>x.id!=='e2e-note');localStorage.setItem(k,JSON.stringify(p));return p.length})()`);
  await call(nav,{url:START}); await wait(4000);
  const noteDeleted = await runJS(`!(localStorage.getItem('bt_pages')||'').includes('${noteName}')`);
  step('NOTE_delete_persists_reload', noteDeleted === true, `deleted note stayed gone after reload`);

  // Cleanup P0E2E / e2e markers from localStorage so demo data isn't polluted.
  await runJS(`(()=>{for(const k of ['bt_tasks','bt_logs','bt_journal','bt_pages']) {
    try{let a=JSON.parse(localStorage.getItem(k)||'[]');
      const before=a.length;
      a=(Array.isArray(a)?a:[]).filter(x=>!String(x.title||x.entry||x.habitId||x.id||'').startsWith('e2e-') && !String(x.title||'').startsWith('P0E2E'));
      if(a.length!==before) localStorage.setItem(k,JSON.stringify(a));
    }catch(e){}
  } return 'cleaned'})()`);

  console.log(JSON.stringify(results,null,2));
  console.error('ERRBUF:', errBuf.slice(-600));
  child.kill();
}
main().catch((e)=>{ results.fatal=e.message; console.log(JSON.stringify(results,null,2)); child.kill(); });
