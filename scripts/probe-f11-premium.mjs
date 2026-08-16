// Probe: F11 — premium pages pass (Light Tunnel world)
//  - /today: cohesive cockpit dock (instrument header + 2-col grid), quest
//    board primary + completion moment, keyboard rows, zero console errors
//  - /journey: premium charts (glass tooltip on hover, violet gradient defs,
//    Fragment Mono ticks), violet heatmap scale, stat bars, character title
//  - settings modal: 4 glass sections, every control present, focus trap
//    (Tab wrap + Esc) + focus restore, mobile bottom sheet
//  - contrast scan over the new surfaces (settings section text, dock header,
//    chart ticks, tooltip)
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5179';
const browser = await chromium.launch();

const CONTRAST_SRC = `
(function () {
  function lum(hex) {
    const m = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    if (!m) return null;
    let [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)].map(v => v / 255);
    const f = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    [r, g, b] = [f(r), f(g), f(b)];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function parseRgb(s) {
    if (!s) return null;
    const m = s.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/);
    if (!m) return null;
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] === undefined ? 1 : parseFloat(m[4])];
  }
  function toHex(c) {
    const h = c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    return '#' + h;
  }
  function blend(fg, bg) {
    const a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
  }
  function effBg(el) {
    const stack = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = parseRgb(getComputedStyle(node).backgroundColor);
      if (bg && bg[3] > 0.01) stack.push(bg);
      node = node.parentElement;
    }
    const bodyBg = parseRgb(getComputedStyle(document.body).backgroundColor) || [6, 7, 20, 1];
    let acc = [bodyBg[0], bodyBg[1], bodyBg[2], 1];
    for (let i = stack.length - 1; i >= 0; i--) acc = blend(stack[i], acc);
    return toHex(acc.slice(0, 3));
  }
  function ratio(a, b) {
    const la = lum(a), lb = lum(b);
    const hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }
  const out = { violations: [], samples: [] };
  const scope = Array.from(document.querySelectorAll(argSel));
  for (const el of scope) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const txt = (el.textContent || '').trim();
    if (!txt) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 4) continue;
    const color = parseRgb(cs.color);
    if (!color || color[3] < 0.5) continue;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 18 || (size >= 14 && weight >= 700);
    const need = large ? 3 : 4.5;
    const bgHex = effBg(el);
    const r = ratio(toHex([color[0], color[1], color[2]]), bgHex);
    out.samples.push({ cls: (typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 3).join(' '), txt: txt.slice(0, 24), ratio: r.toFixed(2), bg: bgHex });
    if (r < need) {
      out.violations.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 3).join(' '), txt: txt.slice(0, 30), size: size.toFixed(1), ratio: r.toFixed(2), need, bg: bgHex });
    }
  }
  out.violations.sort((a, b) => a.ratio - b.ratio);
  return out;
})()`;

async function newCtx(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_demo_mode', 'true');
    localStorage.setItem('bt_sidebar_collapsed', 'false');
    localStorage.setItem('bt_first_run', 'done');
  });
  return ctx;
}

const out = {};

// ---------- 1. /today — cohesive cockpit (desktop) ----------
{
  const ctx = await newCtx(1440, 900);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1800);
  const today = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => document.querySelectorAll(s);
    const grid = q('.cockpit-grid');
    const dock = q('.f11-cockpit-dock');
    return {
      heading: q('main h2')?.textContent?.trim().slice(0, 40) || null,
      dock: !!dock,
      dockTitle: dock?.querySelector('.f11-cockpit-title')?.textContent?.trim() || null,
      dockKicker: dock?.querySelector('.f11-cockpit-kicker')?.textContent?.trim() || null,
      gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      modules: ['Daily Score', 'Habits', 'Journal', 'Level'].filter(t => document.body.textContent?.includes(t)),
      questBoard: !!q('.cabinet--playing .cabinet-marquee-title'),
      playingTitle: q('.cabinet--playing .cabinet-marquee-title')?.textContent?.trim() || null,
      dayLine: !!q('.day-line-track'),
      questRows: qa('main [role="button"][aria-pressed]').length,
      openQuestRow: !!q('main [role="button"][aria-pressed="false"]'),
      heatNotHere: !q('#journey-heatmap'),
    };
  });
  // completion moment: click an OPEN quest row -> float-xp / star-join appears
  let completion = false;
  const clicked = await page.evaluate(() => {
    const row = document.querySelector('main [role="button"][aria-pressed="false"]');
    if (!row) return false;
    row.click();
    return true;
  });
  if (clicked) {
    await page.waitForTimeout(250);
    completion = await page.evaluate(() => !!document.querySelector('.float-xp, .star-join'));
  }
  out.today = { ...today, clicked, completion, errors: errors.slice(0, 6) };
  await page.screenshot({ path: 'scripts/probe-f11-today.png', fullPage: false });
  await ctx.close();
}

