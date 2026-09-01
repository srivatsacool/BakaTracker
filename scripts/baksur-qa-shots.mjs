#!/usr/bin/env node
/**
 * V3.4.1 QA — capture Baksur prototype screenshots from a running dev server.
 * Assumes http://localhost:5199 is already serving.
 */
import { chromium } from 'playwright'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'visual-qa', 'baksur-v341')
const BASE = 'http://localhost:5199/baksur-prototype'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
let failures = 0

function check(name, ok) {
  console.log(`  ${ok ? 'OK' : 'FAIL'}: ${name}`)
  if (!ok) failures++
}

// --- Desktop static poses ---
console.log('\n== DESKTOP STATIC (1440x900) ==')
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const dp = await desktop.newPage()
await dp.goto(`${BASE}?static=1`, { waitUntil: 'networkidle', timeout: 30000 })

const overflow = await dp.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth
)
check(`desktop overflow = ${overflow}px`, overflow === 0)

await dp.screenshot({ path: join(OUT, '01-static-full-desktop.png'), fullPage: true })

// Side-by-side section
const firstSection = dp.locator('section').first()
await firstSection.screenshot({ path: join(OUT, '03-static-side-by-side-48px.png') })

// Per-direction galleries
for (const dir of ['mochi', 'flamehorn']) {
  const el = dp.locator(`[data-qa-section="${dir}"]`)
  const count = await el.count()
  check(`data-qa-section="${dir}" found`, count > 0)
  if (count > 0) {
    await el.screenshot({ path: join(OUT, `02-static-${dir}-desktop.png`) })
  }
}
await desktop.close()

// --- Animated frames ---
console.log('\n== ANIMATED FRAMES ==')
const anim = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const ap = await anim.newPage()
await ap.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
await ap.screenshot({ path: join(OUT, '04-animated-t0.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } })
await ap.waitForTimeout(3000)
await ap.screenshot({ path: join(OUT, '05-animated-t3s.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } })

// rAF pause test
const pauseResult = await ap.evaluate(async () => {
  const svg = document.querySelector('svg[data-baksur-static="false"], svg[data-baksur-state]')
  if (!svg) return null
  const paths = () => Array.from(document.querySelectorAll('svg path[d^="M"]')).map(p => p.getAttribute('d'))
  const before = JSON.stringify(paths())
  Object.defineProperty(document, 'hidden', { value: true, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise(r => setTimeout(r, 700))
  const mid = JSON.stringify(paths())
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise(r => setTimeout(r, 700))
  const after = JSON.stringify(paths())
  return { before, mid, after }
})
if (pauseResult) {
  const motionWhileHidden = pauseResult.mid !== pauseResult.before
  check(`rAF paused while hidden`, !motionWhileHidden)
}
await anim.close()

// --- Mobile static ---
console.log('\n== MOBILE STATIC (390x844) ==')
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mp = await mobile.newPage()
await mp.goto(`${BASE}?static=1`, { waitUntil: 'networkidle', timeout: 30000 })

const mOverflow = await mp.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth
)
check(`mobile overflow = ${mOverflow}px`, mOverflow === 0)

await mp.screenshot({ path: join(OUT, '06-static-full-mobile.png'), fullPage: true })
await mobile.close()

// --- Reduced motion ---
console.log('\n== REDUCED MOTION ==')
const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
const rp = await rm.newPage()
await rp.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })

const staticFlags = await rp.evaluate(() =>
  Array.from(document.querySelectorAll('svg[data-baksur-static="true"]')).length
)
const totalSvgs = await rp.evaluate(() => document.querySelectorAll('svg[data-baksur-state]').length)
check(`reduced-motion: ${staticFlags}/${totalSvgs} static`, staticFlags === totalSvgs)

await rp.screenshot({ path: join(OUT, '07-reduced-motion.png'), fullPage: true })
await rm.close()

await browser.close()
console.log(`\n== RESULT: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURES`} ==`)
console.log(`Screenshots: ${OUT}`)
process.exit(failures)
