// Renders the hero's stills from the live world on a real GPU, for the static reading of the page (reduced motion,
// Save-Data, no JavaScript) and the social image. Writes PNG masters to .qa/out/pw/stills/, then:
//   node scripts/build-hero4.mjs   → public/media/hero4/*.webp|avif at 800/1200/1672
//   node .qa/pw/stills.mjs [base=http://localhost:4321]
import { createRequire } from 'node:module';
import { OUT } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4321';
const dir = path.join(OUT, 'stills');
fs.mkdirSync(dir, { recursive: true });
const shots = [
  { id: 'overview', stop: 0, w: 1672, h: 941 },
  { id: 'hospitality', stop: 1, w: 1672, h: 941 },
  { id: 'events', stop: 2, w: 1672, h: 941 },
  { id: 'facilities', stop: 3, w: 1672, h: 941 },
  { id: 'technical', stop: 4, w: 1672, h: 941 },
  { id: 'recruitment', stop: 5, w: 1672, h: 941 },
  { id: 'og-ring', stop: 0, w: 1200, h: 630 },
  { id: 'og-title', stop: 6, w: 1200, h: 630, words: true },
];
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--window-position=0,0'] });
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}/?nointro&qa&stop=${s.stop}${s.words ? '' : '&qa-nowords'}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
  // everything but the picture (the title card keeps its mask and statement: that IS the picture)
  await page.addStyleTag({ content: `header, .header, [data-header], .cursor, .skip { visibility: hidden !important; } ${s.stop === 6 ? '.ch__meta { visibility: hidden !important; }' : '.hero__ui, .hero__scrim { visibility: hidden !important; }'}` });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(dir, `${s.id}.png`) });
  console.log(s.id);
  await ctx.close();
}
await browser.close();
