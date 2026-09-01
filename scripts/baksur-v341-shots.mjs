#!/usr/bin/env node
/**
 * V3.4.1 — Baksur visual prototype QA screenshots.
 *
 * Boots the Vite dev server, drives the /baksur-prototype fixture with
 * Playwright Chromium, and captures the comparison board into
 * visual-qa/baksur-v341/. Also asserts no horizontal overflow at desktop
 * and mobile widths.
 *
 * Usage: node scripts/baksur-v341-shots.mjs
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'visual-qa', 'baksur-v341')
const PORT = 5199
const URL = `http://localhost:${PORT}/baksur-prototype`

mkdirSync(OUT, { recursive: true })

const server = spawn('cmd.exe', ['/c', `npx vite --port ${PORT} --strictPort`], {
  cwd: ROOT,
  stdio: 'pipe',
})

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`dev server did not start within ${timeoutMs}ms`)
}

async function checkNoOverflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  console.log(`${label}: horizontal overflow = ${overflow}px ${overflow > 0 ? 'FAIL' : 'OK'}`)
  if (overflow > 0) process.exitCode = 1
}

try {
  await waitForServer(`http://localhost:${PORT}/`)
  const browser = await chromium.launch()

  // --- Desktop, static poses -------------------------------------------------
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await desktop.newPage()
  await page.goto(`${URL}?static=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await checkNoOverflow(page, 'desktop static')
  await page.screenshot({ path: join(OUT, '01-static-full-desktop.png'), fullPage: true })
  for (const dir of ['mochi', 'flamehorn']) {
    const el = page.locator(`[data-qa-section="${dir}"]`)
    await el.screenshot({ path: join(OUT, `02-static-${dir}-desktop.png`) })
  }
  const sideBySide = page.locator('section').first()
  await sideBySide.screenshot({ path: join(OUT, '03-static-side-by-side-48px.png') })
  await desktop.close()

  // --- Desktop, animated (two frames apart to show motion) --------------------
  const anim = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const aPage = await anim.newPage()
  await aPage.goto(URL, { waitUntil: 'domcontentloaded' })
  await aPage.waitForTimeout(1500)
  const animated = await aPage.getByTestId ? true : true // no-op guard
  await aPage.screenshot({ path: join(OUT, '04-animated-t0.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } })
  await aPage.waitForTimeout(3000)
  await aPage.screenshot({ path: join(OUT, '05-animated-t3s.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } })

  // --- visibility hidden pauses rAF (frame counter stops advancing) ----------
  const paused = await aPage.evaluate(async () => {
    const svg = document.querySelector('svg[data-baksur-static="false"], svg[data-baksur-state]')
    const readBody = () => svg.querySelector('g opacity') // not used; compare paths below
    const paths = () => Array.from(document.querySelectorAll('svg path[d^="M"]')).map((p) => p.getAttribute('d'))
    const before = JSON.stringify(paths())
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 700))
    const mid = JSON.stringify(paths())
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 700))
    const after = JSON.stringify(paths())
    return { before, mid, after }
  })
  const motionWhileHidden = paused.mid !== paused.before
  console.log(`rAF paused while document hidden: ${!motionWhileHidden ? 'OK' : 'FAIL'}`)
  if (motionWhileHidden) process.exitCode = 1
  await anim.close()

  // --- Mobile, static ---------------------------------------------------------
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mPage = await mobile.newPage()
  await mPage.goto(`${URL}?static=1`, { waitUntil: 'domcontentloaded' })
  await mPage.waitForTimeout(1200)
  await checkNoOverflow(mPage, 'mobile static')
  await mPage.screenshot({ path: join(OUT, '06-static-full-mobile.png'), fullPage: true })
  await mobile.close()

  // --- Reduced motion: animated route must render static (no rAF) -------------
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const rPage = await rm.newPage()
  await rPage.goto(URL, { waitUntil: 'domcontentloaded' })
  await rPage.waitForTimeout(1000)
  const staticFlags = await rPage.evaluate(() =>
    Array.from(document.querySelectorAll('svg[data-baksur-static="true"]')).length
  )
  const totalSvgs = await rPage.evaluate(() => document.querySelectorAll('svg[data-baksur-state]').length)
  console.log(`reduced-motion: ${staticFlags}/${totalSvgs} instances static ${staticFlags === totalSvgs ? 'OK' : 'FAIL'}`)
  if (staticFlags !== totalSvgs) process.exitCode = 1
  await rPage.screenshot({ path: join(OUT, '07-reduced-motion.png'), fullPage: true })
  await rm.close()

  await browser.close()
  console.log(`done -> ${OUT}`)
} finally {
  server.kill()
}
