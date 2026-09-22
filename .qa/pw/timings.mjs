// The world's startup timings (ms), from the dev server or a URL.
import { chromium } from './lib.mjs';
const url = process.argv[2] || 'http://localhost:4321/?nointro&qa';
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 90000 });
console.log(JSON.stringify(await page.evaluate(() => window.__hero.world.timings)));
await browser.close();
