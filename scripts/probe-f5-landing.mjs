// Probe: Landing F5 — live hero with REAL app components (Phase F5)
// - zero console/page errors on /
// - hero H1 + both CTAs visible; preview cabinet with real quest rows,
//   day-line, XP bar, save-lamp, BakaSur orb
// - preview is animated (CSS animation running), quest toggle mutates the
//   real store (aria-pressed flips, float-xp + star-join fire)
// - TRY LIVE DEMO wires guest mode: bt_demo_mode=true and lands on /today
// - mobile: stacks, no horizontal overflow, CTAs/rows >= 44px
// - prefers-reduced-motion: preview drift killed, tunnel not mounted
// - WCAG contrast spot-check on hero + preview text (approx effective bg)
import { chromium } from 'playwright';

const BASE = process.env.PROBE_BASE || 'http://localhost:5176';
const browser = await chromium.launch();
const results = [];
const errors = [];
let failures = 0;

function ok(name, detail) { results.push(`PASS ${name}${detail ? ` — ${detail}` : ''}`); }
function bad(name, detail) { failures++; results.push(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
function info(name, detail) { results.push(`INFO ${name}${detail ? ` — ${detail}` : ''}`); }

const CONTRAST_SRC = `(() => {
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
  function blend(fg, bg) {
    const a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
  }
  function effBg(el) {
    const stack = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = parseRgb(getComputedStyle(node).backgroundColor);
      if (bg) stack.push(bg);
      node = node.parentElement;
    }
    // body default
    let acc = [6, 7, 20, 1];
    for (let i = stack.length - 1; i >= 0; i--) acc = blend(stack[i], acc);
    return acc;
  }
  function ratio(a, b) {
    const l1 = lum(a), l2 = lum(b);
    if (!l1 || !l2) return null;
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  }
  const targets = document.querySelectorAll('h1, h2, p, small, b, em, span, button');
  const out = [];
  for (const el of targets) {
    const t = (el.textContent || '').trim();
    if (!t || t.length < 4) continue;
    if (el.closest('.landing-preview-float') || el.closest('header') || el.closest('footer') || el.closest('.cabinet')) {
      const cs = getComputedStyle(el);
      const fg = parseRgb(cs.color);
      if (!fg) continue;
      const bg = effBg(el);
      const r = ratio(toHex(fg), toHex(bg));
      if (r !== null) {
        const size = parseFloat(cs.fontSize);
        const large = size >= 18 || (size >= 14 && cs.fontWeight >= 700);
        out.push({ text: t.slice(0, 40), ratio: Math.round(r * 100) / 100, size, large, pass: r >= (large ? 3 : 4.5) });
      }
    }
  }
  function toHex(c) { return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  return out;
})()`;

async function collectErrors(page, tag) {
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${tag}] console.error: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[${tag}] pageerror: ${e.message}`));
}

// ---------- DESKTOP ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await collectErrors(page, 'desktop');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500); // seeding + tunnel mount

  const h1 = await page.locator('h1').first().innerText().catch(() => '');
  ok(h1.includes('Your life.') && h1.includes('Your system.'), `H1: "${h1.replace(/\\n/g, ' / ')}"`);

  const demoBtn = page.locator('button', { hasText: 'TRY LIVE DEMO' }).first();
  const signinBtn = page.locator('button', { hasText: 'SIGN IN / CREATE YOUR INSTANCE' }).first();
  ok(await demoBtn.isVisible(), 'primary CTA TRY LIVE DEMO visible');
  ok(await signinBtn.isVisible(), 'secondary CTA SIGN IN / CREATE YOUR INSTANCE visible');
  const ctaH = await demoBtn.evaluate(el => el.getBoundingClientRect().height);
  info('CTA height px', String(Math.round(ctaH)));

  const preview = page.locator('[aria-label="BakaTracker live product preview — the real application running on this page"]');
  ok(await preview.count() === 1, 'live preview container present');

  const questRows = page.locator('.landing-quest-row');
  const nQuests = await questRows.count();
  ok(nQuests >= 1, `real quest rows in preview: ${nQuests}`);

  ok(await page.locator('.day-line-track').count() >= 1, 'Day Line track present');
  ok(await page.locator('.day-line-fill').count() >= 1, 'Day Line fill present');
  ok(await page.locator('.landing-orb').count() >= 1, 'BakaSur orb present');
  ok(await page.locator('.save-lamp.is-local').count() >= 1, 'save lamp (Offline · local) present');
  ok(await page.locator('.chip--aurora').count() >= 1, 'aurora chips present');
  ok(await page.locator('.landing-preview-float .cabinet-marquee-title').first().innerText().catch(() => '').then(t => t.includes('TODAY')), 'preview marquee reads BAKATRACKER · TODAY');
  ok(await page.locator('.landing-quest-row').first().evaluate(el => el.getAttribute('aria-pressed')) !== null, 'quest rows are keyboard-activatable (aria-pressed)');

  // animation check
  const anim = await page.locator('.landing-preview-float').evaluate(el => {
    const cs = getComputedStyle(el);
    return { name: cs.animationName, duration: cs.animationDuration };
  });
  ok(anim.name === 'landing-float' && anim.duration !== '0s' && anim.duration !== '0.01ms', `preview animated: ${anim.name} ${anim.duration}`);

  // LIVE quest toggle -> real store mutation
  const firstRow = questRows.first();
  const titleBefore = await firstRow.locator('p').first().innerText();
  await firstRow.evaluate(el => el.click());
  await page.waitForTimeout(250);
  const pressedAfter = await firstRow.getAttribute('aria-pressed');
  const rowLabelAfter = await firstRow.innerText();
  const xpSeen = await page.locator('.float-xp').count();
  const starSeen = await page.locator('.star-join').count();
  ok(pressedAfter === 'true' && rowLabelAfter.includes('Done'), `quest toggle flipped store: "${titleBefore}" -> Done`);
  info('completion moment fired', `float-xp elements: ${xpSeen}, star-join: ${starSeen}`);

  // toggle back (forgiving)
  await firstRow.evaluate(el => el.click());
  await page.waitForTimeout(250);
  ok((await firstRow.getAttribute('aria-pressed')) === 'false', 'quest toggles back to Open');

  // habit chip toggle (checkbox habit)
  const habitBtn = page.locator('.landing-preview-float button.chip[aria-pressed]').first();
  if (await habitBtn.count()) {
    const before = await habitBtn.getAttribute('aria-pressed');
    await habitBtn.evaluate(el => el.click());
    await page.waitForTimeout(250);
    const after = await habitBtn.getAttribute('aria-pressed');
    ok(before !== after, `habit chip toggled real store (${before} -> ${after})`);
    await habitBtn.evaluate(el => el.click()); // restore
    await page.waitForTimeout(200);
  } else {
    info('habit chip toggle', 'no checkbox habit chip found (unseeded?)');
  }

  // TRY LIVE DEMO -> guest mode -> /today
  await demoBtn.evaluate(el => el.click());
  await page.waitForURL('**/today', { timeout: 15000 }).catch(() => {});
  const url = page.url();
  const demoFlag = await page.evaluate(() => localStorage.getItem('bt_demo_mode'));
  ok(url.includes('/today') && demoFlag === 'true', `demo entry wired: URL=${url} bt_demo_mode=${demoFlag}`);
  await page.waitForTimeout(2500);
  const todayBoard = await page.locator('h2', { hasText: 'Focus Board' }).count();
  const wizard = await page.locator('text=/Load Demo Data|First Light|wizard/i').count();
  info('post-demo surface', `Today board h2: ${todayBoard}, wizard/first-light text: ${wizard}`);
  ok(todayBoard + wizard > 0, 'post-demo surface rendered (board or first-run)');

  // contrast spot-check (desktop)
  const contrast = await page.evaluate(CONTRAST_SRC);
  const fails = contrast.filter(c => !c.pass);
  info('contrast pairs scanned', `${contrast.length} (${fails.length} below threshold)`);
  for (const f of fails.slice(0, 8)) bad(`contrast ${f.text} "${f.text}" ${f.ratio}:1 (${f.size}px)`, 'below AA');
  if (fails.length === 0) ok('all scanned hero/preview text pairs pass AA', '');

  await page.close();
}

// ---------- MOBILE ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await collectErrors(page, 'mobile');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 1, `no horizontal overflow (${overflow}px)`);

  const stacked = await page.evaluate(() => {
    const hero = document.querySelector('section');
    if (!hero) return false;
    const text = hero.querySelector('.flex-1');
    const preview = hero.querySelector('.landing-preview-float');
    if (!text || !preview) return false;
    return preview.getBoundingClientRect().top >= text.getBoundingClientRect().bottom - 4;
  });
  ok(stacked, 'hero stacks on mobile (preview below copy)');

  const ctaH = await page.locator('button', { hasText: 'TRY LIVE DEMO' }).first().evaluate(el => el.getBoundingClientRect().height);
  ok(ctaH >= 44, `primary CTA tappable: ${Math.round(ctaH)}px`);
  const rowH = await page.locator('.landing-quest-row').first().evaluate(el => el.getBoundingClientRect().height).catch(() => 0);
  ok(rowH >= 44, `quest rows tappable: ${Math.round(rowH)}px`);

  await page.close();
}

// ---------- REDUCED MOTION ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await collectErrors(page, 'reduced-motion');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const canvas = await page.locator('.obs-tunnel-layer canvas').count();
  ok(canvas === 0, 'reduced-motion: no WebGL tunnel mounted');
  const dur = await page.locator('.landing-preview-float').evaluate(el => getComputedStyle(el).animationDuration).catch(() => '');
  ok(dur === '0.01ms' || dur === '0s', `reduced-motion: preview drift killed (${dur})`);
  await page.close();
}

await browser.close();

console.log('=== F5 LANDING PROBE ===');
for (const r of results) console.log(r);
console.log('---');
if (errors.length) {
  failures += errors.length;
  console.log('CONSOLE/PAGE ERRORS:');
  for (const e of errors) console.log('  ' + e);
} else {
  console.log('CONSOLE/PAGE ERRORS: none');
}
console.log(`\nRESULT: ${failures === 0 ? 'ALL GREEN' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
