/* V3.5 Visual QA — takes screenshots of all key routes at desktop + mobile sizes */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5180';
const QA_DIR = 'D:/Brain/03_Projects/BakaTracker/visual-qa/v35-mobile-polish';

const ROUTES = [
  { path: '/', name: 'landing' },
  { path: '/today', name: 'today' },
  { path: '/habits', name: 'habits' },
  { path: '/tasks', name: 'tasks' },
  { path: '/eisenhower', name: 'eisenhower' },
  { path: '/journal', name: 'journal' },
  { path: '/journey', name: 'journey' },
  { path: '/bakasur', name: 'bakasur' },
];

const VIEWPORTS = [
  { w: 1440, h: 900, label: 'desktop-1440' },
  { w: 390, h: 844, label: 'mobile-390' },
  { w: 375, h: 812, label: 'mobile-375' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    
    // Navigate to landing first to trigger demo data load
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    for (const route of ROUTES) {
      try {
        await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1000);
        const path = `${QA_DIR}/${vp.label}-${route.name}.png`;
        await page.screenshot({ path, fullPage: true });
        results.push(`OK  ${vp.label} ${route.name}`);
      } catch (e) {
        results.push(`FAIL ${vp.label} ${route.name}: ${String(e).slice(0, 80)}`);
      }
    }
    
    // Mobile: test More sheet
    if (vp.w < 768) {
      try {
        await page.goto(`${BASE}/today`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(500);
        const moreBtn = page.locator('button[aria-label="More sections"]');
        if (await moreBtn.isVisible()) {
          await moreBtn.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: `${QA_DIR}/${vp.label}-more-sheet.png`, fullPage: false });
          results.push(`OK  ${vp.label} more-sheet`);
        } else {
          results.push(`SKIP ${vp.label} more-sheet: button not found`);
        }
      } catch (e) {
        results.push(`FAIL ${vp.label} more-sheet: ${String(e).slice(0, 80)}`);
      }
    }
    
    await ctx.close();
  }
  
  await browser.close();
  
  console.log('\n=== QA RESULTS ===');
  for (const r of results) console.log(r);
  const fails = results.filter(r => r.startsWith('FAIL'));
  console.log(`\nTotal: ${results.length} | Pass: ${results.length - fails.length} | Fail: ${fails.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
