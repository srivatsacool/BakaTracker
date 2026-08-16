// Find which child overflows the rail horizontally.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,a')].find(x => /TRY LIVE DEMO/i.test(x.innerText || ''));
  if (b) b.click();
});
await page.waitForTimeout(3500);

const out = await page.evaluate(() => {
  const rail = document.querySelector('#instrument-rail');
  const railRect = rail.getBoundingClientRect();
  const innerRight = railRect.right - 16; // p-4 right padding
  const offenders = [];
  rail.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > innerRight + 1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        cls: (el.className || '').toString().slice(0, 60),
        right: Math.round(r.right - innerRight),
      });
    }
  });
  return offenders.slice(0, 8);
});
console.log(JSON.stringify(out, null, 1));
await browser.close();