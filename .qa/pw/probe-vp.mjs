// Why is innerHeight so large on a phone profile? Report viewport metrics and the widest overflowing elements.
import { open } from './lib.mjs';
const profile = process.argv[2] || 'iphone';
const { browser, page } = await open(profile);
const r = await page.evaluate(() => {
  const de = document.documentElement;
  const wide = [];
  for (const el of document.querySelectorAll('body *')) {
    const b = el.getBoundingClientRect();
    if (b.right > de.clientWidth + 2 || b.left < -2) {
      // report only the outermost offenders
      let p = el.parentElement, parentOver = false;
      while (p && p !== document.body) { const pb = p.getBoundingClientRect(); if (pb.right > de.clientWidth + 2 || pb.left < -2) { parentOver = true; break; } p = p.parentElement; }
      if (!parentOver) wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} L${Math.round(b.left)} R${Math.round(b.right)}`);
    }
  }
  return {
    inner: [innerWidth, innerHeight], client: [de.clientWidth, de.clientHeight], scroll: [de.scrollWidth, de.scrollHeight],
    vv: [visualViewport.width, visualViewport.height, visualViewport.scale], dpr: devicePixelRatio,
    meta: document.querySelector('meta[name=viewport]')?.content,
    htmlOverflowX: getComputedStyle(de).overflowX, bodyOverflowX: getComputedStyle(document.body).overflowX,
    wide: wide.slice(0, 25),
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
