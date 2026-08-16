// Diagnostic v15: chart geometry — are BOTH bar charts drawing real bars?
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.slice(0, 120)));

await page.goto('http://localhost:5179/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,a')].find(x => /TRY LIVE DEMO/i.test(x.innerText || ''));
  if (b) b.click();
});
await page.waitForTimeout(3500);
await page.goto('http://localhost:5179/journey', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(7000);

const out = await page.evaluate(() => {
  const svgs = [...document.querySelectorAll('.recharts-surface')];
  return svgs.map((s, i) => {
    const bars = [...s.querySelectorAll('path.recharts-rectangle')].map(p => p.getAttribute('d'));
    return {
      chart: i,
      barCount: bars.length,
      sampleBars: bars.slice(0, 3),
      tickTexts: [...s.querySelectorAll('text')].map(t => t.textContent).slice(0, 6),
      fillAttrs: [...s.querySelectorAll('path.recharts-rectangle')].map(p => p.getAttribute('fill')).slice(0, 3),
    };
  });
});

console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();