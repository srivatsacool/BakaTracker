// Probe: console + page errors on /today in demo mode.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 160)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,a')].find(x => /TRY LIVE DEMO/i.test(x.innerText || ''));
  if (b) b.click();
});
await page.waitForTimeout(4000);

const out = await page.evaluate(() => {
  const mains = document.querySelectorAll('main, .cabinet');
  const todayTitle = [...document.querySelectorAll('h1,h2,h3')].map(h => h.textContent.trim()).slice(0, 6);
  return { path: location.pathname, cabinets: mains.length, titles: todayTitle };
});
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();