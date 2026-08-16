// Left-rail rewrite probe: settings visibility + horizontal overflow across viewports.
import { chromium } from 'playwright';

const browser = await chromium.launch();

async function check(viewport, label) {
  const page = await browser.newPage({ viewport });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,a')].find(x => /TRY LIVE DEMO/i.test(x.innerText || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(3500);
  const out = await page.evaluate(() => {
    const rail = document.querySelector('#instrument-rail');
    const railW = rail ? rail.getBoundingClientRect().width : 0;
    const settingsBtn = document.querySelector('#settings-btn');
    const settingsCollapsed = document.querySelector('#settings-btn-collapsed');
    const logo = document.querySelector('#sidebar-logo');
    const doc = document.documentElement;
    const sb = document.body;
    const toggle = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-controls') === 'instrument-rail');
    const toggleRect = toggle ? toggle.getBoundingClientRect() : null;
    const railRect = rail ? rail.getBoundingClientRect() : null;
    return {
      railW: Math.round(railW),
      settingsBtnVisible: !!settingsBtn && settingsBtn.getBoundingClientRect().width > 0,
      settingsCollapsedPresent: !!settingsCollapsed,
      railCollapsed: rail ? rail.classList.contains('w-20') : null,
      logoVisible: !!logo && logo.getBoundingClientRect().width > 0,
      pageHScroll: sb.scrollWidth > sb.clientWidth || doc.scrollWidth > doc.clientWidth,
      pageScrollW: Math.max(sb.scrollWidth, doc.scrollWidth),
      pageClientW: doc.clientWidth,
      railScrollW: rail ? rail.scrollWidth : 0,
      railClientW: rail ? rail.clientWidth : 0,
      railHScroll: rail ? rail.scrollWidth > rail.clientWidth : null,
      toggleCenterMinusRailRight: toggleRect && railRect ? Math.round(toggleRect.x + toggleRect.width / 2 - railRect.right) : null,
    };
  });
  console.log(label, JSON.stringify(out));
  await page.close();
}

await check({ width: 1440, height: 900 }, 'desktop-1440x900');
await check({ width: 1280, height: 720 }, 'laptop-1280x720');
await check({ width: 1280, height: 640 }, 'short-1280x640');
await check({ width: 1100, height: 800 }, 'icon-rail-1100x800');
await check({ width: 390, height: 844 }, 'mobile-390x844');
await browser.close();