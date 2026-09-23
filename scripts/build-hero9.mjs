// media/hero-new (the client's films, never modified) → public/media/hero9: the hero's five worlds, in motion.
//
//   <id>-720.mp4 · <id>-540.mp4   H.264 High, 9:16 (720×1280 · 540×960), 25 fps, no sound, moov first (+faststart).
//                                 A seamless loop: the last `xfade` seconds dissolve into the first, so the film runs
//                                 on through its seam without a jump (it starts xfade seconds into the source).
//   <id>-poster-{1080,720}.webp   one frame (`poster`, in the source's seconds): the static reading, and the poster
//
// Steps per world (src/data/hero9.json): cut to 9:16 round `focus` (only the technical film needs it, 1080×2048),
// scaled (lanczos), graded to the site's look — the grade of scripts/build-hero5.mjs: a little less saturation, warm
// gains, the blacks set down so the picture does not go to haze under the court's bloom — then looped and encoded.
// The 720 film is what the doorways show on a large screen at the doorway stop (the opening is ~500–700 px wide
// there); phones and the lowest quality tier take the 540.
// Run: node scripts/build-hero9.mjs [--force]      (needs ffmpeg on PATH)
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'media/hero-new';
const OUT = 'public/media/hero9';
const TMP = '.media-cache/hero9';
const force = process.argv.includes('--force');
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const { worlds, ar: [AW, AH], xfade: F } = JSON.parse(readFileSync('src/data/hero9.json', 'utf8'));
const SIZES = [{ w: 720, crf: 23 }, { w: 540, crf: 25 }];

const probe = (file) => {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets', '-of', 'json', file], { encoding: 'utf8' });
  const s = JSON.parse(out).streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  return { width: s.width, height: s.height, fps: n / d, frames: Number(s.nb_read_packets) };
};

/** The cut to 9:16 round the focus, the scale, and the grade — as one filter chain (RGB work in BT.709). */
function look(src, wd, w) {
  const h = Math.round((w * AH) / AW / 2) * 2;
  const cw0 = Math.min(src.width, Math.round((src.height * AW) / AH)), ch0 = Math.min(src.height, Math.round((src.width * AH) / AW));
  const cw = cw0 - (cw0 % 2), ch = ch0 - (ch0 % 2);
  const x = Math.round(Math.min(src.width - cw, Math.max(0, wd.focus[0] * src.width - cw / 2)));
  const y = Math.round(Math.min(src.height - ch, Math.max(0, wd.focus[1] * src.height - ch / 2)));
  const e = 1.01 * (wd.exposure ?? 1);
  const gain = [1.10, 1.07, 1.0].map((g) => (g * e).toFixed(4));
  return [
    `crop=${cw}:${ch}:${x}:${y}`,
    `scale=${w}:${h}:flags=lanczos+accurate_rnd+full_chroma_int:in_color_matrix=bt709:in_range=tv`,
    'eq=saturation=0.9',
    `scale=flags=accurate_rnd+full_chroma_int:in_color_matrix=bt709:in_range=tv,format=gbrp`,
    `lutrgb=r='clip(val*${gain[0]}-8,0,255)':g='clip(val*${gain[1]}-8,0,255)':b='clip(val*${gain[2]}-8,0,255)'`,
    `scale=flags=accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p`,
  ].join(',');
}

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], { stdio: 'inherit' });

for (const wd of worlds) {
  const file = join(SRC, wd.src);
  const src = probe(file);
  const D = src.frames / src.fps; // the source's length in seconds, by its frames
  for (const { w, crf } of SIZES) {
    const out = join(OUT, `${wd.id}-${w}.mp4`);
    if (!force && existsSync(out)) { console.log('·', out); continue; }
    // one pass: [look] → split; the body from F to the end, its last F seconds dissolving into the head (0..F)
    const graph = `[0:v]${look(src, wd, w)},split=2[a][b];` +
      `[a]trim=start=${F},setpts=PTS-STARTPTS[body];[b]trim=end=${F},setpts=PTS-STARTPTS[head];` +
      `[body][head]xfade=transition=fade:duration=${F}:offset=${(D - 2 * F).toFixed(3)},format=yuv420p[v]`;
    ff(['-i', file, '-filter_complex', graph, '-map', '[v]', '-an', '-r', String(src.fps),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-x264-params', 'aq-mode=3', '-g', String(Math.round(src.fps * 2)),
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-movflags', '+faststart', out]);
    const got = probe(out);
    console.log('✓', out, `${got.width}x${got.height}`, `${(got.frames / got.fps).toFixed(2)}s`, `${Math.round(statSync(out).size / 1024)} KB`);
  }
  // the poster: the same cut and grade, at the source's full width (capped at 1080)
  const p1080 = join(OUT, `${wd.id}-poster-1080.webp`);
  if (force || !existsSync(p1080)) {
    const pw = Math.min(1080, src.width - (src.width % 2));
    const png = join(TMP, `${wd.id}-poster.png`);
    ff(['-ss', String(wd.poster), '-i', file, '-frames:v', '1', '-vf', look(src, wd, pw), '-update', '1', png]);
    for (const w of [1080, 720]) await sharp(png).resize({ width: w, withoutEnlargement: false }).webp({ quality: 82 }).toFile(join(OUT, `${wd.id}-poster-${w}.webp`));
    console.log('✓', `${OUT}/${wd.id}-poster-{1080,720}.webp`, `(from ${pw} px)`);
  } else console.log('·', p1080);
}
