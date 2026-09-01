#!/usr/bin/env node
import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', e => errs.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()) })
await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(2500)
const info = await page.evaluate(() => ({
  url: location.href,
  dialogs: [...document.querySelectorAll('[role="dialog"]')].map(d => d.getAttribute('aria-label') || d.getAttribute('aria-labelledby')),
  bodyStart: document.body.innerText.slice(0, 400),
  visit: localStorage.getItem('bt_visit_choice'),
  firstRun: localStorage.getItem('bt_first_run'),
  buttons: [...document.querySelectorAll('button')].map(x => x.textContent?.trim()).filter(Boolean).slice(0, 20),
}))
console.log(JSON.stringify(info, null, 2))
console.log('ERRORS:', errs.slice(0, 6))
await b.close()
