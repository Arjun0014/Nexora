// Render the hold at given moments via the ?qa hook:  node hold-at.mjs <profile> <t1,t2,...> [name]
import { open, yOf, jump, shot, sheet } from './lib.mjs';
const [profile = 'desktop', ts = '0.5,1.5,2.2,2.8,3.4,4.0,4.6,5.4,6.2,7.0,7.6,8.8', name = 'hold'] = process.argv.slice(2);
const { browser, page, errors } = await open(profile, { url: 'http://localhost:4321/?nointro&qa' });
await jump(page, await yOf(page, '[data-held]', 0.45), 1500);
// let sources load
await page.evaluate(() => window.__held.at(0.01));
await page.waitForTimeout(2500);
const files = [];
for (const t of ts.split(',').map(Number)) {
  const r = await page.evaluate((t) => window.__held.at(t), t);
  await page.waitForTimeout(t > 8.4 ? 1300 : 120);
  files.push(await shot(page, `${profile}-${name}-${t}`));
  console.log(r);
}
console.log(sheet(files, `${profile}-${name}`, { cols: 4, w: profile.match(/iphone|pixel|small|SE/) ? 300 : 480 }));
if (errors.length) console.log('errors', errors.slice(0, 6));
await browser.close();
