// Stills of the court for the static reading and the social image (real GPU, header and copy hidden):
//   public/media/hero6/court-{1600,960}.webp (+ .avif 1600), public/media/og.jpg (1200×630)
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
mkdirSync('public/media/hero6', { recursive: true });
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu'] });
async function shot(w, h, file, p = 0) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/?nointro&qa&q=high', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 90000 });
  await page.addStyleTag({ content: '[data-header]{display:none!important} .hero__ui{display:none!important}' });
  await page.evaluate((v) => window.__hero.set(v), p);
  await page.mouse.move(-10, -10);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: file });
  await ctx.close();
}
await shot(1600, 1000, '.qa/out/pw/still-court.png');
await shot(1200, 630, '.qa/out/pw/still-og.png');
await browser.close();
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
ff(['-i', '.qa/out/pw/still-court.png', '-vf', 'scale=1600:-1', '-q:v', '80', 'public/media/hero6/court-1600.webp']);
ff(['-i', '.qa/out/pw/still-court.png', '-vf', 'scale=960:-1', '-q:v', '82', 'public/media/hero6/court-960.webp']);
ff(['-i', '.qa/out/pw/still-og.png', '-vf', 'scale=1200:630', '-q:v', '3', 'public/media/og.jpg']);
console.log('public/media/hero6/court-{1600,960}.webp, public/media/og.jpg');
