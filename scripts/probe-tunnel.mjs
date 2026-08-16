// Probe: LightTunnel world foundation (Phase F1+F2)
// - tunnel canvas mounts, WebGL context created, rAF loop alive
// - readability overlay sits between tunnel and app content (stacking)
// - zero console/page errors on / and /today
// - WCAG contrast scan of visible text (approx effective background)
// - prefers-reduced-motion -> static stand-in, no canvas
import { chromium } from 'playwright';

const BASE = 'http://localhost:5175';
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
    // composite translucent backgrounds bottom-up: element bg over ancestor bg over body bg
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
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    if (el.closest('.obs-background')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const txt = (el.textContent || '').trim();
    if (!txt) continue;
    const ownText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!ownText) continue;
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
    if (r < need) {
      out.violations.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 3).join(' '),
        txt: txt.slice(0, 40),
        size: size.toFixed(1),
        ratio: r.toFixed(2),
        need: need,
        bg: bgHex,
      });
    }
  }
  out.violations.sort((a, b) => a.ratio - b.ratio);
  return out;
})()`;

async function probePage(route, { reduced = false, label } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  const res = { route, label, reduced, errors: [], tunnel: null, overlay: null, rAF: 0, violations: [] };
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2200);
    res.tunnel = await page.evaluate(() => {
      const bg = document.querySelector('.obs-background');
      const layer = document.querySelector('.obs-tunnel-layer');
      const canvas = layer ? layer.querySelector('canvas') : null;
      let glInfo = null;
      if (canvas) {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          glInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'context-ok';
        }
      }
      return {
        bgExists: !!bg,
        bgPos: bg ? getComputedStyle(bg).position : null,
        bgZ: bg ? getComputedStyle(bg).zIndex : null,
        bgPointer: bg ? getComputedStyle(bg).pointerEvents : null,
        layerExists: !!layer,
        canvasMounted: !!canvas,
        canvasW: canvas ? canvas.width : 0,
        canvasH: canvas ? canvas.height : 0,
        glInfo: glInfo,
      };
    });
    res.overlay = await page.evaluate(() => {
      const ov = document.querySelector('.obs-readability-overlay');
      if (!ov) return null;
      const cs = getComputedStyle(ov);
      return { z: cs.zIndex, pos: cs.position, pointer: cs.pointerEvents, bg: cs.backgroundImage.slice(0, 60) + '…' };
    });
    // rAF liveness: count rAF callbacks over 500ms (tunnel loop re-registers every frame)
    res.rAF = await page.evaluate(() => new Promise(resolve => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 500) requestAnimationFrame(tick); else resolve(n); };
      requestAnimationFrame(tick);
    }));
    res.violations = await page.evaluate(CONTRAST_SRC);
    await page.screenshot({ path: `scripts/probe-tunnel-${label || route.replace(/[^a-z]/g, '')}.png`, fullPage: false });
  } catch (e) {
    res.errors.push('PROBE-FAIL: ' + String(e).slice(0, 200));
  }
  res.errors = errors;
  await ctx.close();
  return res;
}

const out = {};
out.landing = await probePage('/', { label: 'landing' });
out.today = await probePage('/today', { label: 'today' });
out.landingReduced = await probePage('/', { reduced: true, label: 'landing-reduced' });

console.log(JSON.stringify(out, null, 1));
await browser.close();
