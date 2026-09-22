// The social image: the hero's first screen at 1200×630 on a real GPU, header hidden → public/media/og.jpg
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--force_high_performance_gpu'] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => errs.push(`${m.type()} ${m.text().slice(0, 200)}`));
page.on('pageerror', (e) => errs.push(`PAGEERR ${String(e).slice(0, 300)}`));
await page.goto('http://localhost:4321/?nointro&qa', { waitUntil: 'load' });
try { await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 45000 }); }
catch { console.log(errs.slice(0, 12).join(' | ')); await browser.close(); process.exit(1); }
await page.addStyleTag({ content: '[data-header]{display:none!important} .ch__support{display:none!important}' });
await page.mouse.move(-10, -10);
await page.waitForTimeout(1500);
await page.screenshot({ path: '.qa/out/pw/og5.png' });
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', '.qa/out/pw/og5.png', '-vf', 'scale=1200:630', '-q:v', '3', 'public/media/og.jpg']);
console.log('public/media/og.jpg');
