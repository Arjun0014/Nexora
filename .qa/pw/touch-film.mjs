// A phone, a real GPU, raw finger swipes: each swipe must play exactly one leg of the film, and the swipe after
// the title card must scroll the page.   node .qa/pw/touch-film.mjs [profile=iphone]
import { createRequire } from 'node:module';
import { PROFILES, OUT, finger } from './lib.mjs';
import path from 'node:path';

const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const profile = process.argv[2] || 'iphone';
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--window-position=0,0'] });
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:4321/?nointro&qa', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
await page.waitForTimeout(1200);
const cdp = await ctx.newCDPSession(page);
const vp = p.viewport;
const log = [];
for (let i = 0; i < 8; i++) {
  await finger(cdp, 260, { x: Math.round(vp.width / 2), y: Math.round(vp.height * 0.7), steps: 10, ms: 16 });
  await page.waitForTimeout(i < 6 ? 4000 : 1500);
  const s = await page.evaluate(() => ({ p: window.__hero.p, y: Math.round(scrollY) }));
  log.push(`swipe ${i + 1}: p=${s.p} scrollY=${s.y}`);
  await page.screenshot({ path: path.join(OUT, `touch-${profile}-${i + 1}.png`) });
}
console.log(log.join('\n'));
console.log('timings', JSON.stringify(await page.evaluate(() => window.__hero.world.timings)));
if (errors.length) console.log('ERRORS\n' + errors.join('\n'));
await browser.close();
