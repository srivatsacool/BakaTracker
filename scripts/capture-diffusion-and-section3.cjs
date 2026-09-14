const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'visual-qa', 'redesign');
const ARTIFACT_DIR = 'C:\\Users\\MSI\\.gemini\\antigravity-cli\\brain\\0c05c437-9fab-4142-9b11-f89ddf73db8c';

async function main() {
  const browser = await chromium.launch();
  try {
    // 1. Desktop 1440x900 - Hero Enhanced Diffusion Rest State
    console.log('Capturing Desktop Enhanced Diffusion Rest...');
    const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageDesktop.waitForSelector('.cine-title', { timeout: 10000 });
    await pageDesktop.waitForTimeout(1000);
    
    await pageDesktop.screenshot({ path: path.join(OUT_DIR, '18-desktop-hero-diffusion.png') });
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '18-desktop-hero-diffusion.png') });
    console.log('Saved 18-desktop-hero-diffusion.png');

    // 2. Desktop 1440x900 - Section 3 Centered (#story)
    console.log('Scrolling to Section 3 (#story)...');
    const section3 = pageDesktop.locator('#story');
    await section3.scrollIntoViewIfNeeded();
    await pageDesktop.waitForTimeout(1000);
    
    await pageDesktop.screenshot({ path: path.join(OUT_DIR, '19-desktop-section3-centered.png') });
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '19-desktop-section3-centered.png') });
    console.log('Saved 19-desktop-section3-centered.png');

    // 4. Mobile 390x844 - Section 3 Centered
    console.log('Capturing Mobile Section 3...');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageMobile.waitForSelector('#story', { timeout: 10000 });
    const section3Mobile = pageMobile.locator('#story');
    await section3Mobile.scrollIntoViewIfNeeded();
    await pageMobile.waitForTimeout(1000);
    await pageMobile.screenshot({ path: path.join(OUT_DIR, '20-mobile-section3-centered.png') });
    await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, '20-mobile-section3-centered.png') });
    console.log('Saved 20-mobile-section3-centered.png');

    console.log('All diffusion and Section 3 captures finished successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main();
