#!/usr/bin/env node
// Focused settings probe: open modal, inventory BAKASUR controls, click each, verify.
import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { try { localStorage.setItem('bt_demo_mode','true'); localStorage.setItem('bt_visit_choice','demo'); localStorage.setItem('bt_walkthrough:demo','skipped'); localStorage.setItem('bt_assistant_collapsed','true') } catch {} })
const page = await ctx.newPage()
page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0, 160)))
await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(2800)

// how does one open settings?
const sb = await page.evaluate(() => {
  const el = document.querySelector('#settings-btn')
  const btns = [...document.querySelectorAll('button')].filter(x => /settings/i.test(x.getAttribute('aria-label') || '') || /settings/i.test(x.textContent || ''))
  return { byId: !!el, idVisible: el ? el.getBoundingClientRect().width > 0 : false, others: btns.map(x => (x.getAttribute('aria-label') || x.textContent || '').trim()).slice(0, 5) }
})
console.log('settings entry:', JSON.stringify(sb))

await page.locator('#settings-btn').first().click({ force: true })
await page.waitForTimeout(700)

const modal = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"][aria-labelledby="settings-modal-title"]')
  if (!d) return null
  const radios = [...d.querySelectorAll('[role="radio"]')].map(r => ({ label: r.getAttribute('aria-label') || r.textContent.trim(), group: r.closest('[role="radiogroup"]')?.getAttribute('aria-label') || '', checked: r.getAttribute('aria-checked') }))
  const scroll = { sh: d.scrollHeight, ch: d.clientHeight }
  return { radios, scroll, text: d.innerText.slice(0, 120) }
})
console.log('modal radios:', JSON.stringify(modal, null, 1))

const fills = () => page.evaluate(() => {
  const paths = [...document.querySelectorAll('.baksur-presence-layer svg path, .baksur-presence-layer svg circle')]
  return [...new Set(paths.map(x => (x.getAttribute('fill') || '').toLowerCase()))].sort().join(',')
})
const sizeW = () => page.evaluate(() => { const r = document.querySelector('.baksur-presence-layer')?.getBoundingClientRect(); return r ? Math.round(r.width) : null })

console.log('before color:', await fills(), 'w:', await sizeW())
// click Coral radio inside modal
const coral = page.locator('[role="dialog"] [role="radio"][aria-label="Coral"]').first()
console.log('coral count:', await page.locator('[role="dialog"] [role="radio"][aria-label="Coral"]').count(), 'visible:', await coral.isVisible().catch(() => false))
await coral.scrollIntoViewIfNeeded().catch(() => {})
await coral.click({ force: true }).catch(e => console.log('coral click err:', String(e).slice(0, 90)))
await page.waitForTimeout(600)
console.log('after coral:', await fills())

// Large scale
const large = page.locator('[role="dialog"] [role="radiogroup"] >> role=radio >> text=/^Large$/i').first()
const n1 = await page.locator('[role="dialog"] [role="radio"]', { hasText: /^Large$/i }).count()
console.log('Large radios:', n1)
await page.locator('[role="dialog"] [role="radio"]', { hasText: /^Large$/i }).first().click({ force: true }).catch(e => console.log('large err', String(e).slice(0, 90)))
await page.waitForTimeout(700)
console.log('after large w:', await sizeW())

// Hidden presence
await page.locator('[role="dialog"] [role="radio"]', { hasText: /^Hidden$/i }).first().click({ force: true }).catch(e => console.log('hidden err', String(e).slice(0, 90)))
await page.waitForTimeout(600)
const layerGone = await page.evaluate(() => !document.querySelector('.baksur-presence-layer'))
console.log('hero layer unmounted:', layerGone)

// close modal, reload, check prefs + persistence
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
const prefs = await page.evaluate(() => localStorage.getItem('bt_baksur_prefs'))
console.log('bt_baksur_prefs:', prefs)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
const afterReload = await page.evaluate(() => ({
  layer: !!document.querySelector('.baksur-presence-layer'),
  pill: !!document.querySelector('[data-baksur-min-pill], #bakasur-ctx-toggle, button[aria-label*="BakaSur" i]'),
}))
console.log('after reload:', JSON.stringify(afterReload))
await b.close()
