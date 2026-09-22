// Evenly spaced frames from a start element to the end of the page:  node tour.mjs <profile> <n> [startSel] [name] [route]
import { open, yOf, jump, shot, sheet } from './lib.mjs';
const [profile = 'iphone', n = '36', startSel = '[data-opening]', name = 'tour', route = '/'] = process.argv.slice(2);
const { browser, page, errors } = await open(profile, { url: `http://localhost:4321${route}?nointro` });
const y0 = startSel === 'top' ? 0 : await yOf(page, startSel, 0);
const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const N = Number(n);
const files = [];
for (let i = 0; i < N; i++) {
  const y = Math.round(y0 + ((H - y0) * i) / (N - 1));
  await jump(page, y, 1100);
  files.push(await shot(page, `${profile}-${name}-${String(i).padStart(2, '0')}`));
}
const per = 12;
for (let s = 0; s * per < files.length; s++) console.log(sheet(files.slice(s * per, (s + 1) * per), `${profile}-${name}-sheet${s}`, { cols: 6, w: profile.match(/iphone|pixel|small|SE/) ? 320 : 480 }));
if (errors.length) console.log('errors', errors.slice(0, 5));
await browser.close();
