#!/usr/bin/env node
// Isolate the rAF-visibility probe on the collapsed dock.
import { chromium } from 'playwright'
const BASE = 'http://localhost:5199'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('bt_demo_mode', 'true')
  localStorage.setItem('bt_sidebar_collapsed', 'false')
  localStorage.setItem('bt_assistant_collapsed', 'true')
  localStorage.setItem('bt_first_run', 'done')
})
const page = await ctx.newPage()
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(1500)

const snap = () => page.evaluate(() => {
  const svg = document.querySelector('#bakasur-rail svg[data-baksur-direction]')
  if (!svg) return { err: 'no svg' }
  const body = svg.querySelector('mask path')?.getAttribute('d') || ''
  const eyes = Array.from(svg.querySelectorAll('mask path')).slice(1)
    .map(p => p.getAttribute('transform')).join(';')
  return { body: body.slice(0, 40), bodyLen: body.length, eyes }
})

const a = await snap(); await page.waitForTimeout(600)
const b = await snap()
console.log('visible advancing:', a.body !== b.body || a.eyes !== b.eyes)
console.log('  a.body', a.body, '  b.body', b.body)
console.log('  a.eyes', a.eyes)
console.log('  b.eyes', b.eyes)

await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: true, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
})
const h1 = await snap(); await page.waitForTimeout(900)
const h2 = await snap()
console.log('hidden frozen:', h1.body === h2.body && h1.eyes === h2.eyes)

await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
})
await page.waitForTimeout(900)
const r = await snap()
console.log('resumed advancing vs h2:', r.body !== h2.body || r.eyes !== h2.eyes)
console.log('resumed vs a:', r.body !== a.body || r.eyes !== a.eyes)
await browser.close()
