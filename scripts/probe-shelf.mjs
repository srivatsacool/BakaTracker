// Probe + capture for the Cartridge Shelf world (seed 8343b35d).
// Desktop (1440×900) and mobile (390×844) captures of Today, plus a world check.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const results = [];

async function capture(label, viewport, path, route = '/today') {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2500);
  const data = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const bg = document.querySelector('.app-background');
    const lamp = document.querySelector('.save-lamp, .sync-status, .context-status');
    const h = document.querySelector('main h1, main h2');
    const shelf = document.querySelector('.shelf-canvas');
    return {
      bodyBg: cs.backgroundColor,
      bodyColor: cs.color,
      shelfCanvas: !!shelf,
      bgPresent: !!bg,
      lampLabel: lamp?.textContent?.trim().slice(0, 30) || null,
      headingFont: h ? getComputedStyle(h).fontFamily.slice(0, 50) : null,
      heading: h?.textContent?.trim().slice(0, 40),
      slot: !!document.querySelector('.slot-label, .cart-nav-item-active'),
    };
  });
  await page.screenshot({ path, fullPage: false });
  await ctx.close();
  results.push({ label, viewport, route, ...data, errors: errors.slice(0, 3) });
}

await capture('desktop-today', { width: 1440, height: 900 }, '.impeccable/review/shelf-desktop-today.png', '/today');
await capture('desktop-landing', { width: 1440, height: 900 }, '.impeccable/review/shelf-desktop-landing.png', '/');
await capture('mobile-today', { width: 390, height: 844 }, '.impeccable/review/shelf-mobile-today.png', '/today');
await capture('mobile-landing', { width: 390, height: 844 }, '.impeccable/review/shelf-mobile-landing.png', '/');

console.log(JSON.stringify(results, null, 1));
await browser.close();
