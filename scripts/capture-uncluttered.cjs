const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'visual-qa', 'redesign');
const ARTIFACT_DIR = 'C:\\Users\\MSI\\.gemini\\antigravity-cli\\brain\\0c05c437-9fab-4142-9b11-f89ddf73db8c';

async function main() {
  const browser = await chromium.launch();
  try {
    // 1. Desktop 1440x900 - Rest State
    console.log('Capturing Desktop 1440x900 Rest State...');
    const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageDesktop.waitForSelector('.cine-title', { timeout: 10000 });
    await pageDesktop.waitForTimeout(1000);
    
    const restPathDoc = path.join(OUT_DIR, '10-desktop-uncluttered-rest.png');
    const restPathArtifact = path.join(ARTIFACT_DIR, '10-desktop-uncluttered-rest.png');
    await pageDesktop.screenshot({ path: restPathDoc });
    await pageDesktop.screenshot({ path: restPathArtifact });
    console.log('Saved 10-desktop-uncluttered-rest.png');

    // 2. Desktop 1440x900 - Hover / Peek State
    console.log('Hovering over Bakasur interaction zone...');
    const hoverZone = pageDesktop.locator('.cine-bakasur-hover-zone');
    await hoverZone.hover();
    await pageDesktop.waitForTimeout(1000); // Allow peek + dialogue animation to complete
    
    const peekPathDoc = path.join(OUT_DIR, '11-desktop-uncluttered-peek.png');
    const peekPathArtifact = path.join(ARTIFACT_DIR, '11-desktop-uncluttered-peek.png');
    await pageDesktop.screenshot({ path: peekPathDoc });
    await pageDesktop.screenshot({ path: peekPathArtifact });
    console.log('Saved 11-desktop-uncluttered-peek.png');

    // 3. Mobile 390x844 - Rest & Tap
    console.log('Capturing Mobile 390x844...');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageMobile.waitForSelector('.cine-title', { timeout: 10000 });
    await pageMobile.waitForTimeout(1000);
    
    await pageMobile.screenshot({ path: path.join(OUT_DIR, '12-mobile-uncluttered-rest.png') });
    await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, '12-mobile-uncluttered-rest.png') });
    console.log('Saved 12-mobile-uncluttered-rest.png');

    // Tap to peek on mobile
    await pageMobile.locator('.cine-bakasur-hover-zone').click({ force: true });
    await pageMobile.waitForTimeout(1000);
    await pageMobile.screenshot({ path: path.join(OUT_DIR, '13-mobile-uncluttered-peek.png') });
    await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, '13-mobile-uncluttered-peek.png') });
    console.log('Saved 13-mobile-uncluttered-peek.png');

    console.log('All captures finished!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main();
