import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
for (const [route, name] of [['/', 'landing'], ['/today', 'today']]) {
  await page.goto('http://localhost:5175' + route, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `scripts/shot-${name}.jpg`, type: 'jpeg', quality: 55 });
}
// also a tunnel-only crop: hide content to see the raw background
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx2.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const p2 = await ctx2.newPage();
await p2.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 90000 });
await p2.waitForTimeout(2500);
await p2.evaluate(() => {
  document.querySelector('#root > div:not(.obs-background)')?.remove?.();
  document.body.style.background = 'transparent';
});
await p2.waitForTimeout(400);
await p2.screenshot({ path: 'scripts/shot-tunnel-only.jpg', type: 'jpeg', quality: 55 });
await browser.close();
console.log('done');
