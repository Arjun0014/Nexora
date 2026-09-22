// Long frames around real wheel steps (no screencast, which reports idle rests as gaps): rAF gaps > 50 ms for 4 s
// after each wheel step.  node .qa/pw/stalls.mjs   (env: N steps, QS extra query)
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`http://localhost:4321/?nointro&qa${process.env.QS || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
await page.waitForTimeout(2000);
await page.mouse.move(720, 450);
await page.evaluate(() => { window.__gaps = []; let last = performance.now(); const loop = (t) => { if (t - last > 50) window.__gaps.push([Math.round(t), Math.round(t - last)]); last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
for (let i = 0; i < Number(process.env.N || 4); i++) {
  const t = await page.evaluate(() => performance.now());
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(4200);
  const g = await page.evaluate((t0) => window.__gaps.filter(([t]) => t >= t0).map(([t, d]) => [t - Math.round(t0), d]), t);
  console.log(`step ${i + 1}: p=${await page.evaluate(() => window.__hero.p)} gaps`, JSON.stringify(g));
}
await browser.close();
