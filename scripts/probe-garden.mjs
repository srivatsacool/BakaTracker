import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(2500);
const data = await page.evaluate(() => {
  const cs = getComputedStyle(document.body);
  const garden = document.querySelector('.garden-canvas');
  const bg = document.querySelector('.app-background');
  const sync = document.querySelector('.sync-status, .context-status');
  const h = document.querySelector('h1, h2');
  return {
    bodyBg: cs.backgroundColor,
    bodyColor: cs.color,
    gardenCanvas: !!garden,
    bgPresent: !!bg,
    syncLabel: sync?.textContent?.trim().slice(0, 30) || null,
    headingFont: h ? getComputedStyle(h).fontFamily.slice(0, 60) : null,
    heading: h?.textContent?.trim().slice(0, 40),
  };
});
console.log(JSON.stringify(data, null, 1));
await page.screenshot({ path: '.impeccable/review/garden-today.png', fullPage: false });
console.log('console errors:', errors.length ? errors.slice(0, 4) : 'NONE');
await browser.close();
