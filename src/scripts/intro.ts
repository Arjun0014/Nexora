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
 * The ending (brief #2): the hairline draws in to a point of light; the point opens as a circular aperture with
 * a lit rim and dives out past the corners (ERA Residence's arch dive, drawn with our disc), while the film
 * behind settles from 1.14x to rest, so the reveal reads as a camera arriving rather than a curtain lifting.
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
  if (media) gsap.set(media, { scale: 1.14, transformOrigin: '50% 50%' });

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
    const far = Math.hypot(innerWidth, innerHeight) / 2 + 60;
    const state = { r: 1.5, open: 0 };
    const paint = () => {
      root.style.setProperty('--r', `${state.r.toFixed(2)}px`);
      root.style.setProperty('--open', state.open.toFixed(3));
      root.style.setProperty('--ring', String(1 - clamp((state.r / far - 0.72) / 0.28)));
    };
    gsap.timeline({ delay: 0.72, onComplete: finish })
      .add(() => { root.dataset.aperture = ''; })
      // A breath: the point swells into a small lit circle, the disc just visible inside it.
      .to(state, { r: Math.min(innerWidth, innerHeight) * 0.09, open: 1, duration: 0.7, ease: EASE.out, onUpdate: paint })
      // The dive: slow to leave, then out past the corners.
      .to(state, { r: far, duration: 1.25, ease: EASE.dive, onUpdate: paint }, '>-0.08')
      .to(media, { scale: 1, duration: 1.6, ease: EASE.inOut }, '<-0.2');
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