// ---------- 2. /journey — premium charts (desktop) ----------
{
  const ctx = await newCtx(1440, 900);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(BASE + '/journey', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1800);
  const journey = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => document.querySelectorAll(s);
    const cells = qa('#journey-heatmap .f11-heat-cell');
    const high = Array.from(cells).find(c => (c.getAttribute('aria-label') || '').includes('100%')) || cells[0];
    const tick = q('.recharts-cartesian-axis-tick text');
    return {
      heading: q('main h2')?.textContent?.trim().slice(0, 40) || null,
      titleLine: (() => {
        const el = q('main');
        const m = el?.textContent?.match(/LVL\s*\d+\s*·\s*[^\n]{1,40}/);
        return m ? m[0].trim() : null;
      })(),
      heatmap: !!q('#journey-heatmap'),
      heatCells: cells.length,
      heatCellBg: high ? getComputedStyle(high).backgroundColor : null,
      statBars: !!q('#journey-stat-bars'),
      statBarTracks: qa('#journey-stat-bars .rounded-full').length,
      svgCount: qa('.recharts-wrapper svg').length,
      xpGradient: !!document.getElementById('f11XpFill'),
      habitGradient: !!document.getElementById('f11HabitFill'),
      taskGradient: !!document.getElementById('f11TaskFill'),
      tickFont: tick ? getComputedStyle(tick).fontFamily.slice(0, 40) : null,
      tickFill: tick ? getComputedStyle(tick).fill : null,
      streaks: (document.body.textContent || '').includes('Streak leaderboard'),
      insights: (document.body.textContent || '').includes('Insights'),
      exportBtn: Array.from(qa('main button')).some(b => /export life/i.test(b.textContent || '')),
    };
  });
  // hover the first chart -> glass tooltip appears
  let tooltip = null;
  const surface = await page.evaluate(() => {
    const r = document.querySelector('.recharts-wrapper');
    if (!r) return null;
    const b = r.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  if (surface) {
    await page.mouse.move(surface.x, surface.y);
    await page.waitForTimeout(450);
    tooltip = await page.evaluate(() => {
      const t = document.querySelector('.f11-chart-tooltip');
      if (!t) return null;
      const cs = getComputedStyle(t);
      return {
        label: t.querySelector('.f11-chart-tooltip-label')?.textContent?.trim() || null,
        rows: t.querySelectorAll('.f11-chart-tooltip-row').length,
        font: cs.fontFamily.slice(0, 40),
        blur: cs.backdropFilter,
        border: cs.borderTopColor,
      };
    });
  }
  out.journey = { ...journey, tooltip, errors: errors.slice(0, 6) };
  await page.screenshot({ path: 'scripts/probe-f11-journey.png', fullPage: false });
  await ctx.close();
}

// ---------- 3. Settings modal — sections, controls, focus trap (desktop) ----------
{
  const ctx = await newCtx(1440, 900);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);

  await page.click('#settings-btn');
  await page.waitForTimeout(500);

  const modal = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const qa = (s) => Array.from(d.querySelectorAll(s));
    const sectionTitles = qa('.f11-settings-title').map(e => e.textContent?.trim());
    return {
      role: d.getAttribute('role'),
      ariaModal: d.getAttribute('aria-modal'),
      labelledby: d.getAttribute('aria-labelledby'),
      titleText: d.querySelector('#settings-modal-title')?.textContent?.trim() || null,
      sectionTitles,
      sections: qa('.f11-settings-section').length,
      controls: {
        dayAccentInputs: qa('input[type="color"]').length,
        dayAccentText: qa('input[type="text"][value]').filter(i => /^#/.test(i.value || '')).length,
        accentPresets: qa('button[aria-label^="Set day accent"]').length + qa('button[aria-label^="Set night accent"]').length,
        resetDefaults: qa('button').some(b => /reset defaults/i.test(b.textContent || '')),
        themeBtn: qa('button').some(b => /^(Day|Night)$/.test((b.textContent || '').trim())),
        pushBtn: qa('button').some(b => /Enable Push|Disable Push/.test(b.textContent || '')),
        bakasurTone: qa('select').some(s => s.value && s.value.length > 0),
        quietHours: qa('input[type="checkbox"]').length,
        syncLamp: qa('.save-lamp').length,
        exportBtn: qa('button').some(b => /Export Life Report/i.test(b.textContent || '')),
        loadTrial: qa('button').some(b => /Load Trial Data/.test(b.textContent || '')),
        replayTour: qa('button').some(b => /Replay App Tour/.test(b.textContent || '')),
        dangerZone: (d.textContent || '').includes('Danger Zone'),
        clearDaysSelect: qa('select').some(s => Array.from(s.options).some(o => /Last 7 Days/.test(o.textContent))),
        deleteConfirm: qa('input[placeholder="delete my data"]').length,
        clearBtn: qa('button').some(b => /Clear Selected Data/.test(b.textContent || '')),
        savePrefs: qa('button').some(b => /Save preferences/.test(b.textContent || '')),
        cancel: qa('button').some(b => /^Cancel$/.test((b.textContent || '').trim())),
        accountSection: qa('.f11-settings-section').some(s => /Demo session|Sign out|Create your own/.test(s.textContent || '')),
        guestLeaveDemo: qa('button').some(b => /Leave demo/.test(b.textContent || '')),
      },
    };
  });

  // Focus trap: initial focus inside dialog, Tab wrap, Esc close, restore
  let focus = { initial: null, wrap: null, esc: null, restore: null };
  focus.initial = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? d.contains(document.activeElement) : false;
  });
  // Tab-wrap: focus last focusable, press Tab -> should land on first focusable
  focus.wrap = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const f = (el) => el.offsetParent !== null || el === document.activeElement;
    const focusables = Array.from(d.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(f);
    if (!focusables.length) return null;
    const last = focusables[focusables.length - 1];
    const first = focusables[0];
    last.focus();
    return { lastName: (last.getAttribute('aria-label') || last.textContent || '').trim().slice(0, 24), firstName: (first.getAttribute('aria-label') || first.textContent || '').trim().slice(0, 24) };
  });
  if (focus.wrap) {
    await page.keyboard.press('Tab');
    focus.wrap.wrappedToFirst = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return null;
      const first = d.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled])');
      return first ? first.contains(document.activeElement) || first === document.activeElement : null;
    });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  focus.esc = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
  focus.restore = await page.evaluate(() => {
    const btn = document.getElementById('settings-btn');
    return btn ? btn.contains(document.activeElement) : null;
  });

  // Contrast scan over the settings sections (reopen first)
  await page.click('#settings-btn');
  await page.waitForTimeout(400);
  const contrastSettings = await page.evaluate(CONTRAST_SRC.replace('argSel', JSON.stringify('.f11-settings-section *, .f11-settings-title, .f11-settings-header')));

  out.settings = { modal, focus, errors: errors.slice(0, 6) };
  out.contrastSettings = { violations: contrastSettings.violations.slice(0, 10), total: contrastSettings.violations.length, samples: contrastSettings.samples.length };
  await page.screenshot({ path: 'scripts/probe-f11-settings.png', fullPage: false });
  await ctx.close();
}

