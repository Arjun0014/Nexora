// Frame timing of the live hero: which GL renderer, and frame times while a leg actually plays.
//   node .qa/pw/perf.mjs desktop [gpu]
import { createRequire } from 'node:module';
import { PROFILES } from './lib.mjs';

const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const profile = process.argv[2] || 'desktop';
const gpu = process.argv[3] === 'gpu';
const args = ['--autoplay-policy=no-user-gesture-required'];
if (gpu) args.push('--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-unsafe-webgpu');
const browser = await chromium.launch({ args, headless: !gpu ? true : false });
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:4321/?nointro&qa', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero, null, { timeout: 60000 });
const info = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a', dpr: devicePixelRatio };
});
console.log('GL:', info.renderer, 'dpr', info.dpr);
const measure = (ms) => page.evaluate((ms) => new Promise((res) => {
  const t = []; let last = performance.now(); const end = last + ms;
  const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ n: t.length, med: t[t.length >> 1].toFixed(1), p90: t[Math.floor(t.length * 0.9)].toFixed(1), max: t[t.length - 1].toFixed(1) }); } };
  requestAnimationFrame(f);
}), ms);
await page.waitForTimeout(1500);
console.log('idle ring  ', JSON.stringify(await measure(2500)));
await page.evaluate(() => window.__hero.go(1));
console.log('dive leg   ', JSON.stringify(await measure(4500)));
console.log('at rest    ', JSON.stringify(await measure(2000)));
await page.evaluate(() => window.__hero.go(2));
console.log('sector leg ', JSON.stringify(await measure(4000)));
const r = await page.evaluate(() => { const w = window.__hero.world; const i = w.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, progs: i.programs?.length }; });
console.log('renderer   ', JSON.stringify(r));
if (errors.length) console.log('ERRORS\n' + errors.join('\n'));
await browser.close();
