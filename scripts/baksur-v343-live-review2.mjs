#!/usr/bin/env node
/**
 * V3.4.3 LIVE visual review — corrected for FirstRunWizard + real selectors
 */
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'fs'

const SCREENSHOT_DIR = 'visual-qa/baksur-v343-live'
const BASE = 'http://localhost:5173'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const passed = [], failed = []
function check(label, ok, detail='') {
  if (ok) { passed.push(label); console.log(`  ✔ ${label}${detail?' — '+detail:''}`)}
  else { failed.push(label); console.log(`  ✘ ${label}${detail?' — '+detail:''}`)}
}

async function dockState(page) {
  return page.evaluate(() => document.querySelector('#bakasur-rail svg[data-baksur-state]')?.getAttribute('data-baksur-state') ?? document.querySelector('[data-baksur-state]')?.getAttribute('data-baksur-state') ?? 'NOT_FOUND')
}
async function railSignal(page) {
  return page.evaluate(() => document.querySelector('#bakasur-rail')?.getAttribute('data-baksur-signal') || null)
}
async function shot(page, name) {
  const p = `${SCREENSHOT_DIR}/${name}.png`
  await page.screenshot({ path: p, fullPage: false })
  console.log(`  📸 ${p}`)
  return p
}

const browser = await chromium.launch()
let ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1
})
await ctx.addInitScript(() => {
  localStorage.setItem('bt_first_run', 'done')
  localStorage.setItem('bt_demo_mode', 'true')
  localStorage.setItem('bt_intro_seen', 'true')
  localStorage.setItem('bt_assistant_collapsed', 'true')
  localStorage.setItem('bt_sidebar_collapsed', 'false')
})
let page = await ctx.newPage()

console.log('\n== LOADING LIVE APP (wizard dismissed) ==')
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(1500)
// If wizard still visible, dismiss via localStorage + reload or Escape
let wizardVisible = await page.evaluate(() => !!document.querySelector('[role="dialog"]'))
if (wizardVisible) {
  console.log('  wizard still open — dismissing')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  wizardVisible = await page.evaluate(() => !!document.querySelector('[role="dialog"]'))
  if (wizardVisible) {
    await page.evaluate(() => { localStorage.setItem('bt_first_run','done'); location.reload() })
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(()=>{})
  }
}
wizardVisible = await page.evaluate(() => !!document.querySelector('[role="dialog"]'))
check('wizard dismissed', !wizardVisible)
await page.waitForTimeout(3500) // boot-quiet
check('app loaded', page.url().includes('/today'))
await shot(page, '01-today-desktop-1440')

console.log('\n== NAVIGATION & STORE ==')
for (const path of ['/tasks','/habits','/journal','/journey','/notes']) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  await shot(page, `02-${path.replace('/','')}-desktop-1440`)
  check(`nav ${path}`, page.url().includes(path))
}

console.log('\n== COLLAPSED DOCK & LABEL ==')
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3000)
// Ensure collapsed — close expanded rail if open (persists from prior session)
let expandedNow = await page.evaluate(() => !!document.querySelector('.assistant-rail-expanded'))
if (expandedNow) {
  const cb = page.locator('.assistant-rail-expanded button[aria-label*="Close"]').first()
  if (await cb.isVisible().catch(()=>false)) { await cb.click(); await page.waitForTimeout(700) }
  else { await page.evaluate(()=> localStorage.setItem('bt_bakasur_collapsed','true')); await page.reload({ waitUntil:'networkidle' }); await page.waitForTimeout(1500) }
}
await shot(page, '03-today-collapsed-dock')
const dockInfo = await page.evaluate(() => {
  const rail = document.querySelector('#bakasur-rail')
  if (!rail) return { err: 'no #bakasur-rail' }
  // label is vertical inside collapsed dock — find any text node
  const label = rail.querySelector('.assistant-rail-label, [class*="label"]') ||
                Array.from(rail.querySelectorAll('*')).find(el => el.textContent?.trim() === 'BAKASUR')
  const svg = rail.querySelector('svg[data-baksur-state], svg')
  const lr = label?.getBoundingClientRect()
  const rr = rail.getBoundingClientRect()
  const svgR = svg?.getBoundingClientRect()
  return {
    railClasses: rail.className,
    railWidth: Math.round(rr.width), railLeft: Math.round(rr.left), railRight: Math.round(rr.right),
    labelExists: !!label, labelText: label?.textContent?.trim()?.slice(0,20),
    labelWidth: lr ? Math.round(lr.width) : null, labelHeight: lr ? Math.round(lr.height) : null,
    labelLeft: lr ? Math.round(lr.left) : null, labelRight: lr ? Math.round(lr.right) : null,
    svgExists: !!svg, svgState: svg?.getAttribute('data-baksur-state'),
    svgWidth: svgR ? Math.round(svgR.width) : null,
    viewportWidth: window.innerWidth,
    signal: rail.getAttribute('data-baksur-signal'),
    html: rail.outerHTML.slice(0,500)
  }
})
console.log('  dockInfo:', JSON.stringify(dockInfo, null, 2))
if (dockInfo.labelExists) {
  check('label BAKASUR present', dockInfo.labelText?.includes('BAKA'))
  check('label inside dock', dockInfo.labelLeft >= dockInfo.railLeft - 2)
  check('no page overflow', dockInfo.labelRight <= dockInfo.viewportWidth + 2, `labelRight=${dockInfo.labelRight} vp=${dockInfo.viewportWidth}`)
} else {
  check('label rendered', false, 'label not found — see html snippet')
}
check('dock character rendered', !!dockInfo.svgExists, `state=${dockInfo.svgState} w=${dockInfo.svgWidth}`)

