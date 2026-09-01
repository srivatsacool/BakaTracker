#!/usr/bin/env node
/**
 * V3.4.3 — LIVE visual review against the REAL local dev environment:
 *   Frontend: http://localhost:5173 (Vite dev server)
 *   Backend:  http://localhost:8787 (wrangler dev — real Cloudflare Worker)
 *
 * No mocks. No fixture pages. Every screen is the real product surface.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const SCREENSHOT_DIR = 'visual-qa/baksur-v343-live'
const REPORT_DIR = 'docs/baksur/review-v343-live'
mkdirSync(SCREENSHOT_DIR, { recursive: true })
mkdirSync(REPORT_DIR, { recursive: true })

const BASE = 'http://localhost:5173'

const passed = []
const failed = []

function check(label, ok, detail = '') {
  if (ok) { passed.push(label); console.log(`  ✔ ${label}${detail ? ' — ' + detail : ''}`) }
  else { failed.push(label); console.log(`  ✘ ${label}${detail ? ' — ' + detail : ''}`) }
}

// ---------- helpers ----------
async function newCtx(viewport = { width: 1440, height: 900 }) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await ctx.addInitScript(() => {
    // auto-accept guest mode in the local dev environment
    localStorage.setItem('bt_demo_mode', 'true')
    localStorage.setItem('bt_intro_seen', 'true')
  })
  return { browser, ctx }
}

async function dockState(page) {
  return page.evaluate(() => document.querySelector('#bakasur-rail aside svg[data-baksur-state]')?.getAttribute('data-baksur-state') ?? 'NOT_FOUND')
}
async function railSignal(page) {
  return page.evaluate(() => document.querySelector('#bakasur-rail')?.getAttribute('data-baksur-signal') || null)
}

async function fullPageScreenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/${name}.png`
  await page.screenshot({ path, fullPage: false })
  console.log(`  📸 ${path}`)
  return path
}

// ---------- screens ----------
async function reviewApp() {
  const { browser, ctx } = await newCtx()
  const page = await ctx.newPage()

  console.log('\n== LOADING LIVE APP ==')
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(4500) // let boot-quiet pass + hydration settle
  check('app loaded', page.url().includes('/today'))
  await fullPageScreenshot(page, '01-today-desktop-1440')

  console.log('== NAVIGATION & STORE ==')
  for (const path of ['/tasks', '/habits', '/journal', '/journey', '/notes']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(1500)
    await fullPageScreenshot(page, `02-${path.replace('/','')}-desktop-1440`)
    check(`nav ${path} loaded`, page.url().includes(path))
  }

  console.log('== COLLAPSED DOCK & LABEL ==')
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3000)
  const collapsed = await fullPageScreenshot(page, '03-today-collapsed-dock')
  const labelBox = await page.evaluate(() => {
    const el = document.querySelector('#bakasur-rail .assistant-rail-label')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const aside = document.querySelector('#bakasur-rail.assistant-rail-collapsed')
    const ar = aside?.getBoundingClientRect()
    return {
      labelLeft: r.left, labelRight: r.right, labelWidth: r.width, labelHeight: r.height,
      asideWidth: ar?.width ?? null, asideLeft: ar?.left ?? null, asideRight: ar?.right ?? null,
      viewportWidth: window.innerWidth,
    }
  })
  if (labelBox) {
    const labelFitsHorizontally = labelBox.asideRight <= labelBox.viewportWidth + 2
    const labelInsideAside = labelBox.labelLeft >= labelBox.asideLeft - 2
    check('dock label fits inside aside', labelInsideAside && labelFitsHorizontally,
      `label ${Math.round(labelBox.labelWidth)}px vs aside ${Math.round(labelBox.asideWidth)}px at left=${Math.round(labelBox.asideLeft)}`)
    check('no page overflow', labelBox.labelRight <= labelBox.viewportWidth + 2,
      `label right=${Math.round(labelBox.labelRight)} viewport=${labelBox.viewportWidth}`)
  } else {
    check('dock label rendered', false, 'label element not found')
  }

  console.log('== EXPANDED RAIL & HEADER CHARACTER ==')
  const dockBtn = page.locator('#bakasur-rail button.assistant-rail-expand')
  if (await dockBtn.isVisible().catch(() => false)) {
    await dockBtn.click()
    await page.waitForTimeout(800)
    const expanded = await fullPageScreenshot(page, '04-expanded-rail-desktop')
    check('expanded rail visible', await page.locator('.assistant-rail-expanded').isVisible().catch(() => false))
  } else {
    check('expanded rail', false, 'dock button not visible')
  }

  console.log('== DESKTOP BAKSUR REACTIONS (real mutations) ==')
  // collapse back
  const closeBtn = page.locator('.assistant-rail-expanded button[aria-label="Close assistant"]')
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click()
    await page.waitForTimeout(600)
  }

  // Go to Today and complete the priority quest (if visible)
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3500)
  const restState = await dockState(page)
  const restSignal = await railSignal(page)
  check('rest state is IDLE before event', restState === 'IDLE', `state=${restState} signal=${restSignal ?? 'null'}`)

  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label^="Complete"]')
    if (!btn) return null
    btn.click()
    return btn.getAttribute('aria-label')
  })
  if (clicked) {
    await page.waitForTimeout(1200)
    const qSig = await railSignal(page)
    const qState = await dockState(page)
    await fullPageScreenshot(page, '05-quest-completed-react')
    check('QUEST_COMPLETED fired', qSig === 'QUEST_COMPLETED', `signal=${qSig} state=${qState}`)
    // wait for reaction to decay
    for (let i = 0; i < 25; i++) {
      if ((await railSignal(page)) === null && (await dockState(page)) === 'IDLE') break
      await page.waitForTimeout(400)
    }
    check('reaction decayed back to IDLE', (await railSignal(page)) === null)
  } else {
    check('QUEST_COMPLETED', false, 'no Complete button found')
  }

  // Habit page
  await page.goto(`${BASE}/habits`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3500)
  const habitClicked = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label*="complete"], button[aria-label*="log"], [data-testid*="habit"] button')?.closest('button')
    if (!btn) return null
    btn.click()
    return btn.getAttribute('aria-label')
  })
  if (habitClicked) {
    await page.waitForTimeout(1200)
    const hSig = await railSignal(page)
    await fullPageScreenshot(page, '06-habit-completed-react')
    check('HABIT_COMPLETED fired', hSig === 'HABIT_COMPLETED' || hSig === 'LEVEL_UP',
      `signal=${hSig} (LEVEL_UP is valid when demo XP crosses level boundary)`)
    for (let i = 0; i < 25; i++) {
      if ((await railSignal(page)) === null) break
      await page.waitForTimeout(400)
    }
  } else {
    check('HABIT_COMPLETED', false, 'no habit button found')
  }

  // Journal page
  await page.goto(`${BASE}/journal`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3500)
  const journalSaved = await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder*="One sentence"]')
    if (!inp) return 'no-input'
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    if (!setter) return 'no-setter'
    setter.call(inp, 'Live QA review checkpoint')
    inp.dispatchEvent(new Event('input', { bubbles: true }))
    inp.dispatchEvent(new Event('change', { bubbles: true }))
    const btn = document.querySelector('button[type="submit"]')
    if (btn) btn.click()
    return 'saved'
  })
  if (journalSaved === 'saved') {
    await page.waitForTimeout(1200)
    const jSig = await railSignal(page)
    await fullPageScreenshot(page, '07-journal-logged-react')
    check('JOURNAL_LOGGED fired', jSig === 'JOURNAL_LOGGED', `signal=${jSig}`)
  } else {
    check('JOURNAL_LOGGED', false, journalSaved)
  }

  // USER_OPENED_BAKSUR
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3000)
  const dockBtn2 = page.locator('#bakasur-rail button.assistant-rail-expand')
  if (await dockBtn2.isVisible().catch(() => false)) {
    await dockBtn2.click()
    await page.waitForTimeout(400)
    const oSig = await railSignal(page)
    await fullPageScreenshot(page, '08-user-opened-baksur-react')
    check('USER_OPENED_BAKSUR fired', oSig === 'USER_OPENED_BAKSUR', `signal=${oSig}`)
    await closeBtn.isVisible().catch(() => false) && await closeBtn.click()
    await page.waitForTimeout(600)
  } else {
    check('USER_OPENED_BAKSUR', false, 'dock not visible for opening')
  }

  console.log('== BAKASUR CHAT CONTRACT (live backend) ==')
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3000)
  const chatOpen = page.locator('#bakasur-rail button.assistant-rail-expand')
  if (await chatOpen.isVisible().catch(() => false)) {
    await chatOpen.click()
    await page.waitForTimeout(800)
    await fullPageScreenshot(page, '09-rail-opened-for-chat')
    const chatInput = page.locator('#bakasur-rail textarea, #bakasur-rail input[placeholder*="Ask"]')
    if (await chatInput.isVisible().catch(() => false)) {
      await chatInput.fill('Hello')
      await chatInput.press('Enter')
      await page.waitForTimeout(4000)
      const response = await page.evaluate(() => {
        const msgs = document.querySelectorAll('#bakasur-rail [data-role="assistant"], #bakasur-rail .assistant-message')
        return Array.from(msgs).map(m => m.textContent?.trim()).filter(Boolean).join(' | ')
      })
      await fullPageScreenshot(page, '10-bakasur-chat-response')
      check('chat input accepted', true)
      check('chat response received', response.length > 0, response.slice(0, 80))
    } else {
      check('chat input visible', false)
    }
  }

  console.log('== MOBILE (390x844) ==')
  await page.close()
  const mobilePage = await ctx.newPage()
  await mobilePage.setViewportSize({ width: 390, height: 844 })
  await mobilePage.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await mobilePage.waitForTimeout(3500)
  await fullPageScreenshot(mobilePage, '11-mobile-today-390')
  const mobilePill = await mobilePage.evaluate(() => {
    const el = document.querySelector('[data-testid*="baksur"], [aria-label*="BakaSur"], [aria-label*="assistant"]')
    return { visible: !!el, tag: el?.tagName, text: el?.textContent?.trim()?.slice(0, 30) }
  })
  check('mobile pill visible', mobilePill.visible, `tag=${mobilePill.tag} text=${mobilePill.text}`)

  for (const path of ['/tasks', '/habits']) {
    await mobilePage.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90000 })
    await mobilePage.waitForTimeout(1500)
    await fullPageScreenshot(mobilePage, `12-mobile-${path.replace('/','')}-390`)
  }

  console.log('== REDUCED MOTION ==')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3000)
  const reducedMotionStatic = await page.evaluate(() => {
    const svg = document.querySelector('#bakasur-rail svg[data-baksur-static="true"]')
    return !!svg
  })
  await fullPageScreenshot(page, '13-reduced-motion-desktop')
  check('reduced-motion static SVG', reducedMotionStatic)

  console.log('== OVERFLOW & Z-INDEX ==')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(2000)
  const layoutCheck = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyOverflow: document.body.scrollWidth > document.body.clientWidth,
    railZIndex: getComputedStyle(document.querySelector('#bakasur-rail') ?? document.body).zIndex,
  }))
  check('no horizontal overflow', !layoutCheck.bodyOverflow,
    `scrollWidth=${layoutCheck.scrollWidth} clientWidth=${layoutCheck.clientWidth}`)
  check('BakaSur z-index', layoutCheck.railZIndex !== 'auto', `z-index=${layoutCheck.railZIndex}`)

  // Close browser
  await browser.close()

  console.log(`\n== RESULTS ==`)
  console.log(`  ✔ passed: ${passed.length}`)
  console.log(`  ✘ failed: ${failed.length}`)
  if (failed.length) { console.log('  FAILURES:', failed); }
}

await reviewApp()
