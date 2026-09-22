// Screenshots of the real-time hero at chosen playhead positions.
//   node .qa/pw/hero-shots.mjs desktop 0,1,1.5,2 [tag]
// Uses the ?qa hook (window.__hero.set(p)) to park the playhead anywhere, including mid-leg.
import { open, OUT } from './lib.mjs';
import path from 'node:path';

const profile = process.argv[2] || 'desktop';
const stops = (process.argv[3] || '0,1,2,3,4,5,6').split(',').map(Number);
const tag = process.argv[4] || 'hero';
const { browser, page, errors } = await open(profile, { url: 'http://localhost:4321/?nointro&qa', wait: 1500 });
await page.waitForFunction(() => !!window.__hero, null, { timeout: 60000 });
await page.waitForTimeout(800);
for (const p of stops) {
  await page.evaluate((v) => window.__hero.set(v), p);
  await page.waitForTimeout(900);
  const file = path.join(OUT, `${tag}-${profile}-${String(p).replace('.', '_')}.png`);
  await page.screenshot({ path: file });
  console.log(file);
}
if (errors.length) console.log('ERRORS\n' + errors.join('\n'));
await browser.close();