console.log('\n== EXPANDED RAIL & HEADER CHARACTER ==')
let dockBtn = page.locator('#bakasur-rail button.assistant-rail-expand, #bakasur-rail button').first()
let btnVisible = await dockBtn.isVisible().catch(()=>false)
console.log(`  dock button visible: ${btnVisible}`)
if (btnVisible) {
  await dockBtn.click()
  await page.waitForTimeout(800)
  await shot(page, '04-expanded-rail-desktop')
  const expanded = await page.evaluate(() => !!document.querySelector('#bakasur-rail.cabinet.assistant-rail-expanded, .assistant-rail-expanded'))
  check('expanded rail visible', expanded)
  const headerSvg = await page.evaluate(() => !!document.querySelector('#bakasur-rail svg[data-baksur-state]'))
  check('header character visible', headerSvg)
  // USER_OPENED check will follow — close first then reopen to test signal
  const closeBtn = page.locator('#bakasur-rail button[aria-label*="Close"]').first()
  if (await closeBtn.isVisible().catch(()=>false)) { await closeBtn.click(); await page.waitForTimeout(600) }
}

console.log('\n== DESKTOP REACTIONS (real mutations) ==')
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3500)
let restState = await dockState(page)
let restSignal = await railSignal(page)
check('rest IDLE before event', restState==='IDLE', `state=${restState} signal=${restSignal}`)

// QUEST_COMPLETED via Today Complete button
let clicked = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label^="Complete"]')
  if (!btn) return { found: false, labels: Array.from(document.querySelectorAll('button')).map(b=>b.getAttribute('aria-label')||b.textContent?.trim()?.slice(0,30)).slice(0,10) }
  btn.click(); return { found: true, label: btn.getAttribute('aria-label') }
})
console.log('  quest click:', JSON.stringify(clicked))
if (clicked?.found) {
  await page.waitForTimeout(1200)
  let sig = await railSignal(page), st = await dockState(page)
  await shot(page, '05-quest-completed-react')
  check('QUEST_COMPLETED fired', sig==='QUEST_COMPLETED', `signal=${sig} state=${st}`)
  for(let i=0;i<20;i++){ if((await railSignal(page))===null) break; await page.waitForTimeout(400) }
  check('quest reaction decayed', (await railSignal(page))===null)
} else {
  check('QUEST_COMPLETED', false, 'no Complete button')
}

// HABIT — try multiple selectors
await page.goto(`${BASE}/habits`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3500)
let habitRes = await page.evaluate(() => {
  const cands = Array.from(document.querySelectorAll('button'))
  const habitBtn = cands.find(b => {
    const t=(b.textContent||'').toLowerCase()
    return t.includes('check')||t.includes('log')||b.getAttribute('aria-label')?.toLowerCase().includes('habit')
  })
  // fallback: first checkbox-like button
  const fallback = document.querySelector('[data-testid*="habit"] button, input[type="checkbox"]')
  const target = habitBtn || fallback
  if (!target) return { found:false, allBtns: cands.slice(0,8).map(b=>b.textContent?.trim()?.slice(0,40)) }
  if (target instanceof HTMLElement) target.click()
  // also try clicking the habit row itself
  return { found:true, tag: target.tagName, text: target.textContent?.trim()?.slice(0,40) }
})
console.log('  habit click:', JSON.stringify(habitRes))
if (habitRes?.found) {
  await page.waitForTimeout(1200)
  let sig = await railSignal(page)
  await shot(page, '06-habit-completed-react')
  check('HABIT_COMPLETED fired', sig==='HABIT_COMPLETED'||sig==='LEVEL_UP', `signal=${sig}`)
  for(let i=0;i<20;i++){ if((await railSignal(page))===null) break; await page.waitForTimeout(400) }
} else {
  // Document for report
  check('HABIT_COMPLETED (demo data)', false, 'no habit toggle — see allBtns in log')
  await shot(page, '06-habits-no-toggle')
}

