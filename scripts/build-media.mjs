#!/usr/bin/env node
/**
 * Nexora media pipeline
 * ---------------------
 * Reads the approved originals in /media/hero (never modified) and writes optimised
 * derivatives to /public/media. Requires ffmpeg on PATH.
 *
 *   npm run media          build anything that is missing
 *   npm run media:force    rebuild everything
 *
 * What it produces (see docs/implementation/04-HERO-IMPLEMENTATION.md):
 *   hero/loop-{1440,960}.mp4        idle rotation loop (H.264, BT.709 limited range, no audio)
 *   hero/poster-{1440,960}.webp     exact frame 0 of the loop (NOT overview-master.png, which is framed differently)
 *   hero/seq/<id>/d/f###.webp       desktop scrub frames, 1280x720
 *   hero/seq/<id>/m/f###.webp       mobile scrub frames (portrait crop around the action, or reduced full frame for the entry)
 *   hero/rest/<world>.webp          the exact frame each transition freezes on (video-accurate rest state)
 *   hero/rest/<world>-hd.webp       same frame, Lanczos-upscaled + lightly sharpened for the "focus settle"
 *   stills/<world>-*.{avif,webp}    the approved high-res reference stills, responsive widths + 4:5 action crops
 *   og.jpg                          1200x630 social image
 *   src/data/media-manifest.json    frame counts + dimensions consumed by the hero
 *
 * Colour: the loop and entry clips are tagged full-range BT.709; the four sector clips are untagged.
 * Browsers assume BT.709 for untagged HD video and ffmpeg assumes BT.601, so we force BT.709 everywhere
 * to keep the loop video, the frame sequences and the rest stills colour-identical at every hand-off.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, rm, stat, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'media', 'hero');
const OUT = path.join(ROOT, 'public', 'media');
const CACHE = path.join(ROOT, '.media-cache');
const FORCE = process.argv.includes('--force');

/** Horizontal centre of the human action in every close scene (fraction of frame width). */
const ACTION_X = 0.72;
/** Mobile portrait crop: a 4:5 window of the 16:9 frame centred on the action. */
const M_CROP = { w: 576, h: 720, x: Math.round(1280 * ACTION_X - 576 / 2), y: 0 }; // x = 634
const M_OUT = { w: 512, h: 640 };

const SEQUENCES = [
  { id: 'entry', file: 'overview-to-hospitality.mp4', range: 'pc', to: 'hospitality', mobile: 'full-half' },
  { id: 'events', file: 'hospitality-to-events.mp4', range: 'tv', to: 'events', mobile: 'crop' },
  { id: 'facilities', file: 'events-to-facilities.mp4', range: 'tv', to: 'facilities', mobile: 'crop' },
  { id: 'technical', file: 'facilities-to-technical.mp4', range: 'tv', to: 'technical', mobile: 'crop' },
  { id: 'recruitment', file: 'technical-to-recruitment.mp4', range: 'tv', to: 'recruitment', mobile: 'crop' },
];

const STILLS = ['overview-master', 'hospitality-final', 'events-final', 'facilities-final', 'technical-final', 'recruitment-final'];
/** 4:5 crops of the 1672x941 reference stills, positioned on the action in each approved composition. */
const CARD_FOCUS = { hospitality: 0.7, events: 0.73, facilities: 0.76, technical: 0.78, recruitment: 0.72 };

