import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);
const out = await page.evaluate(() => {
  const res = [];
  const smalls = [...document.querySelectorAll('small.font-mono, small')].filter(s => /\+ \d+ XP/.test(s.textContent || ''));
  for (const s of smalls) {
    const chain = [];
    let n = s;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const bg = cs.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)') chain.push(`${n.tagName.toLowerCase()}.${(n.className || '').toString().split(' ').slice(0,2).join('.')} → ${bg}`);
      n = n.parentElement;
    }
    const cs = getComputedStyle(s);
    res.push({ txt: s.textContent.trim(), color: cs.color, size: cs.fontSize, chain: chain.slice(0, 6) });
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
