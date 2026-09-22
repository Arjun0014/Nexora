// Real-GPU stills of the hero at playhead positions:  node .qa/pw/hero5-shots.mjs <tag> [profile] p1 p2 ...
//   e.g. node .qa/pw/hero5-shots.mjs a desktop 0 0.5 1 1.3 1.5 2
// Pointer: HERO_POINTER=x,y (CSS px) moves the mouse there before each shot.
import { createRequire } from 'node:module';
import path from 'node:path';
import { PROFILES, OUT } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const [tag = 'h5', profile = 'desktop', ...ps] = process.argv.slice(2);
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`http://localhost:4321/?nointro&qa${process.env.HERO_QS || ''}`, { waitUntil: 'load' });
try { await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 }); }
catch { console.log('no world', errors.slice(0, 6).join(' | ')); await browser.close(); process.exit(1); }
await page.waitForTimeout(600);
const files = [];
for (const v of (ps.length ? ps : ['0'])) {
  await page.evaluate((x) => window.__hero.set(Number(x)), v);
  if (process.env.HERO_POINTER) { const [x, y] = process.env.HERO_POINTER.split(',').map(Number); await page.mouse.move(x, y, { steps: 4 }); }
  await page.waitForTimeout(Number(process.env.HERO_WAIT || 900));
  const f = path.join(OUT, `${tag}-${profile}-${String(v).replace('.', '_')}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
console.log(files.join('\n'));
if (errors.length) console.log('errors:', [...new Set(errors)].slice(0, 6).join(' | '));
await browser.close();
