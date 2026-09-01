#!/usr/bin/env node
// Final proof: DEL deletes custom habit (undo flow) + MOTION=reduced freezes ambient gaze.
import { chromium } from 'playwright'
const b = await chromium.launch()

// --- 1. DEL deletes a custom habit, presets never get DEL ---
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_demo_mode', 'true')
    localStorage.setItem('bt_assistant_collapsed', '1')
    localStorage.setItem('bt_walkthrough:demo', 'done')
  })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5173/habits', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('bt_habits') || '[]').length)
  // count DEL buttons — must exist only on custom (non-preset) rows
  const delCount = await page.locator('button:has-text("DEL"):visible').count()
  const presetDel = await page.evaluate(() => {
    // any DEL inside a card that carries a PRESET badge?
    const cards = [...document.querySelectorAll('.cabinet-card, [class*="card"]')]
    return cards.some(c => /PRESET/.test(c.textContent) && [...c.querySelectorAll('button')].some(x => x.textContent.trim() === 'DEL'))
  })
  // click the first visible DEL → starts the 5s undo window → let it expire
  const deleted = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === 'DEL' && x.offsetParent !== null)[0]
    if (!btn) return 'no-del-button'
    const habitsBefore = JSON.parse(localStorage.getItem('bt_habits') || '[]').map(h => h.id)
    btn.click()
    await new Promise(r => setTimeout(r, 6000)) // undo window closes, delete lands
    const habitsAfter = JSON.parse(localStorage.getItem('bt_habits') || '[]').map(h => h.id)
    const gone = habitsBefore.filter(id => !habitsAfter.includes(id))
    return gone.length === 1 ? 'deleted-one' : `unexpected:${gone.length}`
  })
  console.log('DEL:', JSON.stringify({ before, delCount, presetHasDel: presetDel, deleted }))
  await page.screenshot({ path: 'visual-qa/baksur-v35/G70-del-after.png' })
  await ctx.close()
}

// --- 2. MOTION=reduced freezes ambient gaze (eyes stop drifting) ---
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_demo_mode', 'true')
    localStorage.setItem('bt_assistant_collapsed', '1')
    localStorage.setItem('bt_walkthrough:demo', 'done')
    localStorage.setItem('bt_baksur_prefs', JSON.stringify({ color: 'graphite', presence: 'normal', motion: 'reduced', scale: 'standard' }))
  })
  const page = await ctx.newPage()
  // move the pointer around while frozen — gaze must NOT follow under reduced
  await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const samples = []
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(200 + i * 300, 200 + i * 100)
    await page.waitForTimeout(450)
    samples.push(await page.evaluate(() => {
      const eyes = [...document.querySelectorAll('.baksur-presence-layer svg [data-eye], .baksur-presence-layer svg circle')].slice(0, 8)
      return eyes.map(e => `${e.getAttribute('cx')},${e.getAttribute('cy')},${e.getAttribute('transform') || ''}`).join(';')
    }))
  }
  const frozen = samples.every(s => s === samples[0])
  console.log('MOTION=Reduced gaze frozen across 4 pointer moves:', frozen)
  await ctx.close()

  // control: motion=full should MOVE
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx2.addInitScript(() => {
    localStorage.setItem('bt_demo_mode', 'true')
    localStorage.setItem('bt_assistant_collapsed', '1')
    localStorage.setItem('bt_walkthrough:demo', 'done')
    localStorage.setItem('bt_baksur_prefs', JSON.stringify({ color: 'graphite', presence: 'normal', motion: 'full', scale: 'standard' }))
  })
  const page2 = await ctx2.newPage()
  await page2.goto('http://localhost:5173/today', { waitUntil: 'networkidle' })
  await page2.waitForTimeout(3000)
  const ctrl = []
  for (let i = 0; i < 4; i++) {
    await page2.mouse.move(200 + i * 300, 200 + i * 100)
    await page2.waitForTimeout(450)
    ctrl.push(await page2.evaluate(() => {
      const eyes = [...document.querySelectorAll('.baksur-presence-layer svg [data-eye], .baksur-presence-layer svg circle')].slice(0, 8)
      return eyes.map(e => `${e.getAttribute('cx')},${e.getAttribute('cy')},${e.getAttribute('transform') || ''}`).join(';')
    }))
  }
  const moved = ctrl.some(s => s !== ctrl[0])
  console.log('MOTION=Full gaze moves (control):', moved)
  await ctx2.close()
}

await b.close()
console.log('PROOF_DONE')
