// Contact sheet of the linen simulation: one frame per candidate key (?simkey=N), cropped to the sheet.
//   node .qa/pw/sim-keys.mjs 8,12,16,20,24,28,32,36
import { open, OUT } from './lib.mjs';
import path from 'node:path';

const keys = (process.argv[2] || '8,12,16,20,24,28,32,36').split(',').map(Number);
for (const k of keys) {
  const { browser, page } = await open('desktop', { url: `http://localhost:4321/?nointro&qa&simkey=${k}`, wait: 1500 });
  await page.waitForFunction(() => !!window.__hero, null, { timeout: 60000 });
  await page.evaluate(() => window.__hero.set(3));
  await page.waitForTimeout(900);
  const file = path.join(OUT, `sim-${String(k).padStart(2, '0')}.png`);
  await page.screenshot({ path: file, clip: { x: 520, y: 60, width: 900, height: 700 } });
  console.log(file);
  await browser.close();
}
