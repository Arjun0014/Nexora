// Type mock-ups over the live court: one scene (query string), several overlays (HTML + CSS), one still each.
//   node .qa/pw/mock7.mjs <tag> "<qs>" <designs.mjs>   (designs.mjs default-exports [{ css, html }])
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT } from './lib.mjs';
const require = createRequire('C:/Users/aswin/.claude/skills/gstack/node_modules/');
const { chromium } = require('playwright');
const [tag = 'm', qs = '', designsPath] = process.argv.slice(2);
const designs = (await import(pathToFileURL(path.resolve(designsPath)).href)).default;
const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--force_high_performance_gpu', '--window-position=0,0'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:4321/?nointro&qa&${qs}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 });
await page.addStyleTag({ content: '.hero__ui{display:none!important}' });
await page.evaluate((x) => window.__hero.set(Number(x)), process.env.P || '0');
await page.waitForTimeout(1200);
const files = [];
for (const [i, d] of designs.entries()) {
  await page.evaluate(({ css, html }) => {
    document.querySelector('#mock')?.remove();
    const el = document.createElement('div');
    el.id = 'mock';
    el.innerHTML = `<style>${css}</style>${html}`;
    document.querySelector('[data-stage]').appendChild(el);
  }, d);
  await page.waitForTimeout(250);
  const f = path.join(OUT, `${tag}-${i}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
console.log(files.join('\n'));
if (errors.length) console.log('errors:', [...new Set(errors)].slice(0, 6).join(' | '));
await browser.close();
