// The real first visit on a GPU: intro, loading, reveal. Screenshots at fixed times after navigation.
//   node .qa/pw/intro-gpu.mjs http://localhost:4330/ tag [profile]
import { createRequire } from 'node:module';
import { PROFILES, OUT } from './lib.mjs';
import path from 'node:path';

const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:4330/';
const tag = process.argv[3] || 'intro';
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--window-position=0,0'] });
const p = { ...PROFILES[process.argv[4] || 'desktop'] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const t0 = Date.now();
await page.goto(url, { waitUntil: 'commit' });
for (const ms of [600, 2000, 4000, 5600, 6400, 7000, 7600, 8400, 9500]) {
  await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
  await page.screenshot({ path: path.join(OUT, `${tag}-${ms}.png`) });
}
const st = await page.evaluate(() => ({ intro: document.documentElement.dataset.intro || 'gone', ready: document.querySelector('[data-hero]')?.dataset.ready }));
console.log(JSON.stringify(st));
if (errors.length) console.log('ERRORS\n' + errors.join('\n'));
await browser.close();
