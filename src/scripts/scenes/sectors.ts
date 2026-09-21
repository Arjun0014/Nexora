/**
 * Scenes 5 + 6 — Sectors (src/components/scenes/Sectors.astro).
 *
 * The cloud bank is driven by the section's ARRIVAL (top of section from the bottom of the viewport to its top):
 * it rises a little faster than the page, so the clouds roll over the deck rather than scrolling past it.
 *
 * Then one scrubbed progress q over the pinned stage:
 *   0.00 → 0.14  gate    fly into SECTORS; the skyline settles 1.18x → 1.0
 *   0.14 → 0.24  city    "Where our people work." rises over the skyline (played, not scrubbed)
 *   0.24 → 0.32  out     the city scales to 1.25 and dissolves; the index arrives from 0.94 scale
 *   0.32 → 1.00  index   ten steps. A step change PLAYS a transition (ERA plays its slider; it does not scrub it):
 *                         the old name's letters turn away upwards, the new ones turn in from below, and the
 *                         picture wipes in on a slanted edge from the right while settling from 1.4x.
 */
import words from '../../data/words.json';
import { $, $$, clamp, lerp } from '../core/env';
import { gsap, ScrollTrigger, SplitText, EASE, DUR } from '../core/motion';
import { scrollToTarget } from '../core/scroll';

type Word = { width: number; height: number; d: string; anchor: { x: number; y: number; r: number } };
const SAND = '#eee7db';
const Z_END = 0.14, CITY = 0.15, OUT_A = 0.24, OUT_B = 0.32;

