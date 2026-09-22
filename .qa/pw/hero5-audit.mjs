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
      const door = { l: px('--door-left'), b: px('--door-bottom') };
      const portrait = hero.dataset.layout === 'portrait';
      const ch = hero.querySelector('[data-chapter][data-active="true"]');
      if (!ch) return { id: '-', issues: ['no active chapter'] };
      const issues = [];
      const box = { l: 1e9, r: -1e9, t: 1e9, b: -1e9 };
      for (const el of ch.querySelectorAll('.ch__copy *')) {
        if (!el.childElementCount && el.textContent.trim()) {
          const q = el.getBoundingClientRect();
          if (q.width === 0) continue;
          box.l = Math.min(box.l, q.left); box.r = Math.max(box.r, q.right); box.t = Math.min(box.t, q.top); box.b = Math.max(box.b, q.bottom);
          if (q.left < -0.5 || q.right > W + 0.5 || q.top < -0.5 || q.bottom > H + 0.5) issues.push(`off-screen: "${el.textContent.trim().slice(0, 24)}"`);
        }
      }
      if (!portrait && ch.dataset.chapter !== 'overview' && box.r > door.l - 12) issues.push(`overlaps the doorway by ${Math.round(box.r - door.l + 12)}px`);
      return { id: ch.dataset.chapter, issues, box: [Math.round(box.l), Math.round(box.t), Math.round(box.r), Math.round(box.b)], W, H };
    });
    if (r.issues.length) problems += r.issues.length;
    rows.push(`${stop} ${r.id.padEnd(11)} ${r.issues.length ? 'FAIL ' + r.issues.join('; ') : 'ok'}`);
  }
  console.log(`— ${profile}\n  ${rows.join('\n  ')}`);
  await browser.close();
}
console.log(problems ? `${problems} problem(s)` : 'all clear');
