const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MSI\\.gemini\\antigravity-cli\\brain\\0c05c437-9fab-4142-9b11-f89ddf73db8c';

async function main() {
  const browser = await chromium.launch();
  try {
    const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageDesktop.waitForSelector('.cine-title', { timeout: 10000 });
    await pageDesktop.waitForTimeout(1000);

    // 1. Desktop - Hero bottom / Transition into Section 2 (exact area circled by user)
    console.log('Capturing Hero-to-Section-2 transition...');
    await pageDesktop.evaluate(() => window.scrollTo(0, window.innerHeight * 0.65));
    await pageDesktop.waitForTimeout(600);
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '25-desktop-hero-transition-diffuse.png') });
    console.log('Saved 25-desktop-hero-transition-diffuse.png');

    // 2. Desktop - Section 2 (#philosophy) centered with ambient lighting
    console.log('Capturing Section 2 (#philosophy)...');
    const sec2 = pageDesktop.locator('#philosophy');
    await sec2.scrollIntoViewIfNeeded();
    await pageDesktop.waitForTimeout(600);
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '26-desktop-section2-lighting.png') });
    console.log('Saved 26-desktop-section2-lighting.png');

    // 3. Desktop - Section 3 (#story) with ambient lighting
    console.log('Capturing Section 3 (#story)...');
    const sec3 = pageDesktop.locator('#story');
    await sec3.scrollIntoViewIfNeeded();
    await pageDesktop.waitForTimeout(600);
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '27-desktop-section3-lighting.png') });
    console.log('Saved 27-desktop-section3-lighting.png');

    // 4. Desktop - Section 4 (#walkthrough) with ambient lighting
    console.log('Capturing Section 4 (#walkthrough)...');
    const sec4 = pageDesktop.locator('#walkthrough');
    await sec4.scrollIntoViewIfNeeded();
    await pageDesktop.waitForTimeout(600);
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '28-desktop-section4-lighting.png') });
    console.log('Saved 28-desktop-section4-lighting.png');

    // 5. Desktop - Section 5 (#bakasur) & Section 6 (#enter)
    console.log('Capturing Final CTA (#enter)...');
    const secEnter = pageDesktop.locator('#enter');
    await secEnter.scrollIntoViewIfNeeded();
    await pageDesktop.waitForTimeout(600);
    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '29-desktop-final-lighting.png') });
    console.log('Saved 29-desktop-final-lighting.png');

    // 6. Mobile - Transition
    console.log('Capturing Mobile Transition...');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageMobile.waitForSelector('.cine-title', { timeout: 10000 });
    await pageMobile.evaluate(() => window.scrollTo(0, window.innerHeight * 0.65));
    await pageMobile.waitForTimeout(600);
    await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, '30-mobile-hero-transition-diffuse.png') });
    console.log('Saved 30-mobile-hero-transition-diffuse.png');

    console.log('All diffuse lighting captures finished successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main();
