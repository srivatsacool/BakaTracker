// Settings modal rendering probe — geometry, visibility, overlap, errors (desktop + mobile).
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 140)));

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,a')].find(x => /TRY LIVE DEMO/i.test(x.innerText || ''));
  if (b) b.click();
});
await page.waitForTimeout(3500);

// Open settings via the left-nav button
const opened = await page.evaluate(() => {
  const btn = document.querySelector('#settings-btn') || [...document.querySelectorAll('button')].find(b => /Settings/i.test(b.getAttribute('aria-label') || b.title || ''));
  if (!btn) return false;
  btn.click();
  return true;
});
await page.waitForTimeout(1200);

const dump = () => page.evaluate(() => {
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return { dialog: 'NOT FOUND' };
  const r = dlg.getBoundingClientRect();
  const overlay = dlg.parentElement.getBoundingClientRect();
  const sections = [...dlg.querySelectorAll('.f11-settings-section')].map(s => {
    const b = s.getBoundingClientRect();
    const cs = getComputedStyle(s);
    return { top: Math.round(b.top), h: Math.round(b.height), visible: b.height > 0 && cs.display !== 'none' };
  });
  const title = dlg.querySelector('#settings-modal-title');
  const tc = title ? getComputedStyle(title).color : 'n/a';
  const bodyColor = getComputedStyle(dlg).color;
  return {
    dlgRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    overlayRect: { w: Math.round(overlay.width), h: Math.round(overlay.height) },
    centered: Math.abs((overlay.width - r.width) / 2 - r.x) < 40,
    sections,
    titleColor: tc,
    bodyColor,
    scrollH: dlg.scrollHeight, clientH: dlg.clientHeight,
    overflowY: getComputedStyle(dlg).overflowY,
    display: getComputedStyle(dlg).display,
  };
});

const desktop = await dump();

// Mobile: bottom-sheet behavior
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  const close = document.querySelector('[aria-label="Close settings"]');
  if (close) close.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const btn = document.querySelector('#settings-btn') || [...document.querySelectorAll('button')].find(b => /Settings/i.test(b.getAttribute('aria-label') || b.title || ''));
  if (btn) btn.click();
});
await page.waitForTimeout(1000);
const mobile = await dump();

console.log(JSON.stringify({ opened, desktop, mobile, errors }, null, 1));
await browser.close();