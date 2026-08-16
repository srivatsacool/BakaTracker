import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const p = await ctx.newPage();
await p.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(2500);
// remove content AND overlay -> raw tunnel only
await p.evaluate(() => {
  const root = document.getElementById('root');
  for (const child of [...root.children]) {
    if (!child.classList.contains('obs-background')) child.remove();
  }
  document.querySelector('.obs-readability-overlay')?.remove();
});
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/shot-tunnel-raw.jpg', type: 'jpeg', quality: 55 });
// also a variance check: two frames a moment apart
const data = await p.evaluate(async () => {
  const canvas = document.querySelector('.obs-tunnel-layer canvas');
  if (!canvas) return { err: 'no canvas' };
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return { err: 'no gl' };
  // readPixels on a fresh frame: schedule inside rAF and read immediately
  return await new Promise(resolve => {
    let frames = 0;
    const t0 = performance.now();
    const buf = new Uint8Array(64 * 64 * 4);
    let snapshot1 = null;
    const tick = () => {
      frames++;
      const el = performance.now() - t0;
      if (el < 900) requestAnimationFrame(tick);
      else resolve({ frames, fps: (frames / (el / 1000)).toFixed(1) });
    };
    requestAnimationFrame(tick);
  });
});
console.log(JSON.stringify(data));
await browser.close();
