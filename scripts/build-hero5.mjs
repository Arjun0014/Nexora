// media/hero5/src (originals, never modified) → public/media/hero5: the hero's five frozen moments.
//
//   <id>-{1400,900}.webp      0.9:1 crop round the action (the arch and the circle are upright), graded to the site's one look
//   <id>-1400.avif
//   <id>-depth.webp           a depth map of that crop (near = white), for the 2.5D "lean round the moment"
//
// Steps per world (src/data/hero5.json): a frame is pulled from a clip at `time` (or the photo is used), marks that
// name third parties are painted out (normalised-convolution inpainting: the mark's pixels are masked and refilled
// from the ground round them), the frame is cropped 0.9:1 round `focus`, graded, and its depth is estimated with
// Depth Anything V2 (small) running locally through transformers.js.
// Run: node scripts/build-hero5.mjs [--force]      (needs ffmpeg; the first run downloads the depth model, ~100 MB)
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/** Paint out marks: mask the pixels of the mark (dark on light, or light on dark), refill from their surroundings. */
async function retouch(buf, meta, patches) {
  if (!patches.length) return buf;
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels, W = info.width;
  for (const pt of patches) {
    const x0 = Math.max(0, pt.x), y0 = Math.max(0, pt.y), w = Math.min(pt.w, W - x0), h = Math.min(pt.h, info.height - y0);
    const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    // local median-ish reference: the brighter (or darker) half of the patch is the ground
    const ls = [];
    for (let y = y0; y < y0 + h; y += 2) for (let x = x0; x < x0 + w; x += 2) ls.push(lum((y * W + x) * ch));
    ls.sort((a, b) => a - b);
    const ground = pt.mode === 'dark' ? ls[Math.floor(ls.length * 0.8)] : ls[Math.floor(ls.length * 0.2)];
    const thr = pt.mode === 'dark' ? ground - 38 : ground + 38;
    // mask of the mark, dilated by 3 px
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const L = lum(((y0 + y) * W + x0 + x) * ch);
      if (pt.mode === 'dark' ? L < thr : L > thr) m[y * w + x] = 1;
    }
    const dil = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -3; dy <= 3 && !v; dy++) for (let dx = -3; dx <= 3; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && m[yy * w + xx]) { v = 1; break; }
      }
      dil[y * w + x] = v;
    }
    // normalised convolution, several widening passes, so large holes fill from their rims
    const keep = new Float32Array(w * h), acc = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
    for (let i = 0; i < w * h; i++) {
      keep[i] = dil[i] ? 0 : 1;
      const src = (((y0 + Math.floor(i / w)) * W) + x0 + (i % w)) * ch;
      for (let c = 0; c < 3; c++) acc[c][i] = data[src + c] * keep[i];
    }
    const blur = (a, r) => {
      const t = new Float32Array(w * h);
      for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x < w + r; x++) { if (x + r < w) s += a[y * w + Math.min(w - 1, Math.max(0, x + r))]; if (x - r - 1 >= 0) s -= a[y * w + x - r - 1]; if (x >= 0 && x < w) t[y * w + x] = s; } }
      const o = new Float32Array(w * h);
      for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y < h + r; y++) { if (y + r < h) s += t[Math.min(h - 1, y + r) * w + x]; if (y - r - 1 >= 0) s -= t[(y - r - 1) * w + x]; if (y >= 0 && y < h) o[y * w + x] = s; } }
      return o;
    };
    let K = keep, A = acc;
    for (const r of [4, 8, 16, 32]) {
      const Kb = blur(K, r), Ab = A.map((a) => blur(a, r));
      for (let i = 0; i < w * h; i++) {
        if (dil[i] && Kb[i] > 1e-3) {
          const src = (((y0 + Math.floor(i / w)) * W) + x0 + (i % w)) * ch;
          for (let c = 0; c < 3; c++) data[src + c] = Math.round(Ab[c][i] / Kb[i]);
        }
      }
      K = Kb; A = Ab;
    }
    // a whisper of grain over the patch so the fill does not read as smooth plastic
    for (let i = 0; i < w * h; i++) if (dil[i]) {
      const src = (((y0 + Math.floor(i / w)) * W) + x0 + (i % w)) * ch, n = (Math.random() - 0.5) * 6;
      for (let c = 0; c < 3; c++) data[src + c] = Math.max(0, Math.min(255, data[src + c] + n));
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: ch } }).png().toBuffer();
  void meta;
}

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
  buf = await retouch(buf, meta, wd.retouch ?? []);
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
