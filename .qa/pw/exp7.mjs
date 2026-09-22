// Experiment stills: one GPU window, several query-string variants, each rendered at the given playheads.
//   node .qa/pw/exp7.mjs <tag> "<qs1>" "<qs2>" ...   (env: PS="0 1 2" playheads, NOUI=1 hides the copy, W,H viewport)
import { createRequire } from 'node:module';
import path from 'node:path';
import { OUT } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const [tag = 'x', ...variants] = process.argv.slice(2);
const ps = (process.env.PS || '0').split(/\s+/).filter(Boolean);
const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
const files = [];
for (const [i, qs] of (variants.length ? variants : ['']).entries()) {
  await page.goto(`http://localhost:4321/?nointro&qa&${qs}`, { waitUntil: 'load' });
  try { await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 }); }
  catch { console.log('no world for', qs, errors.slice(0, 4).join(' | ')); continue; }
  if (process.env.NOUI) await page.addStyleTag({ content: '.hero__ui{display:none!important}' });
  if (process.env.CSS) await page.addStyleTag({ content: process.env.CSS });
  await page.waitForTimeout(500);
  for (const v of ps) {
    await page.evaluate((x) => window.__hero.set(Number(x)), v);
    await page.waitForTimeout(Number(process.env.WAIT || 1100));
    const f = path.join(OUT, `${tag}-${i}-${String(v).replace('.', '_')}.png`);
    await page.screenshot({ path: f });
    files.push(f);
  }
}
console.log(files.join('\n'));
if (errors.length) console.log('errors:', [...new Set(errors)].slice(0, 6).join(' | '));
await browser.close();
