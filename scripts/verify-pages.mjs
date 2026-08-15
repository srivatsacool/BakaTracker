import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

const out = await page.evaluate(() => {
  const hits = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.color === 'rgb(0, 0, 0)' || cs.backgroundColor === 'rgb(255, 255, 255)') {
      const r = el.getBoundingClientRect();
      if (r.width < 80 || r.height < 20) continue;
      hits.push({ tag: el.tagName, cls: (el.className?.toString?.() || '').slice(0, 70), color: cs.color, bg: cs.backgroundColor, txt: (el.textContent || '').trim().slice(0, 40) });
      if (hits.length >= 10) break;
    }
  }
  // surface sample
  const surfaces = [...document.querySelectorAll('.neo-card, .glass-card, section[class]')];
  const cards = [];
  for (const el of surfaces.slice(0, 5)) {
    const cs = getComputedStyle(el);
    cards.push({ cls: (el.className?.toString?.() || '').slice(0, 60), bg: cs.backgroundColor, border: cs.borderColor, radius: cs.borderRadius });
  }
  return { path: location.pathname, title: document.title, blackOrWhite: hits, cards };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
