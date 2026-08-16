// Landing-focused violet scan — the reviewer's finding, now verified fixed.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(2000);

const data = await page.evaluate(() => {
  const violet = [];
  const check = (el, prop) => {
    const cs = getComputedStyle(el);
    const v = cs[prop];
    if (v && /rgb\((168, 85, 247|124, 58, 237|139, 92, 246|6, 182, 212|22, 211, 238|192, 132, 252|49, 46, 129|233, 213, 255|245, 243, 255|109, 40, 217)\)/.test(v)) {
      const tag = el.tagName.toLowerCase();
      const cls = typeof el.className === 'string' ? el.className.split(' ').slice(0, 3).join(' ') : '';
      violet.push(`${tag}.${cls} ${prop}=${v}`);
    }
  };
  const els = document.querySelectorAll('*');
  for (const el of els) {
    check(el, 'color');
    check(el, 'backgroundColor');
    check(el, 'borderColor');
    check(el, 'backgroundImage');
    const bs = getComputedStyle(el).boxShadow;
    if (bs && /168, 85, 247|124, 58, 237/.test(bs)) violet.push(`${el.tagName.toLowerCase()} boxShadow`);
  }
  // Specific elements the reviewer named
  const miniCta = document.querySelector('.landing-mini-cta');
  const scoreRing = document.querySelector('.preview-score, [class*="score"]');
  const aiPanel = document.querySelector('.preview-ai-panel');
  return {
    violetCount: violet.length,
    violet: violet.slice(0, 12),
    miniCta: miniCta ? { bg: getComputedStyle(miniCta).backgroundColor, border: getComputedStyle(miniCta).borderColor, color: getComputedStyle(miniCta).color } : null,
    aiPanelBg: aiPanel ? getComputedStyle(aiPanel).backgroundImage.slice(0, 90) : null,
  };
});
console.log(JSON.stringify(data, null, 1));
await browser.close();
