import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/today', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const results = await page.evaluate(() => {
  const out = { bg: null, cards: [], blackText: 0, whitePanels: 0 };
  const bg = getComputedStyle(document.body).backgroundColor;
  out.bg = { bg, htmlBg: getComputedStyle(document.documentElement).backgroundColor };
  // Find surface elements: elements with .neo-card, .glass-card, .glass, or bg-white
  const surfaces = document.querySelectorAll('.neo-card, .glass-card, .glass, .bg-white, section, [class*="card"]');
  const checked = new Set();
  for (const el of surfaces) {
    const cls = el.className?.toString?.() || '';
    if (checked.has(el)) continue;
    checked.add(el);
    if (el.getBoundingClientRect().width < 100) continue;
    const cs = getComputedStyle(el);
    out.cards.push({ cls: cls.slice(0, 90), bg: cs.backgroundColor, color: cs.color, border: cs.borderColor, radius: cs.borderRadius });
    if (out.cards.length >= 8) break;
  }
  // Count black text anywhere
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const cs = getComputedStyle(el);
    const c = cs.color;
    if (c === 'rgb(0, 0, 0)' || c === '#000' || c === 'black') out.blackText++;
  }
  return out;
});
console.log(JSON.stringify(results, null, 2));
await browser.close();
