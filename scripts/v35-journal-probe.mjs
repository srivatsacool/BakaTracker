#!/usr/bin/env node
import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { try { localStorage.setItem('bt_demo_mode','true'); localStorage.setItem('bt_visit_choice','demo'); localStorage.setItem('bt_walkthrough:demo','skipped'); localStorage.setItem('bt_assistant_collapsed','true') } catch {} })
const page = await ctx.newPage()
await page.goto('http://localhost:5173/journal', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3400)
const before = await page.evaluate(() => (JSON.parse(localStorage.getItem('bt_events') || '[]')).filter(e => e.type === 'journal_created').length)
const r = await page.evaluate(async () => {
  const el = document.querySelector('input[placeholder*="One sentence"]')
  if (!el) return 'no field'
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, 'Live probe journal line.')
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise(res => setTimeout(res, 120))
  const btns = [...document.querySelectorAll('button')].filter(x => /save entry/i.test(x.textContent || ''))
  const enabled = btns.map(x => !x.disabled)
  btns[0]?.click()
  return { clicked: !!btns[0], enabled }
})
await page.waitForTimeout(1200)
const after = await page.evaluate(() => (JSON.parse(localStorage.getItem('bt_events') || '[]')).filter(e => e.type === 'journal_created').length)
const sig = await page.evaluate(() => document.querySelector('.baksur-presence-layer')?.getAttribute('data-baksur-signal'))
console.log({ before, after, sig, r })
await b.close()
