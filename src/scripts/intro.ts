/**
 * The intro sequence. Runs on EVERY load of the homepage (brief #16), except under reduced motion, lite
 * connections, no-JS or a deep link into the film.
 *
 * Progress is REAL: `heroLoad.progress` counts the poster, the loop video's own bytes (streamed with a
 * content-length) and the entry frames. What is SHOWN is bounded on both sides so the sequence always reads the
 * same way:
 *
 *   shown = max( monotonic, min(real, elapsed / MIN_MS), force )   force = (elapsed - MIN_MS) / (MAX_MS - MIN_MS)
 *
 * The ending: the hairline draws in to a point, which travels to where the screen's one-world circle is and opens
 * there, to exactly its size, onto the first moment; then the intro's limestone gives way to the carved screen round
 * it. The circle is one object from the loader to the hero (v5, docs/redesign/05-HERO-V5.md).
 */
import { gsap } from 'gsap';
import { $, $$, clamp } from './core/env';
import { onTick } from './core/ticker';
import { heroLoad } from './hero/index';
import { EASE } from './core/motion';

const MIN_MS = 5000;
const MAX_MS = 7500;
const TRACK = { from: 0.06, to: 0.46 }; // em of letter-spacing on NEXORA: closed to open

export function initIntro() {
  const root = $('[data-intro-root]'); // NOT [data-intro]: that flag lives on <html>
  const html = document.documentElement;
  if (!root || !html.dataset.intro) { root?.remove(); return; }

  // The hero decided it is not running the film (deep link, ?stop=, static mode): there is nothing to reveal.
  if (!heroLoad.active) { delete html.dataset.intro; root.remove(); return; }

  const fill = $('[data-intro-fill]', root)!;
  const pct = $('[data-intro-pct]', root)!;
  const word = $('[data-intro-word]', root)!;
  const words = $$('[data-intro-worlds] > *', root);
  const media = $('[data-hero] [data-media]');

  // Nothing behind the intro may scroll or take focus while it is up.
  html.style.overflow = 'hidden';

  const finish = () => {
    delete html.dataset.intro;
    html.style.overflow = '';
    root.dataset.done = 'true';
    if (media) gsap.set(media, { clearProps: 'transform,scale' });
    setTimeout(() => root.remove(), 100);
    dispatchEvent(new CustomEvent('nx:intro-done'));
  };

  const reveal = () => {
    root.dataset.close = '';
    // Where the screen's one-world circle is (published by the hero's world as it lays itself out).
    const hero = $('[data-hero]');
    const cs = hero ? getComputedStyle(hero) : null;
    const px = (k: string, d: number) => { const v = cs ? parseFloat(cs.getPropertyValue(k)) : NaN; return Number.isFinite(v) ? v : d; };
    const target = { x: px('--circle-x', innerWidth / 2), y: px('--circle-y', innerHeight / 2), r: px('--circle-r', Math.min(innerWidth, innerHeight) * 0.3) };
    const state = { r: 1.5, open: 0, x: innerWidth / 2, y: innerHeight / 2 };
    const paint = () => {
      root.style.setProperty('--r', `${state.r.toFixed(2)}px`);
      root.style.setProperty('--open', state.open.toFixed(3));
      root.style.setProperty('--cx', `${state.x.toFixed(1)}px`);
      root.style.setProperty('--cy', `${state.y.toFixed(1)}px`);
    };
    paint();
    gsap.timeline({ delay: 0.72, onComplete: finish })
      .add(() => { root.dataset.aperture = ''; })
      // The point of light travels to where the one world will be, swelling a little on the way.
      .to(state, { x: target.x, y: target.y, r: 6, open: 0.4, duration: 0.8, ease: EASE.inOut, onUpdate: paint })
      // It opens, to exactly the circle's size: the first moment, seen through it.
      .to(state, { r: target.r, open: 1, duration: 1.1, ease: EASE.dive, onUpdate: paint })
      // The limestone of the intro gives way to the carved screen round the circle.
      .to(root, { opacity: 0, duration: 0.8, ease: 'none' }, '>-0.05');
  };

  // ── counting ────────────────────────────────────────────────────────────────────────────
  const t0 = performance.now();
  let shown = 0; // what is on screen: monotonic
  let closing = false;
  let lastWord = -1;

  requestAnimationFrame(() => { root.dataset.on = 'true'; });

  const setWord = (i: number) => {
    if (i === lastWord) return;
    lastWord = i;
    words.forEach((w, k) => { w.dataset.on = String(k === i); });
  };
  setWord(0);

  const off = onTick((_dt, now) => {
    if (closing) return;
    const elapsed = now - t0;
    const paced = Math.min(clamp(heroLoad.progress), elapsed / MIN_MS);
    const force = clamp((elapsed - MIN_MS) / (MAX_MS - MIN_MS));
    shown = Math.max(shown, paced, force);

    fill.style.transform = `scaleX(${shown.toFixed(4)})`;
    word.style.setProperty('--track', `${(TRACK.from + (TRACK.to - TRACK.from) * shown).toFixed(3)}em`);
    const text = String(Math.min(99, Math.round(shown * 100))).padStart(2, '0');
    if (pct.textContent !== text) pct.textContent = text;
    setWord(Math.min(4, Math.floor(shown * 5)));

    if (shown < 0.999) return;
    closing = true;
    off();
    pct.textContent = '100';
    setWord(5); // the tagline, in bone, on a full bar
    setTimeout(reveal, 650);
  });
}
