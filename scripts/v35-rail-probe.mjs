#!/usr/bin/env node
import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { try { localStorage.setItem('bt_demo_mode', 'true'); localStorage.setItem('bt_visit_choice', 'demo'); localStorage.setItem('bt_walkthrough:demo', 'skipped'); localStorage.setItem('bt_assistant_collapsed', 'true') } catch {} })
const page = await ctx.newPage()
await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3200)
const snap = async label => page.evaluate(l => {
  const el = document.querySelector('.baksur-presence-layer')
  const slot = document.querySelector('.baksur-rail-slot')
  const rail = document.querySelector('.assistant-rail-expanded')
  const r = el?.getBoundingClientRect()
  return { l,
    hero: el ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), z: getComputedStyle(el).zIndex, open: el.getAttribute('data-open') } : null,
    slot: slot ? Math.round(slot.getBoundingClientRect().width) : null,
    rail: !!rail,
    collapsedPref: localStorage.getItem('bt_assistant_collapsed'),
  }
}, label)
console.log(JSON.stringify(await snap('t0')))
await page.locator('.baksur-hero-button').click({ force: true })
await page.waitForTimeout(200); console.log(JSON.stringify(await snap('t+200ms')))
await page.waitForTimeout(1000); console.log(JSON.stringify(await snap('t+1.2s')))
await page.waitForTimeout(1200); console.log(JSON.stringify(await snap('t+2.4s')))
// chat input
console.log('inputs:', await page.evaluate(() => [...document.querySelectorAll('input')].map(i => i.type + ':' + (i.getAttribute('aria-label') || i.placeholder || '')).slice(0, 8)))
await page.screenshot({ path: 'visual-qa/baksur-v35/PROBE-after-click.png' })
await b.close()
