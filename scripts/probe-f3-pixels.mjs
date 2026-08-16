// Pixel analysis of F3 screenshots via canvas sampling in headless chromium
// (PIL in the hermes venv is broken: _imaging import error)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const browser = await chromium.launch();
const page = await browser.newPage();

async function sample(file) {
  const b64 = readFileSync(path.join('scripts', file)).toString('base64');
  await page.setContent(`<img id="i" src="data:image/png;base64,${b64}">`);
  await page.waitForTimeout(300);
  return await page.evaluate(() => {
    const img = document.getElementById('i');
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const W = c.width;
    const at = (x, y) => {
      const i = (y * W + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
    const lum = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
    const o = { W, H: c.height, points: {}, mean: {}, violet: {} };
    const add = (k, x, y) => { const p = at(x, y); o.points[k] = { rgb: p.join(','), lum: Math.round(lum(p)) }; };
    add('outsideLeft', 8, 450);
    add('outsideTop', 720, 10);
    add('outsideRight', 1435, 450);
    add('insideFrame', 700, 450);
    add('sidebar', 60, 450);
    add('railEdge', 1410, 450);
    // violet-ish pixels in left margin strip (tunnel visible around frame)
    let violet = 0;
    for (let y = 0; y < 900; y += 3) {
      for (let x = 2; x < 18; x++) {
        const p = at(x, y);
        if (p[2] > p[0] + 40 && p[2] > p[1] + 30) violet++;
      }
    }
    o.violet.leftMargin = violet;
    // mean luminance: inside frame vs margins
    let inSum = 0, inN = 0, outSum = 0, outN = 0;
    for (let y = 40; y < 860; y += 6) {
      for (let x = 40; x < 1400; x += 6) { inSum += lum(at(x, y)); inN++; }
      for (let x = 2; x < 18; x++) { outSum += lum(at(x, y)); outN++; }
    }
    o.mean.inside = Math.round(inSum / inN);
    o.mean.margin = Math.round(outSum / outN);
    // tablet horizontal scan at y=400
    if (W === 1000) {
      o.hScan = [];
      for (let x = 10; x <= 120; x += 10) o.hScan.push([x, at(x, 400).join(',')]);
    }
    // mobile bottom nav strip
    if (W === 390) {
      const n = at(195, 830);
      o.points.mobileNav = { rgb: n.join(','), lum: Math.round(lum(n)) };
      const m = at(195, 400);
      o.points.mobileMid = { rgb: m.join(','), lum: Math.round(lum(m)) };
    }
    return o;
  });
}

const out = {};
out.desktop = await sample('probe-f3-today.png');
out.tablet = await sample('probe-f3-tablet.png');
out.mobile = await sample('probe-f3-mobile.png');
console.log(JSON.stringify(out, null, 1));
await browser.close();
