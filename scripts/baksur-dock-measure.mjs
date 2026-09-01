#!/usr/bin/env node
// Measure the collapsed dock box vs viewport — is the BAKASUR label clipped?
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
await page.goto('http://localhost:5199/today', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(1200)
const m = await page.evaluate(() => {
  const aside = document.querySelector('#bakasur-rail')
  const label = aside.querySelector('.assistant-rail-label')
  const svg = aside.querySelector('svg[data-baksur-direction]')
  const ar = aside.getBoundingClientRect()
  const lr = label.getBoundingClientRect()
  const sr = svg.getBoundingClientRect()
  const cs = getComputedStyle(aside)
  const lcs = getComputedStyle(label)
  return {
    viewport: innerWidth,
    aside: { l: ar.left, r: ar.right, w: ar.width, overflowX: cs.overflowX, right: cs.right, position: cs.position },
    label: { l: lr.left, r: lr.right, w: lr.width, writing: lcs.writingMode, ls: lcs.letterSpacing, fs: lcs.fontSize, transform: lcs.transform },
    svg: { t: sr.top, b: sr.bottom, l: sr.left, r: sr.right, w: sr.width },
    bodyScrollW: document.body.scrollWidth,
  }
})
console.log(JSON.stringify(m, null, 1))
await page.screenshot({
  path: 'visual-qa/baksur-v342/12-dock-closeup.png',
  clip: { x: m.aside.l - 10, y: 0, width: m.aside.w + 20, height: 900 },
})
await browser.close()