// ---------- 4. Mobile 390x844 — cockpit stacks + settings bottom sheet ----------
{
  const ctx = await newCtx(390, 844);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1800);
  const mobile = await page.evaluate(() => {
    const grid = document.querySelector('.cockpit-grid');
    const dock = document.querySelector('.f11-cockpit-dock');
    const heat = document.querySelector('#journey-heatmap');
    return {
      gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      dock: !!dock,
      kickerHidden: dock ? getComputedStyle(dock.querySelector('.f11-cockpit-kicker')).display === 'none' : null,
      heatmapScroll: heat ? heat.scrollWidth > heat.clientWidth : null,
      mobileNav: !!document.querySelector('.cabinet-nav-mobile'),
    };
  });
  // settings as bottom sheet
  let sheet = null;
  const hasSettings = await page.evaluate(() => !!document.querySelector('header button[title="Settings"], #settings-btn-collapsed, #settings-btn'));
  if (hasSettings) {
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('#settings-btn-collapsed') || document.querySelector('header button[title="Settings"]');
      if (!btn) return false;
      btn.click();
      return true;
    });
    await page.waitForTimeout(500);
    sheet = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return null;
      const r = d.getBoundingClientRect();
      const vh = window.innerHeight;
      return {
        bottomAnchored: Math.abs(r.bottom - vh) < 4,
        roundedTop: getComputedStyle(d).borderTopLeftRadius,
        width: Math.round(r.width),
      };
    });
    out.mobileSheetOpened = opened;
  }
  out.mobile = { ...mobile, sheet, errors: errors.slice(0, 6) };
  await page.screenshot({ path: 'scripts/probe-f11-mobile.png', fullPage: false });
  await ctx.close();
}

// ---------- 5. Chart tick + dock header contrast (desktop) ----------
{
  const ctx = await newCtx(1440, 900);
  const page = await ctx.newPage();
  await page.goto(BASE + '/journey', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1600);
  const contrastJourney = await page.evaluate(CONTRAST_SRC.replace('argSel', JSON.stringify('.recharts-cartesian-axis-tick text, .f11-cockpit-title, .f11-cockpit-kicker')));
  out.contrastJourney = { violations: contrastJourney.violations.slice(0, 10), total: contrastJourney.violations.length, samples: contrastJourney.samples.length };
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 2));
