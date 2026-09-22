// How long the world takes to build on a real GPU, stage by stage.
import { createRequire } from 'node:module';
import { PROFILES } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--window-position=0,0'] });
const p = { ...PROFILES[process.argv[3] || 'desktop'] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto(process.argv[2] || 'http://localhost:4321/?nointro&qa', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
console.log('ready after', Date.now() - t0, 'ms', JSON.stringify(await page.evaluate(() => window.__hero.world.timings)));
await browser.close();
