import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
for (const path of ['/eisenhower', '/habits', '/journal']) {
  await page.goto('http://localhost:5173' + path, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    let black = 0, whiteBg = 0;
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.height < 15) continue;
      if (cs.color === 'rgb(0, 0, 0)') black++;
      if (cs.backgroundColor === 'rgb(255, 255, 255)') whiteBg++;
    }
    return { black, whiteBg, heading: document.querySelector('h1,h2')?.textContent?.trim().slice(0, 40) };
  });
  console.log(path, JSON.stringify(out));
}
await browser.close();
