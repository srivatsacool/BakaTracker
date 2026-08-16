// Probe: Phase F3 — floating AppShell + left-nav polish (Light Tunnel world)
//  - all 7 routes render, zero console/page errors (demo mode)
//  - desktop: shell frame floats over the tunnel (margins/radius/border/shadow,
//    NO backdrop-filter on frame or ancestors), z-stack content > overlay
//  - collapse toggle: aria-expanded + aria-controls + aside id; click collapses
//    w-64 -> w-20 and persists bt_sidebar_collapsed; nav active state correct
//  - auto icon-rail at 768-1180px (gap #8): rail w-20 regardless of pref
//  - active nav item tool-tone hairline (::before uses --nav-color)
//  - mobile: bottom nav fixed at viewport bottom, AI sheet fixed, safe-area
//  - guest UserMenu: Leave demo + Create your own BakaTracker (gap #5)
//  - contrast scan of nav + context bar over the new smoked frame
import { chromium } from 'playwright';

const BASE = 'http://localhost:5177';
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
  const scope = Array.from(document.querySelectorAll('.app-shell-frame .cabinet-nav-item, .app-shell-frame .context-bar, .app-shell-frame .context-chip, .app-shell-frame .save-lamp, .app-shell-frame .freeplay-banner, #sidebar-level-bar, #sidebar-logo, .cabinet-nav-mobile'));
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

async function newCtx(width, height, extraInit) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript((seed) => {
    localStorage.setItem('bt_demo_mode', 'true');
    if (seed) localStorage.setItem('bt_sidebar_collapsed', 'false');
    localStorage.setItem('bt_first_run', 'done');
  }, extraInit);
  return ctx;
}

const out = {};

// ---------- 1. Route sweep (desktop) ----------
out.routes = [];
for (const route of ['/today', '/habits', '/tasks', '/eisenhower', '/journal', '/journey', '/notes']) {
  const ctx = await newCtx(1440, 900);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 140)));
  const rec = { route, errors: [], heading: null, frame: null };
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1600);
    rec.heading = await page.evaluate(() => document.querySelector('main h1, main h2')?.textContent?.trim().slice(0, 40) || null);
    rec.frame = await page.evaluate(() => {
      const f = document.querySelector('.app-shell-frame');
      if (!f) return null;
      const cs = getComputedStyle(f);
      const r = f.getBoundingClientRect();
      return {
        backdrop: cs.backdropFilter,
        radius: cs.borderRadius,
        border: cs.borderTopWidth,
        height: Math.round(r.height),
        vh: window.innerHeight,
        left: Math.round(r.left),
        top: Math.round(r.top),
      };
    });
  } catch (e) {
    rec.errors.push('PROBE-FAIL: ' + String(e).slice(0, 160));
  }
  rec.errors = errors;
  out.routes.push(rec);
  await ctx.close();
}

// ---------- 2. Desktop deep checks on /today ----------
{
  const ctx = await newCtx(1440, 900, true); // sidebar expanded pref
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1800);

  out.desktop = await page.evaluate(() => {
    const frame = document.querySelector('.app-shell-frame');
    const aside = document.querySelector('#instrument-rail');
    const toggle = aside ? aside.querySelector('button[aria-controls="instrument-rail"]') : null;
    const canvas = document.querySelector('.app-canvas');
    const bg = document.querySelector('.obs-background');
    const overlay = document.querySelector('.obs-readability-overlay');
    const tunnelCanvas = document.querySelector('.obs-tunnel-layer canvas');
    const fr = frame.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;

    const navHabits = document.getElementById('nav-habits');
    const navToday = document.getElementById('nav-today');
    const activeHabits = navHabits ? navHabits.classList.contains('is-active') : null;
    const activeToday = navToday ? navToday.classList.contains('is-active') : null;
    const hairline = navHabits ? getComputedStyle(navHabits, '::before').backgroundColor : null;
    const hairlineBox = navHabits ? getComputedStyle(navHabits, '::before').boxShadow : null;
    const asideCS = getComputedStyle(aside);

    return {
      errors: [],
      // floating frame geometry
      frameInset: { left: Math.round(fr.left), top: Math.round(fr.top), right: Math.round(vw - fr.right), bottom: Math.round(vh - fr.bottom) },
      frameRadius: getComputedStyle(frame).borderRadius,
      frameBorder: getComputedStyle(frame).borderTopWidth,
      frameBg: getComputedStyle(frame).backgroundImage.slice(0, 70),
      frameShadow: getComputedStyle(frame).boxShadow.slice(0, 60),
      frameBackdrop: getComputedStyle(frame).backdropFilter,
      canvasBackdrop: getComputedStyle(canvas).backdropFilter,
      rootBackdrop: getComputedStyle(document.getElementById('root')).backdropFilter,
      frameOverflow: getComputedStyle(frame).overflow,
      // tunnel visible AROUND the frame
      outsideHit: document.elementFromPoint(8, 450)?.className?.toString().slice(0, 40) || null,
      insideHit: document.elementFromPoint(60, 450)?.className?.toString().slice(0, 40) || null,
      // z-stack: content above overlay
      bgZ: getComputedStyle(bg).zIndex,
      bgPos: getComputedStyle(bg).position,
      canvasZ: getComputedStyle(canvas).zIndex,
      overlayZ: getComputedStyle(overlay).zIndex,
      tunnelMounted: !!tunnelCanvas,
      // collapse toggle a11y + state
      asideId: aside ? aside.id : null,
      toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : null,
      toggleAriaControls: toggle ? toggle.getAttribute('aria-controls') : null,
      asideWidth: Math.round(aside.getBoundingClientRect().width),
      asideTransition: asideCS.transitionProperty.split(',')[0],
      asideEase: asideCS.transitionTimingFunction,
      // nav active state + hairline tone
      navHabitsActive: activeHabits,
      navTodayActive: activeToday,
      hairlineBg: hairline,
      hairlineShadow: hairlineBox,
      navHabitsColor: navHabits ? getComputedStyle(navHabits).getPropertyValue('--nav-color').trim() : null,
      // context bar
      contextBarShadow: getComputedStyle(document.querySelector('.context-bar')).boxShadow.slice(0, 50),
      iconGold: getComputedStyle(document.querySelector('.context-chip .icon-gold')).color,
      iconCobalt: getComputedStyle(document.querySelector('.context-chip .icon-cobalt')).color,
    };
  });

  // toggle collapse -> width must animate to w-20 and persist
  const before = out.desktop.asideWidth;
  await page.click('button[aria-controls="instrument-rail"]');
  await page.waitForTimeout(450);
  out.desktop.afterCollapseWidth = Math.round(await page.evaluate(() => document.getElementById('instrument-rail').getBoundingClientRect().width));
  out.desktop.persistedCollapsed = await page.evaluate(() => localStorage.getItem('bt_sidebar_collapsed'));
  out.desktop.toggleAriaExpandedAfter = await page.evaluate(() => document.querySelector('button[aria-controls="instrument-rail"]').getAttribute('aria-expanded'));

  // guest UserMenu: conversion + leave demo
  await page.click('button[aria-haspopup="menu"]');
  await page.waitForTimeout(400);
  out.desktop.guestMenu = await page.evaluate(() => {
    const menu = document.getElementById('user-menu');
    if (!menu) return { open: false };
    const txt = menu.textContent || '';
    return {
      open: true,
      hasCreateCTA: txt.includes('Create your own BakaTracker'),
      hasSignInUnavailable: txt.includes('Sign-in is unavailable'),
      hasLeaveDemo: txt.includes('Leave demo'),
      hasDemoNote: txt.includes('exploring a demo'),
    };
  });
  // leave demo -> back to landing, demo flag cleared
  await page.click('#user-menu button[role="menuitem"] >> text=Leave demo');
  await page.waitForTimeout(1200);
  out.desktop.leaveDemo = await page.evaluate(() => ({
    url: location.pathname,
    demoFlag: localStorage.getItem('bt_demo_mode'),
    firstRun: localStorage.getItem('bt_first_run'),
  }));

  await page.screenshot({ path: 'scripts/probe-f3-today.png', fullPage: false });
  out.desktop.errors = errors;
  await ctx.close();
}

