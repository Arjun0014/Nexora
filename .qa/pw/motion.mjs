// Real playback on the GPU, driven by real wheel input, recorded through Chrome's screencast.
//   node .qa/pw/motion.mjs [tag] [steps] [secondsPerStep] [profile]
// Writes frames to .qa/out/pw/<tag>/ and a contact sheet of one frame every `every` ms.
import { createRequire } from 'node:module';
import { PROFILES, OUT } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const tag = process.argv[2] || 'motion';
const steps = Number(process.argv[3] || 2);
const perStep = Number(process.argv[4] || 5);
const profile = process.argv[5] || 'desktop';
const every = Number(process.argv[6] || 300);
// optional 7th arg: a full URL to record from navigation (no qa hooks, e.g. the intro on the production build)
const fromUrl = process.argv[7] || '';

const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--force_high_performance_gpu', '--autoplay-policy=no-user-gesture-required', '--window-position=0,0'] });
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async (f) => {
  frames.push({ t: f.metadata.timestamp, data: f.data });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* closing */ }
});
const vp = p.viewport || { width: 1440, height: 900 };
if (fromUrl) {
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: vp.width, maxHeight: vp.height, everyNthFrame: 1 });
  await page.goto(fromUrl, { waitUntil: 'commit' });
} else {
  await page.goto('http://localhost:4321/?nointro&qa' + (process.env.MOTION_QS || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
}

const dir = path.join(OUT, tag);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
if (!fromUrl) await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: vp.width, maxHeight: vp.height, everyNthFrame: 1 });
await page.mouse.move(vp.width * 0.6, vp.height * 0.5);
await page.waitForTimeout(400);
const t0 = Date.now();
if (steps === 0) await page.waitForTimeout(perStep * 1000); // just watch
for (let i = 0; i < steps; i++) {
  await page.mouse.wheel(0, 120); // one notch = one step
  await page.waitForTimeout(perStep * 1000);
}
await cdp.send('Page.stopScreencast');
const secs = (Date.now() - t0) / 1000;
await browser.close();

frames.sort((a, b) => a.t - b.t);
frames.forEach((f, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64')));
const dts = frames.slice(1).map((f, i) => (f.t - frames[i].t) * 1000).sort((a, b) => a - b);
console.log(`${frames.length} frames over ${secs.toFixed(1)} s → ${(frames.length / secs).toFixed(1)} fps; frame gap median ${dts[dts.length >> 1]?.toFixed(1)} ms, p90 ${dts[Math.floor(dts.length * 0.9)]?.toFixed(1)} ms, max ${dts[dts.length - 1]?.toFixed(1)} ms`);
// contact sheet: one frame every `every` ms
const pick = [];
let next = frames[0]?.t ?? 0;
for (let i = 0; i < frames.length; i++) if (frames[i].t >= next) { pick.push(i); next = frames[i].t + every / 1000; }
const cols = 6, tw = 320;
const th = Math.round((tw * vp.height) / vp.width / 2) * 2;
const inputs = pick.flatMap((i) => ['-i', path.join(dir, `${String(i).padStart(4, '0')}.jpg`)]);
const scale = pick.map((_, k) => `[${k}]scale=${tw}:${th}[v${k}]`).join(';');
const layout = pick.map((_, k) => `${(k % cols) * tw}_${Math.floor(k / cols) * th}`).join('|');
const sheet = path.join(OUT, `${tag}-sheet.jpg`);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', `${scale};${pick.map((_, k) => `[v${k}]`).join('')}xstack=inputs=${pick.length}:layout=${layout}:fill=black`, sheet]);
console.log(sheet, pick.length, 'tiles');
if (errors.length) console.log('ERRORS\n' + errors.join('\n'));
