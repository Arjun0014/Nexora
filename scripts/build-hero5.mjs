// media/hero5/src (originals, never modified) → public/media/hero5: the hero's five frozen moments.
//
//   <id>-{1400,900}.webp      0.9:1 crop round the action (the arch and the circle are upright), graded to the site's one look
//   <id>-1400.avif
//   <id>-depth.webp           a depth map of that crop (near = white), for the 2.5D "lean round the moment"
//
// Steps per world (src/data/hero5.json): a frame is pulled from a clip at `time` (or the photo is used), marks that
// name third parties are painted out (scripts/retouch.mjs: keyed on their ink, refilled by a harmonic fill; check with
// node .qa/pw/retouch-check.mjs), the frame is cropped 0.9:1 round `focus`, graded, and its depth is estimated with
// Depth Anything V2 (small) running locally through transformers.js.
// Run: node scripts/build-hero5.mjs [--force]      (needs ffmpeg; the first run downloads the depth model, ~100 MB)
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { retouch } from './retouch.mjs';

const SRC = 'media/hero5/src';
const OUT = 'public/media/hero5';
const TMP = '.media-cache/hero5';
const force = process.argv.includes('--force');
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const { worlds } = JSON.parse(readFileSync('src/data/hero5.json', 'utf8'));

// The site's grade (scripts/build-stock.mjs), with the exposure normalised per source.
const grade = (img, exposure = 1) => img
  .modulate({ saturation: 0.88, brightness: 1.015 * exposure })
  .linear([1.02, 1.0, 0.94], [6, 5, 4])
  .gamma(1.04);

/** Depth maps, estimated in a child process (see scripts/depth.mjs). */
function depthOf(pairs) {
  if (pairs.length) execFileSync(process.execPath, ['scripts/depth.mjs', ...pairs.flat()], { stdio: 'inherit' });
}
const depthJobs = [];

for (const wd of worlds) {
  const done = join(OUT, `${wd.id}-1400.webp`);
  if (!force && existsSync(done) && existsSync(join(OUT, `${wd.id}-depth.webp`))) { console.log('·', wd.id); continue; }
  // 1. the frame
  let buf;
  if (wd.src.endsWith('.mp4')) {
    const png = join(TMP, `${wd.id}-frame.png`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(wd.time), '-i', join(SRC, wd.src), '-frames:v', '1', png]);
    buf = readFileSync(png);
  } else buf = readFileSync(join(SRC, wd.src));
  const meta = await sharp(buf).metadata();
  // 2. marks painted out
  buf = await retouch(buf, wd.retouch ?? []);
  // 3. the upright crop round the action
  const AR = 0.9;
  const H0 = meta.height * (wd.zoom ?? 1);
  const ch = Math.round(Math.min(H0, meta.width / AR)), cw = Math.round(ch * AR);
  const left = Math.round(Math.min(meta.width - cw, Math.max(0, wd.focus[0] * meta.width - cw / 2)));
  const top = Math.round(Math.min(meta.height - ch, Math.max(0, wd.focus[1] * meta.height - ch / 2)));
  const crop = await sharp(buf).extract({ left, top, width: cw, height: ch }).png().toBuffer();
  // 4. grade and write
  const graded = await grade(sharp(crop), wd.exposure).toBuffer();
  for (const w of [1400, 900]) await sharp(graded).resize({ width: w }).webp({ quality: w > 900 ? 80 : 82 }).toFile(join(OUT, `${wd.id}-${w}.webp`));
  await sharp(graded).resize({ width: 1400 }).avif({ quality: 58 }).toFile(join(OUT, `${wd.id}-1400.avif`));
  // 5. depth, from the graded crop at 900 px
  const dpng = join(TMP, `${wd.id}-900.png`);
  await sharp(graded).resize({ width: 900 }).png().toFile(dpng);
  depthJobs.push([dpng, join(TMP, `${wd.id}-depth.png`), wd.id]);
  console.log('✓', wd.id, `${cw}x${ch} @ ${left},${top}`);
}
depthOf(depthJobs.map(([a, b]) => [a, b]));
for (const [, dpath, id] of depthJobs) {
  await sharp(dpath).greyscale().resize({ width: 720 }).blur(1.2).webp({ quality: 92 }).toFile(join(OUT, `${id}-depth.webp`));
}
