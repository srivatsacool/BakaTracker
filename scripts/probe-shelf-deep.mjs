// Deep DOM/style probe — verify the Cartridge Shelf world holds across surfaces.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();

async function probe(route, label) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2000);
  const data = await page.evaluate(() => {
    // Any leftover violet-family computed colors anywhere visible?
    const violet = [];
    const els = document.querySelectorAll('*');
    for (const el of els) {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderColor']) {
        const v = cs[prop];
        if (v && /rgb\((168, 85, 247|124, 58, 237|139, 92, 246|6, 182, 212|22, 211, 238|49, 46, 129|192, 132, 252)\)/.test(v)) {
          const tag = el.tagName.toLowerCase();
          const cls = (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 3).join(' ') : '';
          violet.push(`${tag}.${cls} ${prop}=${v}`);
        }
      }
    }
    const buttons = [...document.querySelectorAll('button, .neo-button, .landing-primary-cta')].slice(0, 6)
      .map(b => ({ text: b.textContent.trim().slice(0, 30), bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color }));
    const navActive = document.querySelector('.cart-nav-item-active, .nav-active, [class*="active"]');
    const cards = [...document.querySelectorAll('.glass-card, .neo-card, .glass')].slice(0, 5)
      .map(c => ({ cls: c.className.split(' ').slice(0, 3).join(' '), bg: getComputedStyle(c).backgroundColor.slice(0, 40), border: getComputedStyle(c).borderColor }));
    return {
      violetCount: violet.length,
      violet: violet.slice(0, 8),
      buttons,
      navActive: navActive ? (navActive.textContent.trim().slice(0, 20) || navActive.className.slice(0, 40)) : null,
      cards,
    };
  });
  console.log(`=== ${label} (${route}) ===`);
  console.log(JSON.stringify(data, null, 1));
  await ctx.close();
}

await probe('/today', 'TODAY');
await probe('/journey', 'JOURNEY');
await probe('/habits', 'HABITS');
await browser.close();
