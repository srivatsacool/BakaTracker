
import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('bt_demo_mode', 'true'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(2000);
const data = await page.evaluate(() => {
  const cta = document.querySelector('.landing-primary-cta');
  const status = document.querySelector('.landing-status-line');
  const proof = [...document.querySelectorAll('.landing-proof-row span')].slice(0, 1)[0];
  const aiOrb = document.querySelector('.preview-ai-orb');
  return {
    ctaText: cta?.textContent.trim().slice(0, 30),
    ctaBg: cta ? getComputedStyle(cta).backgroundColor : null,
    ctaColor: cta ? getComputedStyle(cta).color : null,
    statusColor: status ? getComputedStyle(status).color : null,
    proofColor: proof ? getComputedStyle(proof).color : null,
    aiOrbBg: aiOrb ? getComputedStyle(aiOrb).backgroundImage.slice(0, 80) : null,
  };
});
console.log(JSON.stringify(data, null, 1));
await browser.close();
