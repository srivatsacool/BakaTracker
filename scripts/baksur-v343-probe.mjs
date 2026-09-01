#!/usr/bin/env node
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('bt_demo_mode', 'true')
  localStorage.setItem('bt_sidebar_collapsed', 'false')
  localStorage.setItem('bt_assistant_collapsed', 'true')
  localStorage.setItem('bt_first_run', 'done')
})
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[browser]', m.type(), m.text().slice(0,150)) })
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0,200)))
await page.goto('http://localhost:5199/today', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(4000)

console.log('dock state:', await page.evaluate(() => document.querySelector('#bakasur-rail svg')?.getAttribute('data-baksur-state')))
console.log('buttons:', await page.evaluate(() => Array.from(document.querySelectorAll('button[aria-label^="Complete"]')).map(b => b.getAttribute('aria-label') + (b.offsetParent ? '' : ' (hidden)'))))
console.log('events before:', await page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('bt_events') || '[]').length } catch { return 'n/a' }
}))
const r = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label^="Complete"]')
  if (!btn) return 'no button'
  btn.click()
  return 'clicked ' + btn.getAttribute('aria-label')
})
console.log(r)
await page.waitForTimeout(1500)
console.log('signal attr:', await page.evaluate(() => document.getElementById('bakasur-rail')?.getAttribute('data-baksur-signal')))
console.log('dock state after:', await page.evaluate(() => document.querySelector('#bakasur-rail svg')?.getAttribute('data-baksur-state')))
console.log('events after:', await page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('bt_events') || '[]').length } catch { return 'n/a' }
}))
await browser.close()
