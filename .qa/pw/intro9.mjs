// The intro as the hero's loader, on a throttled connection: it must hold until everything is in.
//   node .qa/pw/intro9.mjs [mbps=20] [profile=desktop]        (a real GPU window; the dev server on :4321, or
//   HERO_URL=http://localhost:4330 for the production build served by .qa/serve.mjs)
// Samples every 200 ms: the intro's percentage, the court ready, the five films (their <video>s: how many, and whether
// each can draw a frame). Then asserts: the intro did not begin to open before the court was ready with all five films
// drawable; it held for at least its minimum 5 s; and once open, the films play.
import { createRequire } from 'node:module';
import path from 'node:path';
import { PROFILES, OUT } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const mbps = Number(process.argv[2] || 20), profile = process.argv[3] || 'desktop';
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const p = { ...PROFILES[profile] }; delete p.defaultBrowserType;
const ctx = await browser.newContext(p);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)); });
const films = {};
const t0 = Date.now();
page.on('requestfinished', async (r) => { const u = r.url(); if (u.includes('/media/hero9/') && u.endsWith('.mp4')) { const s = await r.sizes().catch(() => ({})); films[u.split('/').pop()] = { ms: Date.now() - t0, kb: Math.round((s.responseBodySize || 0) / 1024) }; } });
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (mbps * 1e6) / 8, uploadThroughput: 2e6 / 8 });
await page.goto(`${process.env.HERO_URL || 'http://localhost:4321'}/?qa`, { waitUntil: 'commit' });
const rows = [];
let opened = null, gone = null;
for (let i = 0; i < 900; i++) {
  const s = await page.evaluate(() => {
    const intro = document.querySelector('[data-intro-root]');
    const hero = document.querySelector('[data-hero]');
    const vids = [...document.querySelectorAll('[data-films] video')];
    return {
      up: document.documentElement.dataset.intro === 'on',
      pct: intro?.querySelector('[data-intro-pct]')?.textContent ?? '-',
      closing: !!intro?.hasAttribute('data-close'),
      aperture: !!intro?.hasAttribute('data-aperture'),
      ready: hero?.dataset.ready === 'true',
      cinema: document.documentElement.classList.contains('cinema'),
      vids: vids.length, drawable: vids.filter((v) => v.readyState >= 2).length,
      playing: vids.filter((v) => !v.paused).length, t: vids.map((v) => +v.currentTime.toFixed(2)),
    };
  }).catch(() => null);
  const ms = Date.now() - t0;
  if (s) {
    if (i % 5 === 0 || (s.aperture && opened === null)) rows.push(`${String(ms).padStart(6)} ms  ${s.up ? 'intro' : '-----'} ${s.pct.padStart(3)}%  ready:${s.ready ? 'Y' : 'n'}  films ${s.drawable}/${s.vids} drawable, ${s.playing} playing${s.closing ? '  CLOSING' : ''}${s.aperture ? '  OPENING' : ''}`);
    if (s.aperture && opened === null) opened = { ms, ...s };
    if (!s.up && opened && gone === null) { gone = { ms, ...s }; }
    if (gone && ms - gone.ms > 1600) { rows.push(`${String(ms).padStart(6)} ms  after:  films ${s.playing}/${s.vids} playing, clocks ${s.t.join(' ')}`); break; }
  }
  await page.waitForTimeout(200);
}
console.log(`— ${mbps} Mb/s, ${profile}\n` + rows.join('\n'));
console.log('films downloaded:', Object.entries(films).map(([k, v]) => `${k} ${v.kb}KB @${v.ms}ms`).join(' | '));
const fails = [];
if (!opened) fails.push('the intro never opened');
else {
  if (!opened.ready) fails.push('opened before the court was ready');
  if (opened.drawable < 5) fails.push(`opened with ${opened.drawable}/5 films drawable`);
  if (opened.ms < 5000) fails.push(`opened after only ${opened.ms} ms`);
}
if (gone && gone.playing < 5) fails.push(`only ${gone.playing}/5 films playing after the intro`);
console.log(fails.length ? 'FAIL: ' + fails.join('; ') : `PASS: opened at ${opened.ms} ms with the court ready and 5/5 films drawable; films playing after`);
if (errors.length) console.log('console:', [...new Set(errors)].slice(0, 6).join(' | '));
await page.screenshot({ path: path.join(OUT, `intro9-${mbps}-${profile}.png`) });
await browser.close();