// ---------- 3. Tablet auto icon-rail (1000px, pref = expanded) ----------
{
  const ctx = await newCtx(1000, 800, true);
  const page = await ctx.newPage();
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1400);
  out.tablet = await page.evaluate(() => {
    const aside = document.getElementById('instrument-rail');
    const toggle = aside ? aside.querySelector('button[aria-controls="instrument-rail"]') : null;
    const pref = localStorage.getItem('bt_sidebar_collapsed');
    return {
      pref,
      asideWidth: Math.round(aside.getBoundingClientRect().width),
      toggleHidden: !toggle,
      railLabelsHidden: (() => {
        const first = document.querySelector('.cabinet-nav-item span');
        return first ? getComputedStyle(first).display === 'none' || !first : null;
      })(),
    };
  });
  await page.screenshot({ path: 'scripts/probe-f3-tablet.png', fullPage: false });
  await ctx.close();
}

// ---------- 4. Mobile (390x844): fixed nav + AI sheet + safe area ----------
{
  const ctx = await newCtx(390, 844);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1600);
  out.mobile = await page.evaluate(() => {
    const nav = document.querySelector('.cabinet-nav-mobile');
    const frame = document.querySelector('.app-shell-frame');
    const ncs = nav ? getComputedStyle(nav) : null;
    const nr = nav ? nav.getBoundingClientRect() : null;
    return {
      navVisible: nav ? ncs.display !== 'none' && nr.height > 0 : false,
      navPos: ncs ? ncs.position : null,
      navBottom: nr ? Math.round(nr.bottom) : null,
      vh: window.innerHeight,
      navPaddingBottom: ncs ? ncs.paddingBottom : null,
      navZ: ncs ? ncs.zIndex : null,
      frameBackdrop: getComputedStyle(frame).backdropFilter,
      frameRadiusMobile: getComputedStyle(frame).borderRadius,
      frameTop: Math.round(frame.getBoundingClientRect().top),
      frameLeft: Math.round(frame.getBoundingClientRect().left),
      navItems: nav ? nav.querySelectorAll('a').length : 0,
      errors: [],
    };
  });
  // open the AI sheet (ContextBar BakaSur toggle)
  const toggleSel = 'button >> text=BakaSur';
  await page.click(toggleSel).catch(() => {});
  await page.waitForTimeout(500);
  out.mobile.aiSheet = await page.evaluate(() => {
    const rail = document.querySelector('.assistant-rail-expanded');
    if (!rail) return { open: false };
    const cs = getComputedStyle(rail);
    const r = rail.getBoundingClientRect();
    return {
      open: true,
      pos: cs.position,
      bottom: Math.round(r.bottom),
      vh: window.innerHeight,
      z: cs.zIndex,
      paddingBottom: cs.paddingBottom,
    };
  });
  await page.screenshot({ path: 'scripts/probe-f3-mobile.png', fullPage: false });
  out.mobile.errors = errors;
  await ctx.close();
}

// ---------- 5. Contrast scan (nav + context bar over the smoked frame) ----------
{
  const ctx = await newCtx(1440, 900);
  const page = await ctx.newPage();
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1600);
  out.contrast = await page.evaluate(CONTRAST_SRC);
  await ctx.close();
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
