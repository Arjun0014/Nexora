// Real-GPU stills of the hero and its films:  node .qa/pw/hero9-shots.mjs <tag> [profile] p1 p2 ...
//   e.g. node .qa/pw/hero9-shots.mjs a desktop 0 1 2        (HERO_QS='&spin=0' holds the first screen's turn)
// Before the stills it reports the films: loaded or not, playing, and how far each clock has run over ~1.5 s.
// HERO_CHANNEL=chrome|msedge runs the installed browser instead of Playwright's Chromium.
import { createRequire } from 'node:module';
import path from 'node:path';
import { PROFILES, OUT } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const [tag = 'h9', profile = 'desktop', ...ps] = process.argv.slice(2);
const browser = await chromium.launch({ headless: false, channel: process.env.HERO_CHANNEL || undefined, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:4321/?nointro&qa${process.env.HERO_QS || ''}`, { waitUntil: 'load' });
try { await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 90000 }); }
catch { console.log('no world', errors.slice(0, 6).join(' | ')); await browser.close(); process.exit(1); }
const films = async () => page.evaluate(() => window.__hero.world.reel.films.map((f) => f.video ? { id: f.id, t: +f.video.currentTime.toFixed(2), paused: f.video.paused, ready: f.video.readyState, size: `${f.video.videoWidth}x${f.video.videoHeight}` } : { id: f.id, poster: true }));
const a = await films();
await page.waitForTimeout(1500);
const b = await films();
console.log('films:', a.map((f, i) => f.poster ? `${f.id}: POSTER` : `${f.id} ${f.size} ${f.paused ? 'PAUSED' : 'playing'} ${f.t}s→${b[i].t}s`).join(' | '));
console.log('timings:', JSON.stringify(await page.evaluate(() => window.__hero.world.timings)));
const files = [];
for (const v of (ps.length ? ps : ['0'])) {
  await page.evaluate((x) => window.__hero.set(Number(x)), v);
  if (process.env.HERO_POINTER) { const [x, y] = process.env.HERO_POINTER.split(',').map(Number); await page.mouse.move(x, y, { steps: 4 }); }
  await page.waitForTimeout(Number(process.env.HERO_WAIT || 1200));
  const f = path.join(OUT, `${tag}-${profile}-${String(v).replace('.', '_')}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
console.log(files.join('\n'));
if (errors.length) console.log('console:', [...new Set(errors)].slice(0, 8).join(' | '));
await browser.close();
