// Screenshots from a real GPU window while a leg plays (screencast frames of a WebGL canvas can come back black).
import { createRequire } from 'node:module';
import { PROFILES, OUT } from './lib.mjs';
import path from 'node:path';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const tag = process.argv[2] || 'gpu';
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--window-position=0,0'] });
const p = { ...PROFILES[process.argv[3] || 'desktop'] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
await page.goto('http://localhost:4321/?nointro&qa', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, `${tag}-a.png`) });
await page.mouse.move(800, 450);
await page.mouse.wheel(0, 120);
for (const [i, ms] of [[1, 900], [2, 900], [3, 900], [4, 2500]]) { await page.waitForTimeout(ms); await page.screenshot({ path: path.join(OUT, `${tag}-${i}.png`) }); }
console.log('p =', await page.evaluate(() => window.__hero.p));
await browser.close();
