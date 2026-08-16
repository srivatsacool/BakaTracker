// Route sweep — every app route renders with the Cartridge Shelf world, no console errors.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const routes = ['/today', '/habits', '/tasks', '/eisenhower', '/journal', '/journey', '/notes'];

for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 100)));
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1800);
    const data = await page.evaluate(() => {
      const violet = [];
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const cs = getComputedStyle(el);
        for (const prop of ['color', 'backgroundColor', 'borderColor']) {
          const v = cs[prop];
          if (v && /rgb\((168, 85, 247|124, 58, 237|139, 92, 246|6, 182, 212|22, 211, 238|192, 132, 252)\)/.test(v)) {
            violet.push(`${el.tagName.toLowerCase()} ${prop}`);
          }
        }
      }
      const h = document.querySelector('main h1, main h2');
      return {
        violet: violet.length,
        heading: h?.textContent?.trim().slice(0, 40) || null,
        lamp: document.querySelector('.save-lamp')?.textContent?.trim().slice(0, 15) || null,
      };
    });
    console.log(`${route}: violet=${data.violet} heading="${data.heading}" lamp=${data.lamp} errors=${errors.length}${errors.length ? ' → ' + errors[0] : ''}`);
  } catch (e) {
    console.log(`${route}: FAILED ${String(e).slice(0, 80)}`);
  }
  await ctx.close();
}
await browser.close();
