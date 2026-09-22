// The intro into the first screen: frames every E ms. node .qa/pw/intro7.mjs <tag>  env: N, E, FROM (ms before first)
import { createRequire } from 'node:module';
import path from 'node:path';
import { OUT } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const [tag = 'intro'] = process.argv.slice(2);
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto('http://localhost:4321/', { waitUntil: 'load' });
await page.waitForTimeout(Number(process.env.FROM || 5200));
const files = [];
for (let i = 0; i < Number(process.env.N || 10); i++) {
  const f = path.join(OUT, `${tag}-${i}.png`); await page.screenshot({ path: f }); files.push(f);
  await page.waitForTimeout(Number(process.env.E || 350));
}
console.log(files.join('\n'));
if (errors.length) console.log('errors:', [...new Set(errors)].slice(0, 6).join(' | '));
await browser.close();
