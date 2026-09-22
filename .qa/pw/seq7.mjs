// Frame sequences of the live film: the first screen turning, then a leg played in real time.
//   node .qa/pw/seq7.mjs <tag> "<qs>"   env: N0 (frames at rest, default 6), E0 (ms between, 2000),
//   GO (stop to go to after, default 1), N1 (frames during the leg, 10), E1 (ms between, 330)
import { createRequire } from 'node:module';
import path from 'node:path';
import { OUT } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const [tag = 'seq', qs = ''] = process.argv.slice(2);
const n0 = Number(process.env.N0 ?? 6), e0 = Number(process.env.E0 ?? 2000), n1 = Number(process.env.N1 ?? 10), e1 = Number(process.env.E1 ?? 330);
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const ctx = await browser.newContext({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 900) }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`http://localhost:4321/?nointro&qa&${qs}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
if (process.env.START) await page.evaluate((x) => window.__hero.set(Number(x)), process.env.START);
await page.waitForTimeout(1500);
const files = [];
const shot = async (name) => { const f = path.join(OUT, `${tag}-${name}.png`); await page.screenshot({ path: f }); files.push(f); };
for (let i = 0; i < n0; i++) { await shot(`r${i}`); await page.waitForTimeout(e0); }
if (process.env.GO !== 'none') {
  await page.evaluate((x) => window.__hero.go(Number(x)), process.env.GO ?? '1');
  for (let i = 0; i < n1; i++) { await page.waitForTimeout(e1); await shot(`g${i}`); }
  await page.waitForTimeout(1800); await shot('end');
}
console.log(files.join('\n'));
if (errors.length) console.log('errors:', [...new Set(errors)].slice(0, 6).join(' | '));
await browser.close();
