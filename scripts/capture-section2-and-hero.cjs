const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'visual-qa', 'redesign');
const ARTIFACT_DIR = 'C:\\Users\\MSI\\.gemini\\antigravity-cli\\brain\\0c05c437-9fab-4142-9b11-f89ddf73db8c';

async function main() {
  const browser = await chromium.launch();
  try {
    // 1. Desktop 1440x900 - Refined Hero Text
    console.log('Capturing Desktop Refined Hero...');
    const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageDesktop.waitForSelector('.cine-title', { timeout: 10000 });
    await pageDesktop.waitForTimeout(1000);
    
    await pageDesktop.screenshot({ path: path.join(OUT_DIR, '14-desktop-hero-refined-text.png') });
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '14-desktop-hero-refined-text.png') });
    console.log('Saved 14-desktop-hero-refined-text.png');

    // 2. Desktop 1440x900 - Section 2 Centered
    console.log('Scrolling to Section 2 (#philosophy)...');
    const section2 = pageDesktop.locator('#philosophy');
    await section2.scrollIntoViewIfNeeded();
    await pageDesktop.waitForTimeout(1000);
    
    await pageDesktop.screenshot({ path: path.join(OUT_DIR, '15-desktop-section2-centered.png') });
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '15-desktop-section2-centered.png') });
    console.log('Saved 15-desktop-section2-centered.png');

    // 3. Mobile 390x844 - Refined Hero Text & Section 2
    console.log('Capturing Mobile 390x844...');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageMobile.waitForSelector('.cine-title', { timeout: 10000 });
    await pageMobile.waitForTimeout(1000);
    
    await pageMobile.screenshot({ path: path.join(OUT_DIR, '16-mobile-hero-refined-text.png') });
    await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, '16-mobile-hero-refined-text.png') });
    console.log('Saved 16-mobile-hero-refined-text.png');

    // Mobile Section 2
    const section2Mobile = pageMobile.locator('#philosophy');
    await section2Mobile.scrollIntoViewIfNeeded();
    await pageMobile.waitForTimeout(1000);
    await pageMobile.screenshot({ path: path.join(OUT_DIR, '17-mobile-section2-centered.png') });
    await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, '17-mobile-section2-centered.png') });
    console.log('Saved 17-mobile-section2-centered.png');

    console.log('All Section 2 and Hero captures finished successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main();
