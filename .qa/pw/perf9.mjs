// Frame times of the hero with its five films playing, and whether the films' frames reach the court.
//   node .qa/pw/perf9.mjs [profile=wide] [igpu]      (igpu: Chrome's default adapter, no high-performance flag)
// Measures the first screen (turning), a doorway (films playing, drawn every frame) and a leg; counts each film's
// presented frames (requestVideoFrameCallback) over the doorway window (25 fps films: ~25 per second each).
import { createRequire } from 'node:module';
import { PROFILES } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const profile = process.argv[2] || 'wide', igpu = process.argv[3] === 'igpu';
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', ...(igpu ? [] : ['--force_high_performance_gpu']), '--window-position=0,0'] });
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const page = await (await browser.newContext(p)).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:4321/?nointro&qa${process.env.HERO_QS || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 90000 });
await page.waitForTimeout(1500);
const measure = (ms) => page.evaluate((ms) => new Promise((res) => {
  const vids = window.__hero.world.reel.films.map((f) => f.video).filter(Boolean);
  const counts = vids.map(() => 0);
  vids.forEach((v, i) => { const cb = () => { counts[i]++; if (performance.now() < end) v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); });
  const t = []; let last = performance.now(); const end = last + ms;
  const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ frames: t.length, fps: +(t.length / (ms / 1000)).toFixed(0), med: +t[t.length >> 1].toFixed(1), p90: +t[Math.floor(t.length * 0.9)].toFixed(1), max: +t[t.length - 1].toFixed(1), filmFps: counts.map((c) => +(c / (ms / 1000)).toFixed(0)) }); } };
  requestAnimationFrame(f);
}), ms);
const out = { profile, adapter: igpu ? 'default (integrated)' : 'high-performance', start: await page.evaluate(() => window.__hero.world.quality) };
await page.evaluate(() => window.__hero.set(0));
out.firstScreen = await measure(3000);
await page.evaluate(() => window.__hero.set(1));
await page.waitForTimeout(600);
out.doorway = await measure(3000);
await page.evaluate(() => window.__hero.go(2));
out.leg = await measure(3000);
await page.waitForTimeout(3500);
out.after = await page.evaluate(() => ({ quality: window.__hero.world.quality, films: window.__hero.world.timings.films }));
console.log(JSON.stringify(out, null, 1));
if (errors.length) console.log('ERRORS', errors.slice(0, 5).join(' | '));
await browser.close();
