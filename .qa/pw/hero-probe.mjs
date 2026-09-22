// Probe: load the hero with ?qa, set a stop, report scroll position and hero state.
import { chromium } from './lib.mjs';
const stops = (process.argv[2] || '1').split(',');
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const logs = [];
page.on('console', (m) => { if (/error|warn/i.test(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
page.on('pageerror', (e) => logs.push('PAGEERROR ' + String(e).slice(0, 300)));
await page.goto('http://localhost:4321/?nointro&qa', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
for (const s of stops) {
  const before = await page.evaluate(() => scrollY);
  await page.evaluate((v) => window.__hero.set(Number(v)), s);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ y: scrollY, p: window.__hero.p, h: document.querySelector('[data-hero]').getBoundingClientRect().height, doc: document.documentElement.scrollHeight }));
  console.log('stop', s, 'scroll before', before, JSON.stringify(r));
}
console.log(logs.slice(0, 8).join('\n'));
await browser.close();