// JOURNAL
await page.goto(`${BASE}/journal`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3500)
let jRes = await page.evaluate(() => {
  const inp = document.querySelector('input[placeholder*="One sentence"], textarea[placeholder*="One sentence"], input[placeholder*="sentence"]')
  if (!inp) return { found:false, inputs: Array.from(document.querySelectorAll('input,textarea')).map(e=>e.getAttribute('placeholder')||e.getAttribute('aria-label')||'').slice(0,10) }
  const setter = Object.getOwnPropertyDescriptor(inp instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(inp, 'Live QA review checkpoint ' + Date.now())
  inp.dispatchEvent(new Event('input', {bubbles:true}))
  inp.dispatchEvent(new Event('change', {bubbles:true}))
  const btn = document.querySelector('button[type="submit"]')
  let clicked = false
  if (btn) { (btn).click(); clicked = true } else {
    const form = inp.closest('form')
    if (form) { form.requestSubmit(); clicked = true }
    else {
      // fallback: find Save button by text
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').toLowerCase().includes('save'))
      if (saveBtn) { saveBtn.click(); clicked = true }
    }
  }
  return { found:true, clicked }
})
console.log('  journal save:', JSON.stringify(jRes))
if (jRes?.found) {
  await page.waitForTimeout(1500)
  let sig = await railSignal(page)
  await shot(page, '07-journal-logged-react')
  check('JOURNAL_LOGGED fired', sig==='JOURNAL_LOGGED', `signal=${sig}`)
  for(let i=0;i<20;i++){ if((await railSignal(page))===null) break; await page.waitForTimeout(400) }
} else {
  check('JOURNAL_LOGGED', false, JSON.stringify(jRes))
}

// USER_OPENED
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3000)
dockBtn = page.locator('#bakasur-rail button').first()
if (await dockBtn.isVisible().catch(()=>false)) {
  await dockBtn.click()
  await page.waitForTimeout(500)
  let sig = await railSignal(page)
  await shot(page, '08-user-opened-baksur-react')
  check('USER_OPENED_BAKSUR fired', sig==='USER_OPENED_BAKSUR', `signal=${sig}`)
  const closeBtn = page.locator('.assistant-rail-expanded button[aria-label*="Close"]').first()
  if (await closeBtn.isVisible().catch(()=>false)) await closeBtn.click()
  await page.waitForTimeout(600)
} else {
  check('USER_OPENED_BAKSUR', false, 'dock not visible')
}

console.log('\n== CHAT / BACKEND ==')
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(2000)
let chatBtn = page.locator('#bakasur-rail button').first()
if (await chatBtn.isVisible().catch(()=>false)) { await chatBtn.click(); await page.waitForTimeout(800) }
await shot(page, '09-rail-opened-for-chat')
let chatInput = page.locator('#bakasur-rail input[placeholder*="Ask BakaSur"], #bakasur-rail input[placeholder*="Ask"]').first()
let chatVisible = await chatInput.isVisible().catch(()=>false)
console.log(`  chat input visible: ${chatVisible}`)
if (chatVisible) {
  // intercept chat request — listen before sending
  let chatResp = null
  const respPromise = new Promise(resolve => {
    const handler = async r => {
      if (r.url().includes('/assistant/chat') || r.url().includes('/api/v1/assistant')) {
        try {
          const txt = await r.text()
          chatResp = { status: r.status(), body: txt.slice(0,800) }
          page.off('response', handler)
          resolve(chatResp)
        } catch(e){}
      }
    }
    page.on('response', handler)
    setTimeout(()=> resolve(chatResp), 8000)
  })
  await chatInput.fill('Hello — quick live check')
  await chatInput.press('Enter')
  await respPromise
  await page.waitForTimeout(1500)
  await shot(page, '10-bakasur-chat-response')
  const assistantText = await page.evaluate(() => {
    const nodes = document.querySelectorAll('#bakasur-rail [data-role="assistant"], #bakasur-rail .assistant-message, #bakasur-rail [class*="assistant"]')
    return Array.from(nodes).map(n=>n.textContent?.trim()).filter(Boolean).join(' | ').slice(0,400)
  })
  console.log('  chatResp:', JSON.stringify(chatResp))
  console.log('  assistantText:', assistantText.slice(0,200))
  check('chat contract (request sent)', !!chatResp, chatResp ? `status=${chatResp.status}` : 'no /assistant response observed')
  // Backend has no AI binding locally — 503 ai_unavailable is expected and documented
  if (chatResp) check('backend responded (503 with ai_unavailable is expected locally)', chatResp.status===503 || chatResp.status===200, `status=${chatResp.status}`)
}

