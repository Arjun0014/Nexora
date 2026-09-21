// media/clouds (originals, never modified) → public/media/clouds (web derivatives).
//
//   px-cloud-0N   free clouds for seams and parallax: 1400w WebP with alpha
//   curtain-*     the two cloud banks (a soft edge above a solid field): 2400w WebP, plus copies TINTED to
//                 each ground they dissolve into, so the solid part of the bank is exactly that ground and the
//                 hand-off from cloud to section has no visible edge. Tinting multiplies RGB by the ground
//                 colour, which keeps the cloud's shading and turns its white into the ground.
//
// Run: node scripts/build-clouds.mjs
import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'media/clouds';
const OUT = 'public/media/clouds';
mkdirSync(OUT, { recursive: true });

const GROUNDS = { sand: '#eee7db', sky: '#c4d4db' };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

for (const f of readdirSync(SRC)) {
  const base = f.replace(/\.(png|webp)$/, '');
  if (base.startsWith('px-cloud')) {
    await sharp(join(SRC, f)).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 78, alphaQuality: 82 }).toFile(join(OUT, `${base}.webp`));
    continue;
  }
  const name = base.replace('cloud-transition-', 'curtain-');
  const src = sharp(join(SRC, f)).resize({ width: 2400 });
  await src.clone().webp({ quality: 80, alphaQuality: 85 }).toFile(join(OUT, `${name}.webp`));
  for (const [g, h] of Object.entries(GROUNDS)) {
    const [r, gg, b] = hex(h);
    await src.clone()
      .recomb([[r, 0, 0], [0, gg, 0], [0, 0, b]])
      .webp({ quality: 80, alphaQuality: 85 })
      .toFile(join(OUT, `${name}-${g}.webp`));
  }
}
console.log(readdirSync(OUT).join('\n'));