const exists = (p) => access(p).then(() => true, () => false);
const ff = (args) => run('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 26 });
const pad = (n) => String(n).padStart(3, '0');
const kb = async (p) => Math.round((await stat(p)).size / 1024);
async function dirSizeKB(dir) {
  let total = 0;
  for (const f of await readdir(dir)) total += (await stat(path.join(dir, f))).size;
  return Math.round(total / 1024);
}

async function buildLoop() {
  await mkdir(path.join(OUT, 'hero'), { recursive: true });
  const input = path.join(SRC, 'overview-loop.mp4');
  for (const [w, h, crf] of [[1440, 810, 25], [960, 540, 26]]) {
    const out = path.join(OUT, 'hero', `loop-${w}.mp4`);
    if (!FORCE && (await exists(out))) continue;
    await ff([
      '-i', input, '-an',
      '-vf', `scale=${w}:${h}:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709:in_range=pc:out_range=tv,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-level', '4.1',
      '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-movflags', '+faststart', out,
    ]);
    console.log(`loop-${w}.mp4  ${await kb(out)} KB`);
  }
  // Poster = exact frame 0 so the <video> start is indistinguishable from the poster.
  const png = path.join(CACHE, 'poster.png');
  await mkdir(CACHE, { recursive: true });
  await ff(['-i', input, '-vf', 'select=eq(n\\,0),scale=1920:1080:flags=lanczos:in_color_matrix=bt709:in_range=pc', '-frames:v', '1', png]);
  for (const w of [1440, 960]) {
    const out = path.join(OUT, 'hero', `poster-${w}.webp`);
    if (!FORCE && (await exists(out))) continue;
    await sharp(png).resize(w).webp({ quality: 80, effort: 6 }).toFile(out);
    console.log(`poster-${w}.webp  ${await kb(out)} KB`);
  }
}

async function buildSequence(seq) {
  const cache = path.join(CACHE, seq.id);
  const dDir = path.join(OUT, 'hero', 'seq', seq.id, 'd');
  const mDir = path.join(OUT, 'hero', 'seq', seq.id, 'm');
  const restDir = path.join(OUT, 'hero', 'rest');
  await Promise.all([mkdir(dDir, { recursive: true }), mkdir(mDir, { recursive: true }), mkdir(restDir, { recursive: true })]);

  const done = !FORCE && (await exists(path.join(dDir, 'f000.webp'))) && (await exists(path.join(restDir, `${seq.to}-hd.webp`)));
  if (done) {
    const frames = (await readdir(dDir)).length;
    const mFrames = (await readdir(mDir)).length;
    return { id: seq.id, to: seq.to, frames, mFrames, mStep: seq.mobile === 'full-half' ? 2 : 1 };
  }

  await rm(cache, { recursive: true, force: true });
  await mkdir(cache, { recursive: true });
  // Native-resolution RGB frames (the entry clip is 1440p; keep that for the HD rest still).
  await ff(['-i', path.join(SRC, seq.file), '-vf', `scale=iw:ih:in_color_matrix=bt709:in_range=${seq.range}`, '-vsync', '0', path.join(cache, '%04d.png')]);
  const pngs = (await readdir(cache)).filter((f) => f.endsWith('.png')).sort();
  // The mobile crop is defined on a 1280-wide frame; map it into this clip's native pixels (the entry clip is 2560 wide).
  const meta = await sharp(path.join(cache, pngs[0])).metadata();
  const k = meta.width / 1280;
  const cropRect = { left: Math.round(M_CROP.x * k), top: 0, width: Math.round(M_CROP.w * k), height: Math.round(M_CROP.h * k) };

  await rm(dDir, { recursive: true, force: true }); await mkdir(dDir, { recursive: true });
  await rm(mDir, { recursive: true, force: true }); await mkdir(mDir, { recursive: true });

  let mCount = 0;
  const jobs = pngs.map((name, i) => async () => {
    const src = path.join(cache, name);
    await sharp(src).resize(1280, 720, { kernel: 'lanczos3' }).webp({ quality: 66, effort: 5, smartSubsample: true }).toFile(path.join(dDir, `f${pad(i)}.webp`));
    if (seq.mobile === 'crop') {
      await sharp(src).extract(cropRect).resize(M_OUT.w, M_OUT.h, { kernel: 'lanczos3' })
        .webp({ quality: 60, effort: 5, smartSubsample: true }).toFile(path.join(mDir, `f${pad(i)}.webp`));
    } else if (i % 2 === 0 || i === pngs.length - 1) {
      // Entry on mobile: full frame (the disc must be whole at the start), every 2nd frame, always including the last.
      await sharp(src).resize(1024, 576, { kernel: 'lanczos3' }).webp({ quality: 58, effort: 5, smartSubsample: true }).toFile(path.join(mDir, `f${pad(i)}.webp`));
    }
  });
  // Bounded concurrency so sharp does not exhaust memory on 1440p PNGs.
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (cursor < jobs.length) await jobs[cursor++](); }));
  mCount = (await readdir(mDir)).length;

  // Rest state = the exact frame the clip freezes on.
  const last = path.join(cache, pngs[pngs.length - 1]);
  await sharp(last).resize(1280, 720, { kernel: 'lanczos3' }).webp({ quality: 84, effort: 6 }).toFile(path.join(restDir, `${seq.to}.webp`));
  await sharp(last).resize(1920, 1080, { kernel: 'lanczos3' }).sharpen({ sigma: 0.9, m1: 0.6, m2: 1.6 }).webp({ quality: 80, effort: 6 }).toFile(path.join(restDir, `${seq.to}-hd.webp`));
  await sharp(last).extract(cropRect).resize(768, 960, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8 }).webp({ quality: 78, effort: 6 }).toFile(path.join(restDir, `${seq.to}-m.webp`));

  await rm(cache, { recursive: true, force: true });
  console.log(`seq/${seq.id}: ${pngs.length} frames, desktop ${await dirSizeKB(dDir)} KB, mobile ${mCount} frames ${await dirSizeKB(mDir)} KB`);
  return { id: seq.id, to: seq.to, frames: pngs.length, mFrames: mCount, mStep: seq.mobile === 'full-half' ? 2 : 1 };
}

async function buildStills() {
  const dir = path.join(OUT, 'stills');
  await mkdir(dir, { recursive: true });
  for (const name of STILLS) {
    const id = name.replace('-final', '').replace('-master', '');
    const src = path.join(SRC, `${name}.png`);
    for (const w of [1672, 1200, 800]) {
      for (const fmt of ['avif', 'webp']) {
        const out = path.join(dir, `${id}-${w}.${fmt}`);
        if (!FORCE && (await exists(out))) continue;
        const img = sharp(src).resize(w);
        await (fmt === 'avif' ? img.avif({ quality: 58, effort: 6 }) : img.webp({ quality: 80, effort: 6 })).toFile(out);
      }
    }
    if (id in CARD_FOCUS) {
      const H = 941, W = 1672, cw = Math.round(H * 0.8);
      const left = Math.max(0, Math.min(W - cw, Math.round(W * CARD_FOCUS[id] - cw / 2)));
      for (const w of [720, 480]) {
        for (const fmt of ['avif', 'webp']) {
          const out = path.join(dir, `${id}-card-${w}.${fmt}`);
          if (!FORCE && (await exists(out))) continue;
          const img = sharp(src).extract({ left, top: 0, width: cw, height: H }).resize(w);
          await (fmt === 'avif' ? img.avif({ quality: 60, effort: 6 }) : img.webp({ quality: 82, effort: 6 })).toFile(out);
        }
      }
    }
  }
  const og = path.join(OUT, 'og.jpg');
  if (FORCE || !(await exists(og))) {
    await sharp(path.join(SRC, 'overview-master.png')).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 84, mozjpeg: true }).toFile(og);
  }
  console.log(`stills: ${await dirSizeKB(dir)} KB total`);
}

const t0 = Date.now();
await buildLoop();
const sequences = [];
for (const seq of SEQUENCES) sequences.push(await buildSequence(seq));
await buildStills();

const manifest = {
  generated: 'by scripts/build-media.mjs — do not edit by hand',
  frame: { w: 1280, h: 720 },
  mobileCrop: { ...M_OUT, focusX: ACTION_X, srcX: M_CROP.x / 1280, srcW: M_CROP.w / 1280 },
  mobileEntry: { w: 1024, h: 576 },
  actionX: ACTION_X,
  loop: { duration: 15, fps: 24 },
  sequences,
};
await mkdir(path.join(ROOT, 'src', 'data'), { recursive: true });
await writeFile(path.join(ROOT, 'src', 'data', 'media-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
