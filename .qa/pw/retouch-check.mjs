// Every retouch patch in src/data/hero5.json, before | hole (red) | after, enlarged → .qa/out/pw/retouch-<id>-<n>.png
//   node .qa/pw/retouch-check.mjs [id]
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { retouch } from '../../scripts/retouch.mjs';

const only = process.argv[2];
const { worlds } = JSON.parse(readFileSync('src/data/hero5.json', 'utf8'));
mkdirSync('.qa/out/pw', { recursive: true });
for (const wd of worlds) {
  if (!wd.retouch?.length || (only && wd.id !== only)) continue;
  const src = readFileSync(`media/hero5/src/${wd.src}`);
  const areas = [];
  const out = await retouch(src, wd.retouch, (pt, r) => areas.push(r));
  const before = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(out).raw().toBuffer();
  for (const [n, a] of areas.entries()) {
    const k = Math.max(1, Math.min(4, Math.floor(560 / Math.max(a.aw, a.ah))));
    const crop = (buf) => {
      const o = Buffer.alloc(a.aw * a.ah * 3);
      for (let y = 0; y < a.ah; y++) buf.copy(o, y * a.aw * 3, ((a.ay + y) * before.info.width + a.ax) * 3, ((a.ay + y) * before.info.width + a.ax + a.aw) * 3);
      return o;
    };
    const b = crop(before.data), f = crop(after), m = Buffer.from(b);
    for (let i = 0; i < a.aw * a.ah; i++) if (a.hole[i]) { m[i * 3] = Math.min(255, m[i * 3] * 0.4 + 150); m[i * 3 + 1] *= 0.4; m[i * 3 + 2] *= 0.4; }
    const tiles = await Promise.all([b, m, f].map((buf) => sharp(buf, { raw: { width: a.aw, height: a.ah, channels: 3 } }).resize(a.aw * k, a.ah * k, { kernel: 'nearest' }).png().toBuffer()));
    const gap = 8;
    await sharp({ create: { width: a.aw * k * 3 + gap * 2, height: a.ah * k, channels: 3, background: '#fff' } })
      .composite(tiles.map((input, j) => ({ input, left: j * (a.aw * k + gap), top: 0 })))
      .png().toFile(`.qa/out/pw/retouch-${wd.id}-${n}.png`);
    console.log(`${wd.id} #${n}: ${a.marked} px marked, ${a.filled} filled, grain σ ${a.sigma.toFixed(1)}`);
  }
}
