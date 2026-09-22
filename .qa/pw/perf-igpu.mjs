// Frame times of the hero on the integrated GPU (Chrome's default adapter, no high-performance flag).
//   node .qa/pw/perf-igpu.mjs [qs]   e.g. "&q=medium"
import { chromium } from './lib.mjs';
const qs = process.argv[2] || '';
const hp = process.env.HP === '1';
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', ...(hp ? ['--force_high_performance_gpu'] : [])] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`http://localhost:4321/?nointro&qa${qs}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 90000 });
await page.waitForTimeout(1500);
const res = {};
for (const [name, p] of [['stop0', 0], ['door', 2], ['leg', 1.5]]) {
  await page.evaluate((v) => window.__hero.set(v), p);
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => new Promise((done) => { const ts = []; let last = performance.now(); const f = (now) => { ts.push(now - last); last = now; if (ts.length < 120) requestAnimationFrame(f); else done(ts); }; requestAnimationFrame(f); }));
  t.sort((a, b) => a - b);
  res[name] = `median ${t[60].toFixed(1)} ms, p90 ${t[108].toFixed(1)} ms`;
}
console.log(JSON.stringify({ quality: await page.evaluate(() => window.__hero.world.quality), timings: await page.evaluate(() => window.__hero.world.timings), ...res }, null, 1));
await browser.close();
