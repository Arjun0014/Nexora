// Playwright QA helpers for the Nexora site (Chromium; real device profiles; real touch gestures via CDP).
// Playwright is not a project dependency: this uses the copy bundled with gstack (see createRequire below). Run from
// the repo root against the dev server, e.g.  node .qa/pw/audit-cut.mjs desktop,iphone,phoneL /
// (Git Bash: set MSYS_NO_PATHCONV=1 so a '/' argument is not turned into a Windows path.)
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
export const { chromium, devices } = require('playwright');

export const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'pw');
fs.mkdirSync(OUT, { recursive: true });

export const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  wide: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  laptop: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  short: { viewport: { width: 1366, height: 640 }, deviceScaleFactor: 1 },
  tablet: { ...devices['iPad (gen 7)'], defaultBrowserType: undefined },
  tabletL: { ...devices['iPad (gen 7) landscape'], defaultBrowserType: undefined },
  iphone: { ...devices['iPhone 13'], defaultBrowserType: undefined },
  iphoneSE: { ...devices['iPhone SE'], defaultBrowserType: undefined },
  pixel: { ...devices['Pixel 7'], defaultBrowserType: undefined },
  small: { ...devices['Galaxy S9+'], defaultBrowserType: undefined },
  phoneL: { ...devices['iPhone 13 landscape'], defaultBrowserType: undefined },
};

export async function open(profile = 'desktop', { url = 'http://localhost:4321/?nointro', wait = 2500, gpu = false } = {}) {
  // gpu: a headed browser on the real GPU (the hero's court needs WebGPU or WebGL2 at speed)
  const browser = await chromium.launch(gpu ? { headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--autoplay-policy=no-user-gesture-required'] } : { args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = { ...PROFILES[profile] };
  delete p.defaultBrowserType;
  const context = await browser.newContext(p);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
  const cdp = await context.newCDPSession(page);
  return { browser, context, page, cdp, errors };
}

/** Absolute document Y of the top of an element (sticky pins: its container's box). */
export async function yOf(page, sel, frac = 0) {
  return page.evaluate(([sel, frac]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return Math.round(r.top + scrollY + frac * Math.max(0, r.height - innerHeight));
  }, [sel, frac]);
}

/** Jump the page (native scroll; Lenis follows). */
export async function jump(page, y, settle = 700) {
  await page.evaluate((y) => { window.scrollTo(0, y); }, y);
  await page.waitForTimeout(settle);
}

/** A real touch swipe (finger moves up by `dist` px for dist > 0 = scroll onwards). */
export async function swipe(cdp, page, dist = 400, { x, y, speed = 1200 } = {}) {
  const vp = page.viewportSize();
  await cdp.send('Input.synthesizeScrollGesture', {
    x: x ?? Math.round(vp.width / 2), y: y ?? Math.round(vp.height * 0.6),
    yDistance: -dist, xDistance: 0, gestureSourceType: 'touch', speed, repeatCount: 1,
  });
}

/** A raw finger: touchStart → moves → touchEnd, dispatched as touch events (what a phone's page listeners see). */
export async function finger(cdp, dist = 300, { x = 195, y = 500, steps = 12, ms = 16 } = {}) {
  const pt = (yy) => [{ x, y: Math.round(yy), radiusX: 5, radiusY: 5, force: 1, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(y) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(y - (dist * i) / steps) });
    await new Promise((r) => setTimeout(r, ms));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** A mouse wheel notch burst at the centre. */
export async function wheel(page, dy = 100, n = 1, gap = 30) {
  const vp = page.viewportSize();
  await page.mouse.move(vp.width / 2, vp.height / 2);
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy); await page.waitForTimeout(gap); }
}

export async function shot(page, name) {
  const f = path.join(OUT, name.endsWith('.png') ? name : `${name}.png`);
  await page.screenshot({ path: f });
  return f;
}

/** Tile a list of pngs into one jpg contact sheet. */
export function sheet(files, name, { cols = 3, w = 560 } = {}) {
  const dir = path.join(OUT, `_tmp_${name}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(files[0]) || '.png';
  files.forEach((f, i) => fs.copyFileSync(f, path.join(dir, `${String(i).padStart(3, '0')}${ext}`)));
  const rows = Math.ceil(files.length / cols);
  const out = path.join(OUT, `${name}.jpg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-start_number', '0', '-i', path.join(dir, `%03d${ext}`), '-frames:v', '1',
    '-vf', `scale=${w}:-1,drawtext=text='%{frame_num}':start_number=0:x=6:y=6:fontsize=18:fontcolor=red:box=1,tile=${cols}x${rows}:padding=4:color=0x555555`, '-q:v', '4', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}
