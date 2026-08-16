// Focused re-probe: active-item hairline tone, AI sheet mobile fix, tablet labels
import { chromium } from 'playwright';
const BASE = 'http://localhost:5177';
const browser = await chromium.launch();

const out = {};

// Active nav item hairline (on /today, #nav-today is active, tone = gold/violet)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_demo_mode', 'true');
    localStorage.setItem('bt_first_run', 'done');
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1600);
  out.hairline = await page.evaluate(() => {
    const active = document.querySelector('.cabinet-nav-item.is-active');
    const cs = getComputedStyle(active, '::before');
    const inactive = document.querySelector('.cabinet-nav-item:not(.is-active)');
    const ic = getComputedStyle(inactive, '::before');
    return {
      activeCls: active?.id,
      activeBeforeBg: cs.backgroundColor,
      activeBeforeShadow: cs.boxShadow.slice(0, 40),
      activeBeforeW: cs.width,
      activeNavColor: getComputedStyle(active).getPropertyValue('--nav-color').trim(),
      inactiveBeforeBg: ic.backgroundColor,
    };
  });
  // guest menu on /habits (green tone active) — hairline should be green
  await page.goto(BASE + '/habits', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1400);
  out.hairlineHabits = await page.evaluate(() => {
    const active = document.querySelector('.cabinet-nav-item.is-active');
    return {
      activeId: active?.id,
      beforeBg: getComputedStyle(active, '::before').backgroundColor,
      navColor: getComputedStyle(active).getPropertyValue('--nav-color').trim(),
    };
  });
  await ctx.close();
}

// Mobile AI sheet (scoped click on the ContextBar toggle)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_demo_mode', 'true');
    localStorage.setItem('bt_first_run', 'done');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1400);
  const toggle = page.locator('.context-bar button', { hasText: 'BakaSur' });
  const visible = await toggle.isVisible().catch(() => false);
  if (visible) await toggle.click();
  await page.waitForTimeout(600);
  out.mobileSheet = await page.evaluate(() => {
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
      width: Math.round(r.width),
      paddingBottom: cs.paddingBottom,
      backdrop: cs.backdropFilter,
    };
  });
  out.mobileSheetErrors = errors;
  await ctx.close();
}

// Tablet: labels really hidden (check the label span, not the LED)
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_demo_mode', 'true');
    localStorage.setItem('bt_sidebar_collapsed', 'false');
    localStorage.setItem('bt_first_run', 'done');
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/today', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1400);
  out.tabletLabels = await page.evaluate(() => {
    const item = document.querySelector('.cabinet-nav-item');
    const label = item ? Array.from(item.querySelectorAll('span')).find(s => !s.classList.contains('nav-led')) : null;
    const logo = document.getElementById('sidebar-logo');
    const logoText = logo ? Array.from(logo.querySelectorAll('div')).find(d => d.querySelector('.marquee-title')) : null;
    const footer = document.querySelector('.app-shell-frame > aside > div.text-center');
    return {
      navLabelExists: !!label,
      navLabelText: label ? label.textContent : null,
      logoTextVisible: logoText ? getComputedStyle(logoText).display !== 'none' : null,
      footerPresent: !!footer,
      asideWidth: Math.round(document.getElementById('instrument-rail').getBoundingClientRect().width),
    };
  });
  await ctx.close();
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
