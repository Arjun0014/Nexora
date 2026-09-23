// A visit, as the visitor has it: the intro, then the films' real pace on the first screen, at a doorway and on the
// way between two (frames shown ÷ what 25 fps would show; 100% = every frame), and the quality tier the court settled.
//   node .qa/pw/films9.mjs [profile=wide] [mbps]        (a real GPU window; the dev server on :4321, or HERO_URL)
import { createRequire } from 'node:module';
import { PROFILES } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const profile = process.argv[2] || 'wide', mbps = Number(process.argv[3] || 0);
const browser = await chromium.launch({ headless: false, channel: process.env.HERO_CHANNEL || undefined, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
if (mbps) { const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (mbps * 1e6) / 8, uploadThroughput: 2e6 / 8 }); }
const t0 = Date.now();
await page.goto(`${process.env.HERO_URL || 'http://localhost:4321'}/?qa${process.env.HERO_QS || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => !document.documentElement.dataset.intro && !!window.__hero?.world, null, { timeout: 180000 });
const introMs = Date.now() - t0;
const pace = (ms) => page.evaluate((ms) => new Promise((res) => {
  const vids = window.__hero.world.reel.films.map((f) => f.video).filter(Boolean);
  const q = () => vids.map((v) => { const x = v.getVideoPlaybackQuality(); return x.totalVideoFrames - x.droppedVideoFrames; });
  const a = q(), t = performance.now();
  setTimeout(() => { const b = q(), s = (performance.now() - t) / 1000; res(vids.map((v, i) => Math.round(((b[i] - a[i]) / (25 * s)) * 100) + '%').join(' ')); }, ms);
}), ms);
const out = { profile, mbps: mbps || 'unthrottled', introMs };
await page.waitForTimeout(500);
out.firstScreen = await pace(4000);
await page.evaluate(() => window.__hero.go(1));
await page.waitForTimeout(3600);
out.doorway = await pace(3000);
await page.evaluate(() => window.__hero.go(2));
out.leg = await pace(3000);
out.quality = await page.evaluate(() => window.__hero.world.quality);
out.timings = await page.evaluate(() => { const t = window.__hero.world.timings; return { start: t.start, settle0: t.settle0, settle1: t.settle1, stepped: t.stepped, filmPace: t.filmPace, films: t.films }; });
console.log(JSON.stringify(out, null, 1));
if (errors.length) console.log('errors:', [...new Set(errors)].slice(0, 5).join(' | '));
await browser.close();
