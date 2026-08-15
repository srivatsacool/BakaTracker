// verify-premium.mjs — route probes + screenshots for the premium glass build.
// Usage: node scripts/verify-premium.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5173';
const ROUTES = ['/today', '/habits', '/tasks', '/eisenhower', '/journal', '/journey', '/notes'];
const OUT_DIR = '.impeccable/review';

import { mkdirSync } from 'node:fs';
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

// ---------- DESKTOP (1440x900) ----------
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await desktop.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const dp = await desktop.newPage();
const report = { routes: {}, sync: {} };

for (const route of ROUTES) {
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      await dp.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 120000 });
      await dp.waitForTimeout(1500);
      ok = true;
    } catch (e) {
      console.log(`retry ${attempt} ${route}: ${e.message.split('\n')[0]}`);
    }
  }
  const data = await dp.evaluate(() => {
    const hits = [];
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.color === 'rgb(0, 0, 0)' || cs.backgroundColor === 'rgb(255, 255, 255)') {
        const r = el.getBoundingClientRect();
        if (r.width < 80 || r.height < 20) continue;
        hits.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), color: cs.color, bg: cs.backgroundColor, txt: (el.textContent || '').trim().slice(0, 30) });
        if (hits.length >= 5) break;
      }
    }
    const statusPill = document.querySelector('.sync-status, .context-status');
    return {
      title: document.title,
      h1: document.querySelector('h1, h2')?.textContent?.trim().slice(0, 50) || '',
      blackOrWhite: hits,
      syncPill: statusPill ? { cls: String(statusPill.className), label: statusPill.textContent?.trim().slice(0, 30) } : null,
      glassCards: [...document.querySelectorAll('.glass-card, .neo-card')].slice(0, 3).map(el => ({
        bg: getComputedStyle(el).backgroundColor,
        border: getComputedStyle(el).borderColor,
      })),
    };
  });
  report.routes[route] = data;
  console.log(`${route} → h1="${data.h1}" b/w=${data.blackOrWhite.length} sync=${data.syncPill?.label || 'none'}`);
}
await dp.screenshot({ path: `${OUT_DIR}/desktop-today.png`, fullPage: false });
await desktop.close();

// ---------- MOBILE (390x844) ----------
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mobile.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const mp = await mobile.newPage();
for (const route of ['/today', '/habits', '/notes']) {
  try {
    await mp.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 120000 });
    await mp.waitForTimeout(1200);
  } catch (e) { console.log(`mobile retry ${route}: ${e.message.split('\n')[0]}`); }
}
await mp.screenshot({ path: `${OUT_DIR}/mobile-today.png`, fullPage: false });
await mobile.close();

await browser.close();

// ---------- Summary ----------
const bad = Object.values(report.routes).filter(r => r.blackOrWhite.length > 0);
console.log('\n=== SUMMARY ===');
console.log(`routes probed: ${ROUTES.length}, black/white leaks: ${bad.length ? bad.map((r, i) => `${ROUTES[i]}:${r.blackOrWhite.length}`).join(' ') : 'NONE'}`);
console.log(`sync pill present on: ${Object.entries(report.routes).filter(([, r]) => r.syncPill).map(([k]) => k).join(', ')}`);
console.log(`screenshots: ${OUT_DIR}/desktop-today.png, ${OUT_DIR}/mobile-today.png`);
