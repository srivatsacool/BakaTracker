#!/usr/bin/env node
// V3.5 identity visual probe: mood-light contract + face states + size legibility.
import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('bt_visit_choice', 'demo')
  localStorage.setItem('bt_demo_mode', 'true')
  localStorage.setItem('bt_walkthrough:demo', 'done')
  localStorage.setItem('bt_assistant_collapsed', 'true')
})
const page = await ctx.newPage()
await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle' })
await page.waitForTimeout(3500) // boot-quiet

// 1. structural: gradient exists, body rect stays charcoal, mood stop != body
const g = await page.evaluate(() => {
  const svg = document.querySelector('.baksur-presence-layer svg')
  if (!svg) return { err: 'no hero svg' }
  const grad = svg.querySelector('radialGradient')
  const body = [...svg.querySelectorAll('mask path + path, g[mask] rect')].map(r => r.getAttribute('fill'))
  return {
    dataMood: svg.getAttribute('data-baksur-mood'),
    hasGradient: !!grad,
    gradStops: grad ? [...grad.querySelectorAll('stop')].map(s => s.getAttribute('stop-color') + '@' + s.getAttribute('stop-opacity')) : [],
    maskFills: body,
    state: svg.getAttribute('data-baksur-state'),
  }
})
console.log('GRAD:', JSON.stringify(g, null, 1))
await page.screenshot({ path: 'visual-qa/baksur-v35/V1-hero-mood-graphite.png' })

// 2. COLOR = violet changes only the mood stops, body untouched
await page.evaluate(() => { localStorage.setItem('bt_baksur_prefs', JSON.stringify({ color: 'violet', presence: 'normal', motion: 'full', scale: 'standard' })) })
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2500)
const g2 = await page.evaluate(() => {
  const svg = document.querySelector('.baksur-presence-layer svg')
  const grad = svg?.querySelector('radialGradient')
  const rects = [...svg.querySelectorAll('g[mask] rect')].map(r => r.getAttribute('fill'))
  return { mood: svg?.getAttribute('data-baksur-mood'), stops: grad ? [...grad.querySelectorAll('stop')].map(s => s.getAttribute('stop-color')) : [], rects }
})
console.log('VIOLET:', JSON.stringify(g2))
await page.screenshot({ path: 'visual-qa/baksur-v35/V2-hero-mood-violet.png' })

// 3. face states legible at small sizes: render fixture-free via rail open (72px)
//    and 24px canary via zoomed screenshot of hero at small scale
await page.evaluate(() => { localStorage.setItem('bt_baksur_prefs', JSON.stringify({ color: 'coral', presence: 'normal', motion: 'full', scale: 'small' })) })
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2500)
await page.screenshot({ path: 'visual-qa/baksur-v35/V3-hero-small-coral.png' })

// 4. reaction face: complete a quest live (DOM click like the main QA — works
//    for off-viewport cards), catch HAPPY frame
const before = await page.evaluate(() => document.querySelector('.baksur-presence-layer svg')?.getAttribute('data-baksur-state'))
await page.evaluate(() => {
  const b = document.querySelector('button[aria-label^="Complete"]')
  if (b) b.click()
})
await page.waitForTimeout(700)
const mid = await page.evaluate(() => document.querySelector('.baksur-presence-layer svg')?.getAttribute('data-baksur-state'))
await page.screenshot({ path: 'visual-qa/baksur-v35/V4-reaction-happy.png' })
await page.waitForTimeout(2600)
const after = await page.evaluate(() => document.querySelector('.baksur-presence-layer svg')?.getAttribute('data-baksur-state'))
console.log('FACES:', { before, mid, after })

// 5. rail slot: same element lands beside BAKASUR title (no overlap of X control)
await page.click('.baksur-presence-layer button')
await page.waitForTimeout(1200)
const slot = await page.evaluate(() => {
  const svg = document.querySelector('.baksur-presence-layer svg')
  const s = svg?.getBoundingClientRect()
  const head = document.querySelector('.baksur-rail-slot')?.getBoundingClientRect()
  const x = document.querySelector('button[aria-label="Collapse BakaSur assistant"]')?.getBoundingClientRect()
  const title = [...document.querySelectorAll('aside,div')].find(e => e.className && String(e.className).includes('cabinet-marquee'))?.getBoundingClientRect()
  return { svg: s && { x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.width) }, slot: head && { x: Math.round(head.x), w: Math.round(head.width) }, x: x && { x: Math.round(x.x) }, title: title && { x: Math.round(title.x), w: Math.round(title.width) } }
})
console.log('SLOT:', JSON.stringify(slot))
await page.screenshot({ path: 'visual-qa/baksur-v35/V5-rail-slot-coral.png' })

// 6. mobile 390 hero mood + nav clearance
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
await ctx2.addInitScript(() => {
  localStorage.setItem('bt_visit_choice', 'demo')
  localStorage.setItem('bt_demo_mode', 'true')
  localStorage.setItem('bt_walkthrough:demo', 'done')
})
const mp = await ctx2.newPage()
await mp.goto('http://localhost:5173/today', { waitUntil: 'networkidle' })
await mp.waitForTimeout(3000)
await mp.screenshot({ path: 'visual-qa/baksur-v35/V6-mobile-hero-coral.png' })
const mGeo = await mp.evaluate(() => {
  const svg = document.querySelector('.baksur-presence-layer svg')?.getBoundingClientRect()
  const nav = document.querySelector('nav')?.getBoundingClientRect()
  const de = document.documentElement
  return { hero: svg && { x: Math.round(svg.x), y: Math.round(svg.y), w: Math.round(svg.width) }, nav: nav && Math.round(nav.y), overflow: de.scrollWidth - de.clientWidth }
})
console.log('MOBILE:', JSON.stringify(mGeo))

await b.close()
console.log('PROBE_DONE')
