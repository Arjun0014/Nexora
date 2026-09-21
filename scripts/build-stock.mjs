// media/stock (licence-clean originals, never modified) → public/media/stock.
//
// Every photograph is graded to ONE look so stock from twenty photographers reads as a single shoot: slightly
// desaturated, lifted blacks, a warm cast that matches the hero's amber light, highlights held back.
//   <file>-{800,1400,2400}.webp      landscape, for full-bleed and windows
//   <file>-card-{640,960}.webp       4:5 crops centred on the manifest's focus point (deck cards, arches)
// Run: node scripts/build-stock.mjs [--force]
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'media/stock';
const OUT = 'public/media/stock';
const force = process.argv.includes('--force');
mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(readFileSync('src/data/stock.json', 'utf8'));
const entries = new Map();
for (const [k, group] of Object.entries(manifest)) {
  if (k === '_') continue;
  for (const e of Object.values(group)) entries.set(e.file, e.focus);
}

const grade = (img) => img
  .modulate({ saturation: 0.86, brightness: 1.015 })
  // warm cast: a touch more red, a touch less blue; black point lifted ~3% by the offset
  .linear([1.02, 1.0, 0.94], [6, 5, 4])
  .gamma(1.04);

for (const [file, focus] of entries) {
  const src = join(SRC, `${file}.jpg`);
  const meta = await sharp(src).metadata();
  for (const w of [800, 1400, 2400]) {
    const out = join(OUT, `${file}-${w}.webp`);
    if (!force && existsSync(out)) continue;
    await grade(sharp(src).resize({ width: Math.min(w, meta.width) })).webp({ quality: w > 1400 ? 74 : 78 }).toFile(out);
  }
  // 4:5 crop placed exactly as CSS object-position would place it, so a cover-fitted landscape image in a 4:5
  // box shows the same pixels as the card crop (the workforces morph swaps one for the other).
  const [fx] = focus.split(' ').map((v) => parseFloat(v) / 100);
  const ch = meta.height, cw = Math.round(ch * 0.8);
  const left = Math.round(fx * Math.max(0, meta.width - cw));
  for (const w of [640, 960]) {
    const out = join(OUT, `${file}-card-${w}.webp`);
    if (!force && existsSync(out)) continue;
    await grade(sharp(src).extract({ left, top: 0, width: Math.min(cw, meta.width), height: ch })).resize({ width: w }).webp({ quality: 80 }).toFile(out);
  }
  console.log('✓', file);
}
