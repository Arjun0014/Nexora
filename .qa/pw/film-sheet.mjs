// The whole hero on one contact sheet: the playhead parked at evenly spaced positions.
//   node .qa/pw/film-sheet.mjs desktop 0:6:0.25 [tag] [cols] [width]
import { open, OUT } from './lib.mjs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const profile = process.argv[2] || 'desktop';
const [a, b, s] = (process.argv[3] || '0:6:0.25').split(':').map(Number);
const tag = process.argv[4] || 'film';
const cols = Number(process.argv[5] || 5);
const tw = Number(process.argv[6] || 384);
const ps = [];
for (let p = a; p <= b + 1e-9; p += s) ps.push(Math.round(p * 1000) / 1000);
const { browser, page, errors } = await open(profile, { url: 'http://localhost:4321/?nointro&qa', wait: 1500 });
await page.waitForFunction(() => !!window.__hero, null, { timeout: 60000 });
await page.waitForTimeout(600);
const dir = path.join(OUT, tag);
fs.mkdirSync(dir, { recursive: true });
const files = [];
for (const p of ps) {
  await page.evaluate((v) => window.__hero.set(v), p);
  await page.waitForTimeout(450);
  const f = path.join(dir, `${String(files.length).padStart(3, '0')}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
await browser.close();
const vp = await (async () => ({ w: 0 }))();
void vp;
const rows = Math.ceil(files.length / cols);
const inputs = files.flatMap((f) => ['-i', f]);
const scale = files.map((_, i) => `[${i}]scale=${tw}:-2,drawtext=text='${ps[i]}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.5[v${i}]`).join(';');
// tile height from the screenshots' own aspect (PNG header: width at byte 16, height at byte 20)
const hdr = fs.readFileSync(files[0]);
const th = Math.round((tw * hdr.readUInt32BE(20)) / hdr.readUInt32BE(16) / 2) * 2;
const layout = files.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join('|');
const sheet = path.join(OUT, `${tag}-${profile}-sheet.png`);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', `${scale};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black`, sheet]);
console.log(sheet, `${files.length} frames, ${rows} rows`);
if (errors.length) console.log('ERRORS\n' + errors.join('\n'));
