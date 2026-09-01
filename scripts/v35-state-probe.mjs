#!/usr/bin/env node
import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { try { localStorage.setItem('bt_demo_mode','true'); localStorage.setItem('bt_visit_choice','demo'); localStorage.setItem('bt_walkthrough:demo','skipped') } catch {} })
const page = await ctx.newPage()
await page.goto('http://localhost:5173/habits', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3400)
const info = await page.evaluate(() => {
  const habits = JSON.parse(localStorage.getItem('bt_habits') || '[]').map(h => h.name)
  const today = new Date().toISOString().slice(0, 10)
  const doneIds = new Set(JSON.parse(localStorage.getItem('bt_logs') || '[]').filter(l => l.date === today).map(l => l.habit_id))
  const checkButtons = [...document.querySelectorAll('button')].map(b2 => (b2.textContent || '').trim()).filter(t => /CHECK IN|✓ DONE/i.test(t)).slice(0, 14)
  return { habitCount: habits.length, today, doneCount: doneIds.size, checkButtons }
})
console.log(JSON.stringify(info, null, 1))
// journal button labels
await page.goto('http://localhost:5173/journal', { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
const jbtns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b2 => (b2.textContent || '').trim()).filter(t => /save|log|journal/i.test(t)).slice(0, 8))
const jfields = await page.evaluate(() => [...document.querySelectorAll('input,textarea')].map(i => (i.placeholder || i.type)).slice(0, 8))
console.log('journal buttons:', JSON.stringify(jbtns), 'fields:', JSON.stringify(jfields))
await b.close()
