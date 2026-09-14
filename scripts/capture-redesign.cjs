const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, 'docs', 'visual-qa', 'redesign');
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function serveDist(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      let filePath = path.join(DIST, urlPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // SPA rewrite
        const indexHtml = path.join(DIST, 'index.html');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexHtml).pipe(res);
      }
    });

    server.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function main() {
  const PORT = 4192;
  const server = await serveDist(PORT);

  const browser = await chromium.launch();
  try {
    // 1. Desktop 1440x900
    console.log('Capturing Desktop 1440x900...');
    const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(2000); // Allow backdrop + Bakasur to settle
    await pageDesktop.screenshot({ path: path.join(OUT_DIR, '01-desktop-hero-1440.png') });
    console.log('Saved 01-desktop-hero-1440.png');

    // 2. Interactive quest completion
    console.log('Testing Interactive Quest Card click...');
    const questRow = pageDesktop.locator('.card-quest-row');
    if (await questRow.isVisible()) {
      await questRow.click();
      await pageDesktop.waitForTimeout(1000);
      await pageDesktop.screenshot({ path: path.join(OUT_DIR, '02-desktop-quest-completed.png') });
      console.log('Saved 02-desktop-quest-completed.png');
    }

    // 3. Scroll down to capture downstream sections
    console.log('Capturing downstream sections...');
    await pageDesktop.evaluate(() => window.scrollTo({ top: 3600, behavior: 'instant' }));
    await pageDesktop.waitForTimeout(1500);
    await pageDesktop.screenshot({ path: path.join(OUT_DIR, '03-desktop-philosophy.png') });
    console.log('Saved 03-desktop-philosophy.png');

    // 4. Mobile 390x844
    console.log('Capturing Mobile 390x844...');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await pageMobile.waitForTimeout(2000);
    await pageMobile.screenshot({ path: path.join(OUT_DIR, '04-mobile-hero-390.png') });
    console.log('Saved 04-mobile-hero-390.png');

    console.log('All visual QA captures completed successfully!');
  } catch (err) {
    console.error('Visual capture error:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

main();
