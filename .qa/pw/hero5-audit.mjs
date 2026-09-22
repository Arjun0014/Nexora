// Every stop of the hero on every profile: the active copy must be fully on screen and never overlap the doorway.
//   node .qa/pw/hero5-audit.mjs [profiles,comma]
import { open } from './lib.mjs';

const profiles = (process.argv[2] || 'desktop,wide,laptop,short,tablet,tabletL,iphone,iphoneSE,pixel,small,phoneL').split(',');
let problems = 0;
for (const profile of profiles) {
  const { browser, page } = await open(profile, { url: 'http://localhost:4321/?nointro&qa', wait: 800, gpu: true });
  try { await page.waitForFunction(() => !!window.__hero && window.__hero.world, null, { timeout: 60000 }); }
  catch { console.log(profile, 'no world (software GL too slow?)'); await browser.close(); continue; }
  const rows = [];
  for (let stop = 0; stop <= 5; stop++) {
    await page.evaluate((s) => window.__hero.set(s), stop);
    await page.waitForTimeout(1900);
    const r = await page.evaluate(() => {
      const W = innerWidth, H = innerHeight;
      const hero = document.querySelector('[data-hero]');
      const cs = getComputedStyle(hero);
      const px = (k) => parseFloat(cs.getPropertyValue(k));
      const door = { l: px('--door-left'), b: px('--door-bottom'), t: px('--door-top') };
      const portrait = hero.dataset.layout === 'portrait';
      const ch = hero.querySelector('[data-chapter][data-active="true"]');
      if (!ch) return { id: '-', issues: ['no active chapter'] };
      const issues = [];
      const box = { l: 1e9, r: -1e9, t: 1e9, b: -1e9 };
      for (const el of ch.querySelectorAll('.ch__copy *')) {
        if (!el.childElementCount && el.textContent.trim()) {
          const q = (el.closest('.l') ?? el).getBoundingClientRect(); // display lines: their clip box (the glyphs cannot leave it)
          if (q.width <= 1 || q.height <= 1) continue; // empty, or visually hidden (read by screen readers only)
          box.l = Math.min(box.l, q.left); box.r = Math.max(box.r, q.right); box.t = Math.min(box.t, q.top); box.b = Math.max(box.b, q.bottom);
          if (q.left < -0.5 || q.right > W + 0.5 || q.top < -0.5 || q.bottom > H + 0.5) issues.push(`off-screen: "${el.textContent.trim().slice(0, 24)}"`);
        }
      }
      // wide: the words stand on the wall beside the doorway; upright: on the floor below it
      if (ch.dataset.chapter !== 'overview') {
        if (!portrait && box.r > door.l - 12) issues.push(`overlaps the doorway by ${Math.round(box.r - door.l + 12)}px`);
        if (portrait && box.t < door.b + 4) issues.push(`words over the doorway by ${Math.round(door.b + 4 - box.t)}px`);
      }
      // the first screen's title stands on the floor in front of the pool, never over it
      const pool = px('--pool-front');
      if (ch.dataset.chapter === 'overview' && Number.isFinite(pool) && box.t < pool + 8) issues.push(`title over the pool by ${Math.round(pool + 8 - box.t)}px`);
      // the ring of names: on screen and clear of the words
      const ring = hero.querySelector('[data-ring]');
      if (ring && hero.hasAttribute('data-ring')) {
        const q = ring.getBoundingClientRect();
        if (q.left < -0.5 || q.right > W + 0.5 || q.bottom > H + 0.5) issues.push('ring off-screen');
        if (q.top < box.b + 4) issues.push(`ring under the words by ${Math.round(box.b + 4 - q.top)}px`);
      }
      return { id: ch.dataset.chapter, issues, box: [Math.round(box.l), Math.round(box.t), Math.round(box.r), Math.round(box.b)], W, H };
    });
    if (r.issues.length) problems += r.issues.length;
    rows.push(`${stop} ${r.id.padEnd(11)} ${r.issues.length ? 'FAIL ' + r.issues.join('; ') : 'ok'}`);
  }
  console.log(`— ${profile}\n  ${rows.join('\n  ')}`);
  await browser.close();
}
console.log(problems ? `${problems} problem(s)` : 'all clear');