console.log('\n== MOBILE 390 ==')
await page.close()
const ctx2 = await browser.newContext({ viewport: { width:390, height:844 }, deviceScaleFactor: 1 })
await ctx2.addInitScript(() => {
  localStorage.setItem('bt_first_run','done')
  localStorage.setItem('bt_demo_mode','true')
  localStorage.setItem('bt_intro_seen','true')
  localStorage.setItem('bt_assistant_collapsed','true')
  localStorage.setItem('bt_sidebar_collapsed','false')
})
const mpage = await ctx2.newPage()
await mpage.goto(`${BASE}/today`, { waitUntil:'networkidle', timeout:90000 })
await mpage.waitForTimeout(3000)
await shot(mpage, '11-mobile-today-390')
const pillInfo = await mpage.evaluate(() => {
  const aside = document.querySelector('#bakasur-rail')
  const pill = document.querySelector('[data-testid*="baksur"], button[aria-label*="BakaSur"], button[aria-label*="assistant"]')
  return { asideExists: !!aside, pillExists: !!pill, pillText: pill?.textContent?.trim()?.slice(0,40), asideClass: aside?.className?.slice(0,100) }
})
console.log('  mobile pill:', JSON.stringify(pillInfo))
check('mobile pill/sheet entry', pillInfo.asideExists || pillInfo.pillExists, JSON.stringify(pillInfo))
for (const pth of ['/tasks','/habits']) {
  await mpage.goto(`${BASE}${pth}`, { waitUntil:'networkidle', timeout:90000 })
  await mpage.waitForTimeout(1000)
  await shot(mpage, `12-mobile-${pth.replace('/','')}-390`)
}

console.log('\n== REDUCED MOTION & OVERFLOW ==')
await mpage.close()
ctx2.close()
const ctx3 = await browser.newContext({ viewport:{width:1440,height:900} })
await ctx3.addInitScript(()=>{ localStorage.setItem('bt_first_run','done'); localStorage.setItem('bt_demo_mode','true'); localStorage.setItem('bt_intro_seen','true'); localStorage.setItem('bt_assistant_collapsed','true'); localStorage.setItem('bt_sidebar_collapsed','false') })
const rpage = await ctx3.newPage()
await rpage.emulateMedia({ reducedMotion: 'reduce' })
await rpage.goto(`${BASE}/today`, { waitUntil:'networkidle', timeout:90000 })
await rpage.waitForTimeout(2500)
const rmStatic = await rpage.evaluate(()=> !!document.querySelector('[data-baksur-static="true"], svg[data-baksur-static="true"]'))
await shot(rpage, '13-reduced-motion-desktop')
check('reduced-motion static', rmStatic)

await rpage.emulateMedia({ reducedMotion: 'no-preference' })
await rpage.goto(`${BASE}/today`, { waitUntil:'networkidle', timeout:90000 })
await rpage.waitForTimeout(1500)
const layout = await rpage.evaluate(()=> ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  overflow: document.body.scrollWidth > document.body.clientWidth + 1,
  z: getComputedStyle(document.querySelector('#bakasur-rail')||document.body).zIndex
}))
check('no horizontal overflow', !layout.overflow, `scroll=${layout.scrollWidth} client=${layout.clientWidth}`)
check('bakasur z-index set', layout.z !== 'auto', `z=${layout.z}`)
await shot(rpage, '14-final-today-desktop')

await browser.close()
console.log(`\n== RESULTS: ${passed.length} passed, ${failed.length} failed ==`)
if (failed.length) console.log('  FAILURES:', failed)
