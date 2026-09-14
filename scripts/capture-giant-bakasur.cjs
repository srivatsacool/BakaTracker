const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'visual-qa', 'redesign');

async function main() {
  const browser = await chromium.launch();
  try {
    // 1. Desktop 1440x900 - Rest State
    console.log('Capturing Desktop 1440x900 Rest State...');
    const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(2000);
    await pageDesktop.screenshot({ path: path.join(OUT_DIR, '06-desktop-giant-rest.png') });
    console.log('Saved 06-desktop-giant-rest.png');

    // 2. Desktop 1440x900 - Hover / Peek State
    console.log('Hovering over Bakasur interaction zone...');
    const hoverZone = pageDesktop.locator('.cine-bakasur-hover-zone');
    await hoverZone.hover();
    await pageDesktop.waitForTimeout(1000); // Allow peek + dialogue animation to complete
    await pageDesktop.screenshot({ path: path.join(OUT_DIR, '07-desktop-giant-peek.png') });
    console.log('Saved 07-desktop-giant-peek.png');

    // 3. Mobile 390x844 - Mobile Rest & Tap
    console.log('Capturing Mobile 390x844...');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
    await pageMobile.waitForTimeout(1500);
    await pageMobile.screenshot({ path: path.join(OUT_DIR, '08-mobile-giant-rest.png') });
    console.log('Saved 08-mobile-giant-rest.png');

    // Tap to peek on mobile
    await pageMobile.locator('.cine-bakasur-hover-zone').click({ force: true });
    await pageMobile.waitForTimeout(1000);
    await pageMobile.screenshot({ path: path.join(OUT_DIR, '09-mobile-giant-peek.png') });
    console.log('Saved 09-mobile-giant-peek.png');

    console.log('All captures finished!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main();
