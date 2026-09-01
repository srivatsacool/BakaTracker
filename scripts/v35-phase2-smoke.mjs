#!/usr/bin/env node
/* V3.5 Phase 2 smoke: hero renders, click opens rail, he lands in the slot, close returns. */
import { chromium } from 'playwright'
const BASE = 'http://localhost:5173'
const results = []
const ok = (l, c, d='') => { results.push([c, l, d]); console.log(`${c ? '✔' : '✘'} ${l}${d ? ' — ' + d : ''}`) }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('bt_first_run', 'done')
  localStorage.setItem('bt_demo_mode', 'true')
  localStorage.setItem('bt_walkthrough:demo', 'skipped')
  localStorage.setItem('bt_onboarding_dismissed', 'true')
  localStorage.setItem('bt_assistant_collapsed', 'true')
})
const page = await ctx.newPage()
page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 160)))
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3000)

const hero = await page.evaluate(() => {
  const layer = document.querySelector('.baksur-presence-layer')
  const btn = layer?.querySelector('button.baksur-hero-button')
  const svg = btn?.querySelector('svg[data-baksur-state]')
  if (!layer || !btn || !svg) return null
  const r = layer.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, z: getComputedStyle(layer).zIndex, state: svg.getAttribute('data-baksur-state'), label: btn.getAttribute('aria-label') }
})
ok('hero present bottom-right', !!hero && hero.w >= 96, JSON.stringify(hero))
ok('hero z-index 40', hero?.z === '40')
ok('no legacy dock aside when collapsed', !(await page.evaluate(() => !!document.querySelector('#bakasur-rail'))))

// click → rail opens, hero flies into slot
await page.click('.baksur-hero-button')
await page.waitForTimeout(1200)
const open = await page.evaluate(() => {
  const rail = document.querySelector('#bakasur-rail')
  const slot = rail?.querySelector('.baksur-rail-slot')
  const layer = document.querySelector('.baksur-presence-layer')
  const sr = slot?.getBoundingClientRect(), lr = layer?.getBoundingClientRect()
  return {
    railOpen: !!rail, slotW: sr?.width, slotH: sr?.height,
    overlap: sr && lr ? (Math.abs(lr.left - sr.left) < 6 && Math.abs(lr.top - sr.top) < 6) : false,
    z: layer ? getComputedStyle(layer).zIndex : null,
  }
})
ok('rail opened via hero click', open.railOpen)
ok('hero landed in header slot', open.overlap, JSON.stringify(open))
ok('slot ≈3x old 24px header', (open.slotW ?? 0) >= 60, `slotW=${open.slotW}`)
ok('fly z-index 65', open.z === '65')

// structural scrollbar: aside must not scroll; only .baksur-rail-scroll does
const scroll = await page.evaluate(() => {
  const rail = document.querySelector('#bakasur-rail')
  const sc = rail?.querySelector('.baksur-rail-scroll')
  return {
    railScrolls: rail ? rail.scrollHeight > rail.clientHeight + 1 : null,
    viewportScrolls: sc ? sc.scrollHeight >= sc.clientHeight : null,
    hasViewport: !!sc,
  }
})
ok('rail itself never scrolls', scroll.railScrolls === false, JSON.stringify(scroll))
ok('independent scroll viewport exists', scroll.hasViewport)

// chat still works (demo path)
const inp = page.locator('#bakasur-rail input[placeholder="Ask BakaSur…"]')
if (await inp.isVisible().catch(() => false)) {
  await inp.fill('what should I focus on?')
  await inp.press('Enter')
  await page.waitForTimeout(1200)
  const msgs = await page.evaluate(() => document.querySelectorAll('#bakasur-rail article').length)
  ok('demo chat replies (registry path)', msgs >= 3, `messages=${msgs}`)
} else {
  ok('chat input visible', false)
}

// close → hero returns to bottom-right
await page.click('#bakasur-rail button[aria-label="Collapse BakaSur assistant"]')
await page.waitForTimeout(1000)
const back = await page.evaluate(() => {
  const layer = document.querySelector('.baksur-presence-layer')
  if (!layer) return null
  const r = layer.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, z: getComputedStyle(layer).zIndex, vis: getComputedStyle(layer).display }
})
ok('hero returned to corner', !!back && back.z === '40' && back.vis !== 'none', JSON.stringify(back))

// overflow check
const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
ok('no horizontal overflow', of <= 0, `${of}px`)

// mobile: hero above bottom nav, tap opens sheet
await page.setViewportSize({ width: 390, height: 840 })
await page.waitForTimeout(800)
const mob = await page.evaluate(() => {
  const layer = document.querySelector('.baksur-presence-layer')
  const r = layer?.getBoundingClientRect()
  const nav = document.querySelector('.cabinet-nav-mobile')
  const nr = nav?.getBoundingClientRect()
  return { bottom: r?.bottom, navTop: nr?.top, w: r?.width }
})
ok('mobile hero above bottom nav', !!mob && mob.bottom <= mob.navTop + 4, JSON.stringify(mob))
await page.click('.baksur-hero-button')
await page.waitForTimeout(1200)
const mobOpen = await page.evaluate(() => {
  const rail = document.querySelector('#bakasur-rail')
  const layer = document.querySelector('.baksur-presence-layer')
  const sr = rail?.querySelector('.baksur-rail-slot')?.getBoundingClientRect()
  const lr = layer?.getBoundingClientRect()
  return { open: !!rail && getComputedStyle(rail).display !== 'none', landed: sr && lr ? (Math.abs(lr.left - sr.left) < 8 && Math.abs(lr.top - sr.top) < 8) : false }
})
ok('mobile sheet opens from hero', mobOpen.open)
ok('mobile hero lands in sheet header', mobOpen.landed, JSON.stringify(mobOpen))

await ctx.close()
await browser.close()
const fails = results.filter(r => !r[0])
console.log(`\n== ${results.length - fails.length}/${results.length} pass ==`)
if (fails.length) process.exit(1)
