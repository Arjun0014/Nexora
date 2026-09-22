/**
 * Stills of the live hero, for the page's static reading (reduced motion, Save-Data, no JavaScript) and the social
 * image. The masters are RENDERED from the world itself on a real GPU by .qa/pw/stills.mjs (they can always be made
 * again from the code, so only the derivatives are committed):
 *
 *   node .qa/pw/stills.mjs          → .qa/out/pw/stills/*.png  (dev server running)
 *   node scripts/build-hero4.mjs    → public/media/hero4/<id>-<w>.webp|avif (800, 1200, 1672) and public/media/og.jpg
 */
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, '.qa', 'out', 'pw', 'stills');
const OUT = path.join(ROOT, 'public', 'media', 'hero4');
const IDS = ['overview', 'hospitality', 'events', 'facilities', 'technical', 'recruitment'];

await mkdir(OUT, { recursive: true });
const have = new Set(await readdir(IN));
for (const id of IDS) {
  if (!have.has(`${id}.png`)) { console.warn(`missing ${id}.png in ${IN}`); continue; }
  const src = path.join(IN, `${id}.png`);
  for (const w of [800, 1200, 1672]) {
    await sharp(src).resize({ width: w }).webp({ quality: 80, effort: 5 }).toFile(path.join(OUT, `${id}-${w}.webp`));
    await sharp(src).resize({ width: w }).avif({ quality: 52, effort: 5 }).toFile(path.join(OUT, `${id}-${w}.avif`));
  }
  console.log(id);
}
if (have.has('og-ring.png')) {
  await sharp(path.join(IN, 'og-ring.png')).resize({ width: 1200, height: 630, fit: 'cover' }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(ROOT, 'public', 'media', 'og.jpg'));
  console.log('og.jpg');
}
