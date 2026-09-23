/**
 * The intro sequence. Runs on EVERY load of the homepage (brief #16), except under reduced motion, lite
 * connections, no-JS or a deep link into the film.
 *
 * The intro is where the hero loads: it holds until EVERYTHING the court needs is in (docs/redesign/09-HERO-V9.md):
 * three.js, the court's stone and sky, the five films whole (their bytes are most of the bar), and the court's shaders
 * compiled. Progress is REAL (`heroLoad.progress`); what is shown never runs ahead of it, and never faster than
 * MIN_MS, so the sequence always reads the same way:
 *
 *   shown = max( monotonic, min(real, elapsed / MIN_MS) )        ...and it closes only once the hero is `done`
 *
 * There is no upper bound: a slow connection waits longer, at the bar, rather than opening onto a court still loading.
 * Only if the progress stops altogether for STALL_MS (something has hung: a stalled film is restarted, then given up
 * for its poster, well before that) does it give up and open onto the page's static reading.
 *
 * The ending: the hairline draws in to a point, which travels to the pool at the heart of the court — the one thing
 * the first screen's turn leaves still — and opens there, over the whole court, its films already playing.
 */
import { gsap } from 'gsap';
import { $, $$, clamp } from './core/env';
import { onTick } from './core/ticker';
import { heroLoad } from './hero/index';
import { EASE } from './core/motion';

const MIN_MS = 5000;
const STALL_MS = 45000;
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
    // Where the court's pool stands, and how far to open (published by the hero's world as it lays itself out).
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
      // It opens from the doorway over the whole court.
      .to(state, { r: target.r, open: 1, duration: 1.1, ease: EASE.dive, onUpdate: paint })
      // What is left of the intro's limestone lifts.
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

  // Something has hung (not merely slow: a stalled film restarts, then gives way to its poster, inside the hero): the
  // film is let go and the page opens onto its static reading.
  const giveUp = () => {
    console.warn('[intro] the hero did not finish loading; opening onto the static page');
    heroLoad.abandoned = true;
    heroLoad.progress = 1;
    heroLoad.done = true;
    html.classList.remove('cinema');
  };

  // (the stall is counted in the ticker's time, which stops with the tab: a hidden tab pauses the shaders' compile)
  let lastReal = -1, stalled = 0;
  const off = onTick((dt, now) => {
    if (closing) return;
    const elapsed = now - t0;
    if (heroLoad.progress > lastReal) { lastReal = heroLoad.progress; stalled = 0; } else stalled += dt * 1000;
    if (!heroLoad.done && stalled > STALL_MS) giveUp();
    const paced = Math.min(clamp(heroLoad.progress), elapsed / MIN_MS);
    shown = Math.max(shown, paced);

    fill.style.transform = `scaleX(${shown.toFixed(4)})`;
    word.style.setProperty('--track', `${(TRACK.from + (TRACK.to - TRACK.from) * shown).toFixed(3)}em`);
    const text = String(Math.min(99, Math.round(shown * 100))).padStart(2, '0');
    if (pct.textContent !== text) pct.textContent = text;
    setWord(Math.min(4, Math.floor(shown * 5)));

    if (shown < 0.999 || !heroLoad.done) return;
    closing = true;
    off();
    pct.textContent = '100';
    setWord(5); // the tagline, in bone, on a full bar
    setTimeout(reveal, 650);
  });
}
