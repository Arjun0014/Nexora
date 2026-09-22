// Capture one scene at several scroll fractions:  node cap-scene.mjs <profile> <selector> <fractions,comma> [name] [settle]
import { open, yOf, jump, shot, sheet } from './lib.mjs';
const [profile = 'desktop', sel = '[data-sgx]', fr = '0,0.25,0.5,0.75,1', name = 'scene', settle = '900'] = process.argv.slice(2);
const { browser, page, errors } = await open(profile);
const files = [];
for (const f of fr.split(',').map(Number)) {
  await jump(page, await yOf(page, sel, f), Number(settle));
  files.push(await shot(page, `${profile}-${name}-${f}`));
}
const cols = Math.min(4, files.length);
console.log(sheet(files, `${profile}-${name}`, { cols, w: profile.match(/iphone|pixel|small|SE/) ? 300 : 520 }));
if (errors.length) console.log('errors', errors.slice(0, 5));
await browser.close();
