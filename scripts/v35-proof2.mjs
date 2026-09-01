#!/usr/bin/env node
// Motion proof via frame-diff: presence-layer pixels must CHANGE under
// motion=full (breathing/blink loop) and be IDENTICAL under motion=reduced.
import { chromium } from 'playwright'
import { createHash } from 'crypto'

async function frameHash(motion) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_demo_mode', 'true')
    localStorage.setItem('bt_assistant_collapsed', '1')
    localStorage.setItem('bt_walkthrough:demo', 'done')
  })
  await ctx.addInitScript((m) => {
    localStorage.setItem('bt_baksur_prefs', JSON.stringify({ color: 'graphite', presence: 'normal', motion: m, scale: 'standard' }))
  }, motion)
  const page = await ctx.newPage()
  await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const el = page.locator('.baksur-presence-layer')
  const shots = []
  for (let i = 0; i < 4; i++) {
    shots.push(createHash('md5').update(await el.screenshot()).digest('hex'))
    await page.waitForTimeout(700)
  }
  await ctx.close(); await b.close()
  const uniq = new Set(shots).size
  return { motion, frames: shots.length, uniqueFrames: uniq }
}

const full = await frameHash('full')
const reduced = await frameHash('reduced')
console.log(JSON.stringify({ full, reduced }))
console.log(full.uniqueFrames > 1 ? 'FULL: animated (frames change)' : 'FULL: FAIL static')
console.log(reduced.uniqueFrames === 1 ? 'REDUCED: frozen (identical frames)' : 'REDUCED: FAIL animates')
