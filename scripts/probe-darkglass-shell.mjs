// Darkglass shell probe: sidebar HUD, command bar, quiet AI dock, overflow.
import { chromium } from 'playwright';

const browser = await chromium.launch();

async function check(viewport, label) {
  const page = await browser.newPage({ viewport });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,a')].find(x => /TRY LIVE DEMO/i.test(x.innerText || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(3500);

  const out = await page.evaluate(() => {
    const rail = document.querySelector('#instrument-rail');
    const visible = (sel) => [...document.querySelectorAll(sel)].find(el => el.getBoundingClientRect().width > 0) || null;
    const bar = visible('.context-bar');
    const dock = visible('#bakasur-rail');
    const h = (sel) => {
      const el = visible(sel) || document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0, bg: cs.background.slice(0, 40), border: cs.borderColor };
    };
    const sb = document.body, doc = document.documentElement;
    return {
      railW: rail ? Math.round(rail.getBoundingClientRect().width) : 0,
      settingsVisible: !!document.querySelector('#settings-btn') && document.querySelector('#settings-btn').getBoundingClientRect().width > 0,
      hudCard: h('#sidebar-level-bar'),
      hudStatusLabel: (document.querySelector('.hud-status-dot')?.nextElementSibling?.textContent || '').trim(),
      hudDotClass: document.querySelector('.hud-status-dot')?.className || '',
      hudXpTrack: h('.hud-xp-track'),
      dayProgress: !!document.querySelector('#sidebar-day-progress'),
      userMenu: h('.user-menu, [class*="user-menu"]'),
      contextBar: h('.context-bar'),
      contextMetrics: h('.context-metrics'),
      metricCount: document.querySelectorAll('.context-metric').length,
      assistantTrigger: h('.assistant-trigger'),
      assistantTriggerDot: !!document.querySelector('.assistant-trigger-dot'),
      dock: h('.assistant-rail-collapsed') || h('.assistant-rail-expanded'),
      dockLabel: (document.querySelector('.assistant-rail-label')?.textContent || '').trim(),
      pageHScroll: sb.scrollWidth > sb.clientWidth || doc.scrollWidth > doc.clientWidth,
      errors: [],
    };
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 100)));
  await page.waitForTimeout(500);
  const collapsed = await page.evaluate(() => {
    const t = [...document.querySelectorAll('button')].find(b => /BakaSur/i.test(b.textContent || '') && b.getBoundingClientRect().width > 0) || [...document.querySelectorAll('[aria-controls="bakasur-rail"]')].find(b => b.getBoundingClientRect().width > 0);
    if (t) t.click();
    return !!t;
  });
  await page.waitForTimeout(600);
  const dockAfter = await page.evaluate(() => {
    const d = document.querySelector('#bakasur-rail');
    const r = d.getBoundingClientRect();
    const cs = getComputedStyle(d);
    return {
      collapsed: d.classList.contains('assistant-rail-collapsed'),
      w: Math.round(r.width),
      bg: cs.backgroundColor.slice(0, 40),
      border: cs.borderColor,
      labelVisible: (d.querySelector('.assistant-rail-label')?.textContent || '').trim(),
    };
  });
  console.log(label, JSON.stringify({ ...out, collapseClicked: collapsed, dockAfter }));
  await page.close();
}

await check({ width: 1440, height: 900 }, 'desktop');
await check({ width: 1280, height: 720 }, 'laptop');
await check({ width: 390, height: 844 }, 'mobile');
await browser.close();