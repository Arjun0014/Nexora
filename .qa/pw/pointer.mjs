// The pointer at a frozen moment, on a real GPU: the camera turns about the moment, and time drifts under the
// pointer. One screenshot per pointer position.   node .qa/pw/pointer.mjs [stop] [tag]
import { createRequire } from 'node:module';
import { PROFILES, OUT } from './lib.mjs';
import path from 'node:path';

const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const stop = Number(process.argv[2] || 1);
const tag = process.argv[3] || 'ptr';
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--window-position=0,0'] });
const p = { ...PROFILES.desktop }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
await page.goto(`http://localhost:4321/?nointro&qa&stop=${stop}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const spots = [[720, 450], [150, 200], [1300, 200], [1300, 780], [150, 780], [1000, 520]];
for (let i = 0; i < spots.length; i++) {
  await page.mouse.move(spots[i][0], spots[i][1], { steps: 12 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(OUT, `${tag}-${i}.png`) });
}
await browser.close();
console.log('done');
