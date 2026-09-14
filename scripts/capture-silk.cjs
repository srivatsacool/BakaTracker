const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MSI\\.gemini\\antigravity-cli\\brain\\0c05c437-9fab-4142-9b11-f89ddf73db8c';

async function main() {
  const browser = await chromium.launch();
  try {
    console.log('Capturing Desktop 1440x900 clean background...');
    const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageDesktop.waitForSelector('.cine-title', { timeout: 10000 });
    await pageDesktop.waitForTimeout(1000);

    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, '23-desktop-hero-clean.png') });
    console.log('Saved 23-desktop-hero-clean.png');

    console.log('Capturing Mobile 390x844 clean background...');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageMobile.waitForSelector('.cine-title', { timeout: 10000 });
    await pageMobile.waitForTimeout(1000);

    await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, '24-mobile-hero-clean.png') });
    console.log('Saved 24-mobile-hero-clean.png');

    console.log('All Silk captures completed successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main();
