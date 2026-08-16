import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);
const out = await page.evaluate(() => {
  const grab = (sel, label) => {
    const el = document.querySelector(sel);
    if (!el) return { label, missing: true };
    const cs = getComputedStyle(el);
    return { label, color: cs.color, fontSize: cs.fontSize, cls: (el.className || '').toString().slice(0, 60) };
  };
  return [
    grab('footer span', 'landing footer span'),
    grab('footer a', 'landing footer a'),
    grab('small.font-mono', 'landing XP small'),
  ];
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
