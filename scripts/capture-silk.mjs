import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Desktop
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const pageDesktop = await contextDesktop.newPage();
  pageDesktop.on('console', msg => console.log('PAGE LOG:', msg.text()));
  pageDesktop.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await pageDesktop.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await pageDesktop.waitForTimeout(3000); // let WebGL Silk render
  await pageDesktop.screenshot({
    path: 'C:/Users/MSI/.gemini/antigravity-cli/brain/0c05c437-9fab-4142-9b11-f89ddf73db8c/21-desktop-hero-silk.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
    timeout: 10000
  });

  // Mobile
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const pageMobile = await contextMobile.newPage();
  await pageMobile.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(2000);
  await pageMobile.screenshot({
    path: 'C:/Users/MSI/.gemini/antigravity-cli/brain/0c05c437-9fab-4142-9b11-f89ddf73db8c/22-mobile-hero-silk.png',
    clip: { x: 0, y: 0, width: 390, height: 844 }
  });

  await browser.close();
  console.log('Silk captures finished successfully');
})();
