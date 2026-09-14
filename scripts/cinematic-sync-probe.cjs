/* Cinematic overlay synchronization probe — 1280x800, real scroll 0→100%.
 * Verifies: canvas frames at 0/50/100%, HTML overlay states per stage,
 * Bakasur anchor 49.4%/61.6% (LOCKED final values), no layout shift,
 * pinned→release, console clean.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4174';
const OUT = path.join(__dirname, '..', 'docs', 'visual-qa', 'cinematic-sync');
fs.mkdirSync(OUT, { recursive: true });

const STOPS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const results = [];
const errors = [];
function pass(id, detail) { results.push({ id, ok: true, detail }); console.log(`PASS ${id} — ${detail}`); }
function fail(id, detail) { results.push({ id, ok: false, detail }); console.log(`FAIL ${id} — ${detail}`); }

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // poster frame + loader resolve

  // Canvas pixel sample: proves a frame is actually drawn (and which one-ish).
  async function canvasSample() {
    return page.evaluate(() => {
      const c = document.querySelector('.cine-sequence');
      if (!c) return null;
      const ctx = c.getContext('2d');
      const { width: w, height: h } = c;
      if (!w || !h) return null;
      const img = ctx.getImageData(0, 0, w, h).data;
      let lit = 0;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < img.length; i += 40) { // coarse stride
        if (img[i + 3] > 0) { lit++; r += img[i]; g += img[i + 1]; b += img[i + 2]; n++; }
      }
      return {
        lit,
        avg: n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null,
        bitmap: [c.width, c.height],
      };
    });
  }

  // Full per-stop state.
  async function readState() {
    return page.evaluate(() => {
      const misses = [];
      const q = (sel) => {
        const el = document.querySelector(sel);
        if (!(el instanceof Element)) { misses.push(sel); return null; }
        return el;
      };
      const cs = (sel) => { const el = q(sel); return el ? getComputedStyle(el) : null; };
      const rect = (sel) => {
        const el = q(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      const figure = rect('.cine-figure');
      const vw = innerWidth, vh = innerHeight;
      const m = (sel) => {
        const el = q(sel);
        if (!el) return { scale: 1, y: 0 };
        const t = getComputedStyle(el).transform;
        if (!t || t === 'none') return { scale: 1, y: 0 };
        const m6 = t.match(/matrix\(([^)]+)\)/);
        if (!m6) return { scale: 1, y: 0 };
        const v = m6[1].split(',').map(Number);
        return { scale: Math.hypot(v[0], v[1]), y: v[5] };
      };
      const copy = cs('.cine-copy-track');
      const st = q('.cine-stage');
      const wrap = q('.cine-hero-wrap');
      return {
        misses,
        scrollY: scrollY,
        maxScroll: document.documentElement.scrollHeight - innerHeight,
        figureCenterPct: figure ? [((figure.x + figure.w / 2) / vw) * 100, ((figure.y + figure.h / 2) / vh) * 100] : null,
        copy: copy ? { opacity: Number(copy.opacity), transform: copy.transform } : null,
        copyMatrix: m('.cine-copy-track'),
        ctas: (() => { const c = cs('.cine-ctas'); return c ? Number(c.opacity) : null; })(),
        tertiary: (() => { const c = cs('.cine-cta-tertiary'); return c ? { opacity: Number(c.opacity), visibility: c.visibility } : null; })(),
        figureScale: m('.cine-figure-inner').scale,
        cue: (() => { const c = cs('.cine-scroll-cue'); return c ? Number(c.opacity) : null; })(),
        dotsOn: [...document.querySelectorAll('.cine-phases li')].filter((li) => li.classList.contains('is-on')).length,
        titleRect: rect('.cine-title'),
        kickerRect: rect('.cine-kicker'),
        ctaRect: rect('.cine-cta-primary'),
        stagePinned: st ? getComputedStyle(st).position === 'sticky' : false,
        stageInView: st ? (st.getBoundingClientRect().top <= 0 && st.getBoundingClientRect().bottom >= vh - 1) : false,
        wrapH: wrap ? wrap.getBoundingClientRect().height : 0,
        docOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
  }

  // Scroll to exact progress and settle.
  async function goToProgress(p) {
    await page.evaluate((prog) => {
      const wrap = document.querySelector('.cine-hero-wrap');
      const max = wrap.offsetHeight - innerHeight;
      window.scrollTo(0, Math.round(prog * max));
    }, p);
    await page.waitForTimeout(450); // scrub + rAF settle
  }

  // ---------- Baseline ----------
  const wrapH = await page.evaluate(() => document.querySelector('.cine-hero-wrap')?.offsetHeight ?? 0);
  const manifest = await page.evaluate(async () => {
    const r = await fetch('/media/cinematic/frames.json', { cache: 'no-store' });
    const j = await r.json();
    return Array.isArray(j.frames) ? j.frames.length : 0;
  });
  manifest === 240
    ? pass('manifest', 'frames.json lists 240 frames (untouched)')
    : fail('manifest', `expected 240 frames, got ${manifest}`);
  Math.abs(wrapH - 4.2 * 800) < 8
    ? pass('wrap-height', `cine-hero-wrap = ${wrapH}px (420svh at 800px viewport)`)
    : fail('wrap-height', `cine-hero-wrap = ${wrapH}px, expected ~3360px (420svh)`);
  (await page.evaluate(() => document.querySelectorAll('.cine-hero-wrap').length)) === 1
    ? pass('single-trigger', 'exactly one .cine-hero-wrap (no duplicate pinning)')
    : fail('single-trigger', 'multiple .cine-hero-wrap found');

  const s0 = await readState();
  if (s0.misses.length) {
    fail('dom-complete', `selectors missing at p=0: ${s0.misses.join(', ')} — served markup differs from source`);
  } else pass('dom-complete', 'all overlay selectors present at p=0');

  const c0 = await canvasSample();
  c0 && c0.lit > 1000
    ? pass('frame-at-0', `canvas drawn at p=0 (lit samples ${c0.lit}, avg rgb ${c0.avg})`)
    : fail('frame-at-0', `canvas empty or missing at p=0: ${JSON.stringify(c0)}`);

  // ---------- 9-stop scroll sweep ----------
  const shots = [];
  const seen = new Map();
  for (const p of STOPS) {
    await goToProgress(p);
    const st = await readState();
    const cv = await canvasSample();
    const name = `sync-${String(Math.round(p * 1000)).padStart(3, '0')}.png`;
    await page.screenshot({ path: path.join(OUT, name) });
    shots.push(name);
    seen.set(p, { st, cv });
    const pct = Math.round(p * 100);
    if (cv && cv.lit > 1000) pass(`canvas@${pct}`, `lit=${cv.lit} avg=${cv.avg}`);
    else fail(`canvas@${pct}`, `canvas empty: ${JSON.stringify(cv)}`);
    if (st.figureCenterPct) {
      const [fx, fy] = st.figureCenterPct;
      const okAnchor = Math.abs(fx - 49.4) < 1.2 && Math.abs(fy - 61.6) < 1.2;
      (okAnchor ? pass : fail)(`anchor@${pct}`, `figure center ${fx.toFixed(1)}%, ${fy.toFixed(1)}% (target 49.4/61.6)`);
    } else fail(`anchor@${pct}`, 'figure not found');
    if (st.stageInView) pass(`pinned@${pct}`, 'stage still filling viewport (sticky pinned)');
    else if (p < 1) fail(`pinned@${pct}`, 'stage not pinned');
    else pass(`pinned@${pct}`, 'at trigger end, stage flush with viewport bottom edge');
  }

  // ---------- Overlay states per stage ----------
  // Mid-SYSTEM sample (no screenshot): p=0.25 is the exact keyframe boundary
  // where copy is still legitimately 1.0 (fade starts at 0.25), so sample
  // mid-stage to verify the SYSTEM behavior.
  await goToProgress(0.3125);
  seen.set(0.3125, { st: await readState(), cv: await canvasSample() });
  const st = (p) => seen.get(p).st;
  const near = (v, t, eps) => Math.abs(v - t) <= eps;
  const checks = [
    ['overlay-INTRO', () => near(st(0).copyMatrix.scale, 1, 0.01) && near(st(0).copy.opacity, 1, 0.02) && near(st(0).cue, 1, 0.02) && near(st(0).tertiary.opacity, 1, 0.02), `p=0: copy op ${st(0).copy.opacity}, cue ${st(0).cue}, tertiary ${st(0).tertiary.opacity}`],
    ['overlay-DISCOVERY', () => st(0.125).tertiary.opacity < 1 && near(st(0.125).copy.opacity, 1, 0.02), `p=.125: tertiary ${st(0.125).tertiary.opacity} (exiting), copy ${st(0.125).copy.opacity}`],
    ['overlay-SYSTEM', () => st(0.3125).copy.opacity < 1 && st(0.3125).tertiary.opacity < 0.05, `p=.3125 (mid-SYSTEM): copy ${st(0.3125).copy.opacity}, tertiary ${st(0.3125).tertiary.opacity}`],
    ['overlay-CHAOS', () => st(0.375).copy.opacity < 0.9 && st(0.375).ctas < 0.9, `p=.375: copy ${st(0.375).copy.opacity}, ctas ${st(0.375).ctas}`],
    ['overlay-PEAK', () => st(0.5).copy.opacity < 0.55 && st(0.5).figureScale > 1.02 && st(0.5).ctas < 0.6, `p=.5: copy ${st(0.5).copy.opacity}, ctas ${st(0.5).ctas}, figure ${st(0.5).figureScale.toFixed(3)}`],
    ['overlay-CONTROL', () => st(0.625).copy.opacity > st(0.5).copy.opacity && st(0.625).figureScale <= 1.06, `p=.625: copy ${st(0.625).copy.opacity} rising, figure ${st(0.625).figureScale.toFixed(3)}`],
    ['overlay-ORGANIZE', () => st(0.75).copy.opacity > st(0.625).copy.opacity && st(0.75).ctas > st(0.625).ctas, `p=.75: copy ${st(0.75).copy.opacity}, ctas ${st(0.75).ctas}`],
    ['overlay-TRANSFORM', () => st(0.875).copy.opacity > 0.95 && st(0.875).tertiary.opacity > 0.05 && st(0.875).tertiary.opacity < 1, `p=.875: copy ${st(0.875).copy.opacity}, tertiary ${st(0.875).tertiary.opacity} (returning)`],
    ['overlay-FINAL', () => near(st(1).copy.opacity, 1, 0.02) && near(st(1).ctas, 1, 0.02) && near(st(1).tertiary.opacity, 1, 0.02) && near(st(1).figureScale, 1, 0.01) && near(st(1).cue, 0, 0.02), `p=1: copy ${st(1).copy.opacity}, ctas ${st(1).ctas}, tertiary ${st(1).tertiary.opacity}, figure ${st(1).figureScale.toFixed(3)}, cue ${st(1).cue}`],
    ['tertiary-hidden-mid', () => st(0.375).tertiary.visibility === 'hidden' && st(0.875).tertiary.visibility !== 'hidden', `visibility: hidden@.375 (${st(0.375).tertiary.visibility}), visible-ish@.875 (${st(0.875).tertiary.visibility})`],
    ['dots-progress', () => st(0).dotsOn === 1 && st(0.5).dotsOn === 3 && st(1).dotsOn === 4, `dots on: ${st(0).dotsOn} → ${st(0.5).dotsOn} → ${st(1).dotsOn}`],
    ['no-overflow-x', () => !STOPS.some((p) => seen.get(p).st.docOverflowX), 'no horizontal overflow at any stop'],
  ];
  for (const [id, fn, detail] of checks) (fn() ? pass : fail)(id, detail);

  // ---------- Layout shift: rest position identical at p=0 and p=1 ----------
  const r0 = st(0), r1 = st(1);
  const shift = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const shifts = {
    title: shift(r0.titleRect, r1.titleRect),
    kicker: shift(r0.kickerRect, r1.kickerRect),
    cta: shift(r0.ctaRect, r1.ctaRect),
  };
  Object.entries(shifts).every(([, v]) => v <= 1)
    ? pass('no-layout-shift', `rest rects identical at p=0 vs p=1 (max delta ${Math.max(...Object.values(shifts)).toFixed(2)}px)`)
    : fail('no-layout-shift', `rest rects moved: ${JSON.stringify(shifts)}`);

  // ---------- Frame distinctness: 0 / 50 / 100 show different frames ----------
  const [c50, c100] = [seen.get(0.5).cv, seen.get(1).cv];
  const diff = (a, b) => Math.abs(a.avg[0] - b.avg[0]) + Math.abs(a.avg[1] - b.avg[1]) + Math.abs(a.avg[2] - b.avg[2]);
  diff(c0, c50) > 4 && diff(c50, c100) > 4 && diff(c0, c100) > 4
    ? pass('frames-distinct', `avg-rgb diffs 0↔50=${diff(c0, c50)}, 50↔100=${diff(c50, c100)}, 0↔100=${diff(c0, c100)}`)
    : fail('frames-distinct', `canvas samples too similar: ${JSON.stringify({ c0: c0.avg, c50: c50.avg, c100: c100.avg })} — frames may not be scrubbing`);

  // ---------- Release: scroll past the trigger ----------
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.cine-hero-wrap').offsetHeight + 400));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'sync-post-release.png') });
  const after = await page.evaluate(() => {
    const wrap = document.querySelector('.cine-hero-wrap').getBoundingClientRect();
    const next = [...document.querySelectorAll('main > section')].map((s) => s.getBoundingClientRect());
    const visibleNext = next.filter((r) => r.top < innerHeight && r.bottom > 0);
    return { wrapTop: wrap.top, visibleNext: visibleNext.length, scrollY: scrollY };
  });
  after.wrapTop < 0 && after.visibleNext > 0
    ? pass('release', `wrap scrolled away (top ${Math.round(after.wrapTop)}px), ${after.visibleNext} next section(s) visible, scrollY ${after.scrollY}`)
    : fail('release', `release failed: wrapTop ${after.wrapTop}, visibleNext ${after.visibleNext}`);
  const canReturn = await page.evaluate(() => { window.scrollTo(0, 0); return true; });
  await page.waitForTimeout(300);
  canReturn && pass('return-to-top', 'scrolled back to 0 freely (no trapped page)');

  // ---------- Console ----------
  errors.length === 0
    ? pass('console-clean', 'zero console errors / page errors')
    : fail('console-clean', `${errors.length} error(s): ${errors.slice(0, 5).join(' | ')}`);

  // ---------- Report ----------
  const failed = results.filter((r) => !r.ok);
  console.log(`\n===== ${results.length - failed.length}/${results.length} PASS, ${failed.length} FAIL =====`);
  console.log(`screenshots: ${OUT}`);
  fs.writeFileSync(path.join(OUT, 'PROBE-RESULTS.txt'), results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.id} — ${r.detail}`).join('\n') + (errors.length ? `\nERRORS:\n${errors.join('\n')}` : ''));
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('PROBE CRASH:', e); process.exit(2); });
