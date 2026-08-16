// Verify landing renders with the live variant wrapper + zero errors.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message.slice(0, 120)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const out = await page.evaluate(() => {
  const wrappers = document.querySelectorAll('[data-impeccable-variant]').length;
  const header = document.querySelector('header');
  const brand = header?.querySelector('b')?.textContent || '';
  const navLink = header?.querySelector('nav a')?.textContent || '';
  const visibleVariant = [...document.querySelectorAll('[data-impeccable-variant]')].find(d => d.getBoundingClientRect().width > 0 && d.querySelector('header'))?.getAttribute('data-impeccable-variant');
  return { wrappers, brand, navLink, visibleVariant, pageHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth };
});
console.log(JSON.stringify({ out, errors }));
await browser.close();