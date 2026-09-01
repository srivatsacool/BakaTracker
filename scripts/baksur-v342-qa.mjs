#!/usr/bin/env node
/**
 * V3.4.2 — Baksur interaction QA.
 *
 * Drives the REAL app shell (guest/demo mode, same recipe as probe-f11) with
 * Playwright Chromium and verifies the interaction ladder around the existing
 * BakaSur surfaces: dock collapsed/expanded, click → rail, hover face, cursor
 * gaze, keyboard, Escape, aria-live, chat contract, mobile pill, tablet
 * overlay, reduced motion, hidden-tab pause, overflow, z-index.
 *
 * Screenshots -> visual-qa/baksur-v342/
 * Usage: node scripts/baksur-v342-qa.mjs   (expects dev server on :5199)
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'visual-qa', 'baksur-v342')
const BASE = 'http://localhost:5199'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
let failures = 0
const results = []
function check(name, ok, detail = '') {
  results.push(`${ok ? 'OK  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
}

const initGuest = () => {
  localStorage.setItem('bt_demo_mode', 'true')
  localStorage.setItem('bt_sidebar_collapsed', 'false')
  localStorage.setItem('bt_assistant_collapsed', 'true')
  localStorage.setItem('bt_first_run', 'done')
}

async function newCtx(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
  await ctx.addInitScript(initGuest)
  return ctx
}

// ============ 1. DESKTOP — collapsed dock ============
console.log('== DESKTOP 1440 ==')
{
  const ctx = await newCtx()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })

  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1500)

  const dock = page.locator('#bakasur-rail .baksur-dock svg[data-baksur-direction]')
  check('collapsed dock shows Baksur', await dock.count() === 1)
  check('dock character decorative (aria-hidden)', await dock.first().getAttribute('aria-hidden') === 'true')
  const btn = page.locator('#bakasur-rail button.assistant-rail-expand')
  check('dock button keeps aria-label + aria-expanded=false',
    (await btn.getAttribute('aria-label')) === 'Open BakaSur assistant' &&
    (await btn.getAttribute('aria-expanded')) === 'false')
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('no horizontal overflow (collapsed)', overflow === 0, `${overflow}px`)
  await page.screenshot({ path: join(OUT, '01-desktop-collapsed.png'), fullPage: false })

  // --- cursor gaze: eyes must TURN toward the pointer (directional test) ----
  // Wandering gaze drifts the eyes every frame, so a plain before/after diff
  // proves nothing. Instead: park the pointer far left, then far right of the
  // dock, and require the eye translation (matrix e-term) to shift right.
  const readEyeX = () => page.evaluate(() => {
    const eyes = Array.from(document.querySelectorAll('#bakasur-rail svg mask path')).slice(1)
    return eyes.map((p) => {
      const m = /matrix\(([^)]+)\)/.exec(p.getAttribute('transform') || '')
      return m ? parseFloat(m[1].split(',')[4]) : 0
    }).reduce((a, b) => a + b, 0) / (eyes.length || 1)
  })
  await page.mouse.move(200, 450)
  await page.waitForTimeout(1400)
  const eyeLeft = await readEyeX()
  await page.mouse.move(1380, 120)
  await page.waitForTimeout(1400)
  const eyeRight = await readEyeX()
  check('cursor gaze turns eyes toward pointer', eyeRight - eyeLeft > 2,
    `Δx=${(eyeRight - eyeLeft).toFixed(1)} viewBox units`)
  await page.screenshot({ path: join(OUT, '02-desktop-cursor-gaze.png') })

  // --- hover: resting face shifts to 'attentif' ------------------------------
  await btn.hover()
  await page.waitForTimeout(900)
  const dockBox = await btn.boundingBox()
  await page.screenshot({
    path: join(OUT, '03-desktop-hover.png'),
    clip: { x: dockBox.x - 8, y: dockBox.y - 8, width: dockBox.width + 16, height: dockBox.height + 16 },
  })

  // --- click opens the rail through the existing path ------------------------
  await btn.click()
  await page.waitForTimeout(900)
  const rail = page.locator('#bakasur-rail.assistant-rail-expanded')
  check('click opens expanded rail', await rail.count() === 1)
  check('persisted pref flipped to expanded', await page.evaluate(() =>
    localStorage.getItem('bt_assistant_collapsed')) === 'false')
  check('aria-live present on messages', await page.locator('.assistant-messages[aria-live="polite"]').count() === 1)
  const railZ = await page.evaluate(() => getComputedStyle(document.getElementById('bakasur-rail')).zIndex)
  check('rail z-index unchanged (auto in flow)', railZ === 'auto', railZ)
  await page.screenshot({ path: join(OUT, '04-desktop-expanded.png'), fullPage: false })

  // --- chat contract unchanged (guest demo reply) -----------------------------
  await page.fill('input[aria-label="Ask BakaSur"]', 'What should I focus on today?')
  await page.press('input[aria-label="Ask BakaSur"]', 'Enter')
  await page.waitForTimeout(1200)
  const chatOk = await page.evaluate(() => {
    const msgs = document.querySelectorAll('.assistant-messages article')
    if (msgs.length < 3) return { ok: false, n: msgs.length }
    const last = msgs[msgs.length - 1]
    return { ok: /source|Today|quest/i.test(last.textContent || ''), n: msgs.length }
  })
  check('guest chat contract intact (user + demo reply render)', chatOk.ok, `${chatOk.n} messages`)
  await page.screenshot({ path: join(OUT, '05-desktop-chat-reply.png'), fullPage: false })

  // --- Escape collapses back ---------------------------------------------------
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  check('Escape collapses to dock', await page.locator('#bakasur-rail.assistant-rail-collapsed').count() === 1)

  // --- keyboard reachability: Tab to dock, Enter opens ---------------------------
  await page.evaluate(() => document.activeElement.blur())
  await page.keyboard.press('Tab')
  let opened = false
  for (let i = 0; i < 30; i++) {
    if (await page.evaluate(() => document.activeElement?.classList?.contains('baksur-dock') || false)) {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(600)
      opened = await page.locator('#bakasur-rail.assistant-rail-expanded').count() === 1
      break
    }
    await page.keyboard.press('Tab')
  }
  check('keyboard: Tab reaches dock, Enter opens rail', opened)
  if (opened) { await page.keyboard.press('Escape'); await page.waitForTimeout(400) }

  check('no page/console errors (desktop)', errors.length === 0, errors.slice(0, 3).join(' ; '))
  await ctx.close()
}

// ============ 2. TABLET 1024 — overlay behavior ============
console.log('== TABLET 1024 ==')
{
  const ctx = await newCtx({ viewport: { width: 1024, height: 768 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)
  const dock = page.locator('#bakasur-rail .baksur-dock svg')
  check('tablet: dock visible with Baksur', await dock.count() === 1)
  await page.screenshot({ path: join(OUT, '06-tablet-collapsed.png') })
  await page.locator('#bakasur-rail button.assistant-rail-expand').click()
  await page.waitForTimeout(800)
  const overlay = await page.evaluate(() => {
    const el = document.getElementById('bakasur-rail')
    const cs = getComputedStyle(el)
    return { pos: cs.position, z: cs.zIndex, expanded: el.classList.contains('assistant-rail-expanded') }
  })
  check('tablet: rail opens as fixed overlay', overlay.expanded && overlay.pos === 'fixed', JSON.stringify(overlay))
  const pref = await page.evaluate(() => localStorage.getItem('bt_assistant_collapsed'))
  check('tablet: persisted pref untouched (transient overlay)', pref === 'true', pref)
  await page.screenshot({ path: join(OUT, '07-tablet-overlay.png') })
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('tablet: no horizontal overflow', overflow === 0, `${overflow}px`)
  await ctx.close()
}

// ============ 3. MOBILE 390 — pill preserved ============
console.log('== MOBILE 390 ==')
{
  const ctx = await newCtx({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)
  const pill = page.locator('button[aria-label="Open BakaSur assistant"]').filter({ hasText: 'BakaSur' })
  check('mobile: floating [✦ BakaSur] pill preserved', await pill.count() === 1)
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('mobile: no horizontal overflow', overflow === 0, `${overflow}px`)
  await page.screenshot({ path: join(OUT, '08-mobile-collapsed.png'), fullPage: false })
  await pill.first().click()
  await page.waitForTimeout(800)
  const sheet = await page.evaluate(() => {
    const el = document.getElementById('bakasur-rail')
    const cs = getComputedStyle(el)
    return { expanded: el.classList.contains('assistant-rail-expanded'), pos: cs.position, z: cs.zIndex }
  })
  check('mobile: pill opens bottom sheet (z 60, fixed)', sheet.expanded && sheet.pos === 'fixed' && sheet.z === '60', JSON.stringify(sheet))
  await page.screenshot({ path: join(OUT, '09-mobile-sheet.png'), fullPage: false })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  check('mobile: Escape dismisses sheet', await page.locator('#bakasur-rail.assistant-rail-collapsed').count() === 1)
  await ctx.close()
}

// ============ 4. REDUCED MOTION — dock renders static ============
console.log('== REDUCED MOTION ==')
{
  const ctx = await newCtx({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  const staticAttr = await page.locator('#bakasur-rail svg[data-baksur-static="true"]').count()
  check('reduced-motion: dock Baksur static', staticAttr === 1, `${staticAttr}`)
  await page.screenshot({ path: join(OUT, '10-desktop-reduced-motion.png') })
  await ctx.close()
}

// ============ 5. HIDDEN TAB — rAF pause ============
console.log('== rAF VISIBILITY ==')
{
  // Fresh context so this page owns the foreground (a backgrounded page
  // throttles rAF to zero and the 'advancing' precondition cannot hold).
  const ctx = await newCtx()
  const page = await ctx.newPage()
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)
  const paths = () => page.evaluate(() =>
    Array.from(document.querySelectorAll('#bakasur-rail svg path[d^="M"]')).map(p => p.getAttribute('d')).join())
  const warm1 = await paths()
  await page.waitForTimeout(600)
  const before = await paths()
  const advancing = warm1 !== before
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(800)
  const mid = await paths()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(800)
  const after = await paths()
  check('rAF running while visible (precondition)', advancing)
  check('rAF frozen while hidden, resumes after', mid === before && after !== before,
    `frozen=${mid === before} resumed=${after !== before}`)
  await ctx.close()
}

// ============ 6. PROTOTYPE GALLERY — body-visible states, size rule =========
console.log('== PROTOTYPE GALLERY ==')
{
  const ctx = await newCtx()
  const page = await ctx.newPage()
  await page.goto(`${BASE}/baksur-prototype?static=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)
  // THINKING/SLEEP frames must contain a body path of near-full width
  const bodyCheck = await page.evaluate(() => {
    const out = []
    for (const st of ['THINKING', 'SLEEP']) {
      for (const dir of ['mochi', 'flamehorn']) {
        const svg = document.querySelector(`svg[data-baksur-state="${st}"][data-baksur-direction="${dir}"]`)
        if (!svg) { out.push({ st, dir, found: false }); continue }
        const body = svg.querySelector('mask path')
        const d = body.getAttribute('d')
        const xs = d.match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 0)
        out.push({ st, dir, found: true, width: Math.max(...xs) - Math.min(...xs) })
      }
    }
    return out
  })
  const fullBodies = bodyCheck.every(b => b.found && b.width > 150)
  check('THINKING/SLEEP keep full body in both directions', fullBodies,
    bodyCheck.map(b => `${b.st}/${b.dir}:${b.width?.toFixed?.(0)}`).join(' '))
  await page.screenshot({ path: join(OUT, '11-prototype-static-gallery.png'), fullPage: true })
  for (const dir of ['mochi', 'flamehorn']) {
    await page.locator(`[data-qa-section="${dir}"]`).screenshot({ path: join(OUT, `12-prototype-${dir}.png`) })
  }
  await ctx.close()
}

await browser.close()
console.log('\n==== SUMMARY ====')
console.log(results.join('\n'))
console.log(`\n${results.filter(r => r.startsWith('FAIL')).length} failures / ${results.length} checks`)
console.log(`Screenshots: ${OUT}`)
