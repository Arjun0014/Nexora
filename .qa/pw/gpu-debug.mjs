// One real-GPU screenshot per URL variant, plus console output: for chasing what turns the canvas black.
import { createRequire } from 'node:module';
import { PROFILES, OUT } from './lib.mjs';
import path from 'node:path';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const variants = (process.argv[2] || '').split(',');
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--window-position=0,0'] });
for (const v of variants) {
  const p = { ...PROFILES.desktop }; delete p.defaultBrowserType;
  const ctx = await browser.newContext(p);
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() !== 'log' || /WebGL|GL_|shader|THREE/i.test(m.text())) logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => logs.push('[pageerror] ' + String(e).slice(0, 200)));
  await page.goto(`http://localhost:4321/?nointro&qa${v ? '&' + v : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const f = path.join(OUT, `dbg-${v || 'base'}.png`);
  await page.screenshot({ path: f });
  const px = await page.evaluate(() => { const c = document.querySelector('[data-canvas]'); return c ? `${c.width}x${c.height}` : 'none'; });
  console.log(v || 'base', px, f, '\n  ' + (logs.slice(0, 6).join('\n  ') || 'no console output'));
  await ctx.close();
}
await browser.close();
