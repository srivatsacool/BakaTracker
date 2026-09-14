const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MSI\\.gemini\\antigravity-cli\\brain\\0c05c437-9fab-4142-9b11-f89ddf73db8c';

async function main() {
  const browser = await chromium.launch();
  try {
    // 1. 1920x1080 (matching user's screen)
    console.log('Capturing Desktop 1920x1080 hero diffusion...');
    const ctxFHD = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const pageFHD = await ctxFHD.newPage();
    await pageFHD.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await pageFHD.waitForSelector('.cine-title', { timeout: 10000 });
    await pageFHD.waitForTimeout(1000);

    await pageFHD.screenshot({ path: path.join(ARTIFACT_DIR, '31-desktop-1080p-hero-diffusion-smooth.png') });
    console.log('Saved 31-desktop-1080p-hero-diffusion-smooth.png');

    // 2. 1440x900
    console.log('Capturing Desktop 1440x900 hero diffusion...');
    const ctx1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1440 = await ctx1440.newPage();
    await page1440.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await page1440.waitForSelector('.cine-title', { timeout: 10000 });
    await page1440.waitForTimeout(1000);

    await page1440.screenshot({ path: path.join(ARTIFACT_DIR, '32-desktop-1440-hero-diffusion-smooth.png') });
    console.log('Saved 32-desktop-1440-hero-diffusion-smooth.png');

    console.log('All smooth diffusion captures finished successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main();
