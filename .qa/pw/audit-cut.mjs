// Find visible text that is cut off: past the left/right screen edge, or clipped by an ancestor that clips overflow.
//   node audit-cut.mjs <profiles,comma> [path=/] [stepFrac=0.5]
import { open } from './lib.mjs';

const profiles = (process.argv[2] || 'desktop').split(',');
const route = process.argv[3] || '/';
const stepFrac = Number(process.argv[4] || 0.5);

const detect = () => {
  const vw = innerWidth, out = [];
  const clipAnc = (el) => {
    const list = [];
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || (cs.clipPath && cs.clipPath !== 'none')) list.push(p);
    }
    return list;
  };
  const visible = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
    }
    return true;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    let t = n.textContent.trim();
    let el = n.parentElement;
    if (!el) continue;
    // SplitText output: one text node per letter. Judge the whole name instead.
    const split = el.closest('.char, .word');
    if (split) { el = split.parentElement.closest(':not(.char):not(.word)'); t = el.textContent.trim(); }
    if (t.length < 2) continue;
    if (!el || seen.has(el) || el.closest('.sr-only, script, style, noscript, [data-intro-root], textPath, svg, .egx__track')) continue;
    const own = getComputedStyle(el);
    if (own.clipPath && /inset\(50%/.test(own.clipPath)) continue; // visually hidden on purpose
    const range = document.createRange(); range.selectNodeContents(split ? el : n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight);
    if (!rects.length || !visible(el)) continue;
    seen.add(el);
    let cut = '';
    // Only text that is PARTLY visible counts: something wholly off-screen is not cut, it is elsewhere.
    const anc = clipAnc(el).map((a) => ({ a, b: a.getBoundingClientRect(), cs: getComputedStyle(a) }));
    if (anc.some(({ b }) => b.width < 3 || b.height < 3)) continue; // visually hidden
    for (const r of rects) {
      const onScreen = r.right > 1 && r.left < vw - 1;
      if (!onScreen) continue;
      if (r.left < -1) cut = `left ${Math.round(r.left)}`;
      else if (r.right > vw + 1) cut = `right +${Math.round(r.right - vw)}`;
      if (cut) break;
      for (const { a, b, cs } of anc) {
        if (cs.overflowX === 'visible' && !(cs.clipPath && cs.clipPath !== 'none')) continue;
        const inside = r.right > b.left + 1 && r.left < b.right - 1 && r.bottom > b.top + 1 && r.top < b.bottom - 1;
        if (inside && (r.left < b.left - 1 || r.right > b.right + 1)) { cut = `clipX by ${a.className.toString().slice(0, 30)} (${Math.round(Math.max(b.left - r.left, r.right - b.right))}px)`; break; }
      }
      if (cut) break;
    }
    if (cut) {
      const cls = (el.className || '').toString().slice(0, 36);
      out.push(`${el.tagName.toLowerCase()}.${cls} "${t.slice(0, 28)}" ${cut} fs${Math.round(parseFloat(getComputedStyle(el).fontSize))}`);
    }
  }
  return out;
};

if (route === 'hero') {
  // The film's copy, at each of its stops.
  for (const profile of profiles) {
    const found = [];
    for (let s = 0; s <= 6; s++) {
      const { browser, page } = await open(profile, { url: `http://localhost:4321/?stop=${s}&nointro`, wait: 3200 });
      for (const line of await page.evaluate(detect)) found.push(`stop ${s}: ${line}`);
      await browser.close();
    }
    console.log(`\n=== ${profile} hero — ${found.length} findings`);
    for (const l of found) console.log('  ' + l);
  }
  process.exit(0);
}

for (const profile of profiles) {
  const { browser, page, errors } = await open(profile, { url: `http://localhost:4321${route}${route.includes('?') ? '&' : '?'}nointro` });
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => innerHeight);
  const found = new Map();
  for (let y = 0; y <= H - vh + 1; y += Math.round(vh * stepFrac)) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(650);
    for (const line of await page.evaluate(detect)) {
      if (!found.has(line)) found.set(line, y);
    }
  }
  console.log(`\n=== ${profile} ${route} (${vh}px tall, H=${H}) — ${found.size} findings`);
  for (const [line, y] of found) console.log(`  @${y}  ${line}`);
  if (errors.length) console.log('  errors:', errors.slice(0, 3));
  await browser.close();
}
