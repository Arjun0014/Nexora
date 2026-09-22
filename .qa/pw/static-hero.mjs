// The hero's static reading (reduced motion): one viewport screenshot per section, tiled.
import { createRequire } from 'node:module';
import { PROFILES, OUT } from './lib.mjs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const profile = process.argv[2] || 'desktop';
const browser = await chromium.launch();
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const ctx = await browser.newContext({ ...p, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:4321/', { waitUntil: 'load' });
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; for (const img of document.querySelectorAll('.hero img')) img.loading = 'eager'; });
const tops = await page.evaluate(() => [...document.querySelectorAll('.hero .ch')].map((s) => s.getBoundingClientRect().top + scrollY));
const files = [];
for (let i = 0; i < tops.length; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), tops[i]);
  await page.waitForTimeout(900);
  const f = path.join(OUT, `static-${profile}-${i}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
const tw = profile.startsWith('i') || profile === 'pixel' || profile === 'small' ? 200 : 420;
const th = Math.round(tw * p.viewport.height / p.viewport.width);
const sheet = path.join(OUT, `static-${profile}-sheet.png`);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex',
  files.map((_, i) => `[${i}]scale=${tw}:${th}[v${i}]`).join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % 4) * tw}_${Math.floor(i / 4) * th}`).join('|')}:fill=black`, sheet]);
console.log(sheet, 'cinema=', await page.evaluate(() => document.documentElement.classList.contains('cinema')), errors.join(' | '));
await browser.close();
