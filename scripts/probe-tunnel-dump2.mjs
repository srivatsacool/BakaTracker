import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
await page.goto('http://localhost:5175/today', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);
const out = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('span.font-mono')].filter(s => s.textContent.trim() === 'Open');
  return spans.slice(0, 3).map(s => {
    const cs = getComputedStyle(s);
    return { color: cs.color, bg: getComputedStyle(s.parentElement).backgroundColor, cls: (s.parentElement.className || '').toString().slice(0, 80) };
  });
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