export function initSectors() {
  const root = $('[data-sgx]');
  if (!root || !document.documentElement.classList.contains('motion')) return;
  const spec = (words.words as Record<string, Word>).SECTORS;
  const canvas = $<HTMLCanvasElement>('[data-sgx-mask]', root)!;
  const ctx = canvas.getContext('2d')!;
  const path = new Path2D(spec.d);
  const city = $('[data-sgx-city]', root)!;
  const cityImg = $<HTMLImageElement>('[data-sgx-cityimg]', root)!;
  const over = $('[data-sgx-over]', root)!;
  const index = $('[data-sgx-index]', root)!;
  const gateUi = $('[data-sgx-gateui]', root)!;
  const bank = $('[data-sgx-bank]', root)!;
  const puffs = $$('[data-sgx-puff]', root);
  const slides = $$('[data-sgx-slide]', root);
  const names = $$('[data-sgx-name]', root);
  const details = $$('[data-sgx-detail]', root);
  const jumps = $$<HTMLButtonElement>('[data-sgx-jump]', root);
  const nEl = $('[data-sgx-n]', root)!;
  const bar = $('[data-sgx-bar]', root)!;
  const N = names.length;
  cityImg.loading = 'eager';

  // ── the cloud bank ──────────────────────────────────────────────────────────────────────
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top bottom', end: 'top top', scrub: 0.4 } })
    // It starts BELOW the section's edge, so the deck is clear while it can still be thrown; rising faster than
    // the page, it overtakes the deck only as the deck leaves.
    .fromTo(bank, { y: '50vh' }, { y: '-26vh', ease: 'none' }, 0)
    .fromTo(puffs, { y: '60vh' }, { y: (i) => `${-(i ? 60 : 40)}vh`, ease: 'none' }, 0);

  // ── the gate ────────────────────────────────────────────────────────────────────────────
  let W = 1, H = 1, lastT = -1;
  const measure = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H; lastT = -1;
  };
  const draw = (t: number) => {
    if (t === lastT) return;
    lastT = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (t >= 1) return;
    const byW = (W * 0.84) / spec.width, byH = (H * 0.17) / spec.height, k = Math.max(byW, byH);
    const bx = byH > byW ? W / 2 - spec.anchor.x * k : (W - spec.width * k) / 2, by = (H - spec.height * k) / 2 - H * 0.02;
    const sMax = (1.08 * Math.hypot(W, H) / 2) / (spec.anchor.r * k);
    const s = Math.exp(Math.log(sMax) * Math.pow(t, 3.4));
    ctx.fillStyle = SAND;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    const ax = bx + spec.anchor.x * k, ay = by + spec.anchor.y * k, ks = k * s;
    ctx.setTransform(ks, 0, 0, ks, ax - spec.anchor.x * ks, ay - spec.anchor.y * ks);
    ctx.fill(path);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  // The line over the city is played once per arrival.
  const overLines = $$('span > span', over);
  gsap.set(overLines, { yPercent: 110 });
  let overOn = false;
  const setOver = (on: boolean) => {
    if (on === overOn) return;
    overOn = on;
    gsap.to(overLines, on
      ? { yPercent: 0, duration: DUR.l, ease: EASE.out, stagger: 0.09, overwrite: true }
      : { yPercent: 110, duration: DUR.s, ease: EASE.in, overwrite: true });
  };

  // ── the index ───────────────────────────────────────────────────────────────────────────
  const splits = names.map((n) => new SplitText(n, { type: 'words,chars', wordsClass: 'word', charsClass: 'char' }));
  let step = 0;
  const goTo = (next: number) => {
    if (next === step) return;
    const dir = next > step ? 1 : -1;
    const prev = step;
    step = next;
    // Name: out upwards, in from below (or the reverse going back).
    gsap.to(splits[prev].chars, { rotateX: 90 * dir, yPercent: -40 * dir, opacity: 0, duration: DUR.s, ease: EASE.in, stagger: 0.012, overwrite: true,
      onComplete: () => { if (step !== prev) names[prev].removeAttribute('data-on'); } });
    names[next].setAttribute('data-on', '');
    gsap.fromTo(splits[next].chars, { rotateX: -90 * dir, yPercent: 40 * dir, opacity: 0 },
      { rotateX: 0, yPercent: 0, opacity: 1, duration: DUR.l, ease: EASE.out, stagger: 0.02, delay: 0.12, overwrite: true });
    // Picture: slanted wipe from the leading side, settling from 1.4x.
    slides.forEach((s, i) => { s.style.zIndex = i === next ? '2' : i === prev ? '1' : '0'; });
    slides[next].setAttribute('data-on', '');
    const img = $('img', slides[next])!;
    const from = dir > 0 ? 'polygon(100% 0%, 100% 0%, 100% 100%, 125% 100%)' : 'polygon(-25% 0%, 0% 0%, 0% 100%, 0% 100%)';
    gsap.fromTo(slides[next], { clipPath: from }, { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: DUR.l, ease: EASE.inOut, overwrite: true,
      onComplete: () => slides.forEach((s, i) => { if (i !== step) s.removeAttribute('data-on'); }) });
    gsap.fromTo(img, { scale: 1.4, xPercent: 12 * dir }, { scale: 1, xPercent: 0, duration: DUR.l, ease: EASE.inOut, overwrite: true });
    details.forEach((d, i) => d.toggleAttribute('data-on', i === next));
    jumps.forEach((b, i) => (i === next ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    nEl.textContent = String(next + 1).padStart(2, '0');
  };

  // ── driver ──────────────────────────────────────────────────────────────────────────────
  let trig: ScrollTrigger;
  const render = (q: number) => {
    const z = clamp(q / Z_END);
    draw(z);
    canvas.style.visibility = z >= 1 ? 'hidden' : 'visible';
    gateUi.style.opacity = String(1 - clamp(z * 4));
    const o = EASE.inOut(clamp((q - OUT_A) / (OUT_B - OUT_A)));
    cityImg.style.transform = `scale(${(lerp(1.18, 1, EASE.out(z)) + 0.25 * o).toFixed(4)})`;
    city.style.opacity = String(1 - o);
    city.style.visibility = o >= 1 ? 'hidden' : 'visible';
    index.style.opacity = String(o);
    index.style.transform = `scale(${lerp(0.94, 1, o).toFixed(4)})`;
    setOver(q >= CITY && q < OUT_A + 0.02);
    const iq = clamp((q - OUT_B) / (1 - OUT_B));
    bar.style.setProperty('--prog', String(Math.max(0.02, iq)));
    goTo(Math.min(N - 1, Math.floor(iq * N)));
  };
  trig = ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => { measure(); render(self.progress); },
  });
  measure();
  render(0);

  jumps.forEach((b, i) => b.addEventListener('click', () => {
    const q = OUT_B + ((i + 0.5) / N) * (1 - OUT_B);
    scrollToTarget(trig.start + q * (trig.end - trig.start));
  }));
}
