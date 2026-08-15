import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const out = await page.evaluate(() => {
  const hits = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const cs = getComputedStyle(el);
    const c = cs.color;
    if (c === 'rgb(0, 0, 0)') {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const txt = (el.textContent || '').trim().slice(0, 50);
      hits.push({ tag: el.tagName, cls: (el.className?.toString?.() || '').slice(0, 60), txt });
    }
  }
  return { hits, url: location.pathname, count: hits.length };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
