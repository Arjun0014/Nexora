// media/ph (Poly Haven originals, CC0; fetched by scripts/ph-fetch.mjs) → public/media/court: the courtyard's
// materials and sky at web sizes.
//
//   <set>-col-{2k,1k}.webp, <set>-{nrm,arm}-1k.webp   colour (sRGB), normal (OpenGL), AO/roughness/metalness packed
//   sky-1k.hdr                        the sky, for image-based light (Radiance RGBE, resampled in float: scripts/hdr.mjs)
//
// Run: node scripts/build-court.mjs [--force]
import sharp from 'sharp';
import { readHDR, downsample, writeHDR } from './hdr.mjs';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'public/media/court';
const force = process.argv.includes('--force');
mkdirSync(OUT, { recursive: true });

const TEXTURES = {
  stone: 'plastered_wall_02', // trims, portals, the pool's edge
  plaster: 'patterned_clay_plaster', // the ring wall, the doorways' reveals
  smooth: 'beige_wall_001', // the floor's slabs
};
const SKY = 'qwantani_late_afternoon_puresky';

const fresh = (p) => force || !existsSync(p);
for (const [name, id] of Object.entries(TEXTURES)) {
  const src = (map) => join('media/ph', id, `${id}_${map}_2k.jpg`);
  // colour at 2k (high) and 1k; normal and AO/roughness at 1k only (plaster needs no more)
  const jobs = [
    ['col', 2048, '2k', src('diffuse'), { quality: 84 }],
    ['col', 1024, '1k', src('diffuse'), { quality: 86 }],
    ['nrm', 1024, '1k', src('nor_gl'), { quality: 90 }],
    ['arm', 1024, '1k', src('arm'), { quality: 88 }],
  ];
  for (const [kind, size, tag, from, opts] of jobs) {
    const out = join(OUT, `${name}-${kind}-${tag}.webp`);
    if (!fresh(out)) continue;
    await sharp(from).resize(size, size).webp(opts).toFile(out);
    console.log('✓', out);
  }
}
let sky = null;
for (const [w, tag] of [[1024, '1k']]) {
  const out = join(OUT, `sky-${tag}.hdr`);
  if (!fresh(out)) continue;
  sky ??= readHDR(join('media/ph', SKY, `${SKY}_4k.hdr`));
  const small = downsample(sky, w);
  writeHDR(out, small);
  let peak = 0;
  for (let i = 0; i < small.data.length; i += 3) peak = Math.max(peak, small.data[i] * 0.2126 + small.data[i + 1] * 0.7152 + small.data[i + 2] * 0.0722);
  console.log('✓', out, 'peak', peak.toFixed(0));
}
