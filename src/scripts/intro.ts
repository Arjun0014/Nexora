/**
 * The intro sequence.
 *
 * Progress is REAL: `heroLoad.progress` counts the poster, the loop video's own bytes (streamed with a
 * content-length) and the entry frames. What is SHOWN is bounded on both sides so the sequence always reads the
 * same way:
 *
 *   shown = max( monotonic, min(real, elapsed / MIN_MS), force )   force = (elapsed - MIN_MS) / (MAX_MS - MIN_MS)
 *
 * A warm cache therefore still takes MIN_MS and still shows all five worlds; a cold network is paced by the
 * bytes and then eased to 1 between MIN_MS and MAX_MS rather than hanging.
 *
 * Which version runs is decided pre-paint in Base.astro: `html[data-intro="on"]` (first visit this session) or
 * `"short"` (a repeat). Reduced motion, no-JS and lite connections never set the attribute at all.
 */
import { $, $$, clamp } from './core/env';
import { onTick } from './core/ticker';
import { heroLoad } from './hero/index';

const MIN_MS = 5000;
const MAX_MS = 7500;
const SHORT_MS = 640;
const TRACK = { from: 0.06, to: 0.46 }; // em of letter-spacing on NEXORA: closed to open
const KEY = 'nx-intro';

export function initIntro() {
  const root = $('[data-intro-root]'); // NOT [data-intro]: that flag lives on <html>
  const html = document.documentElement;
  const mode = html.dataset.intro;
  if (!root || !mode) { root?.remove(); return; }

  // The hero decided it is not running the film (deep link, ?stop=, static mode): there is nothing to reveal.
  if (!heroLoad.active) { delete html.dataset.intro; root.remove(); return; }

  const fill = $('[data-intro-fill]', root)!;
  const pct = $('[data-intro-pct]', root)!;
  const word = $('[data-intro-word]', root)!;
  const words = $$('[data-intro-worlds] > *', root);

  // Nothing behind the intro may scroll or take focus while it is up.
  html.style.overflow = 'hidden';

  const finish = () => {
    delete html.dataset.intro;
    html.style.overflow = '';
    try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode: nothing to persist */ }
    root.dataset.done = 'true';
    setTimeout(() => root.remove(), 400);
    dispatchEvent(new CustomEvent('nx:intro-done'));
  };
  // Close the wall, drop the black field behind it while it cannot be seen, then open onto the film.
  const wipe = (hold: number) => {
    root.dataset.wipe = 'in';
    setTimeout(() => { root.dataset.clear = 'true'; }, 470);
    setTimeout(() => { root.dataset.wipe = 'out'; setTimeout(finish, 700); }, Math.max(500, hold));
  };

  // ── repeat visit: the wall closes and opens once, no counting ───────────────────────────
  if (mode === 'short') { requestAnimationFrame(() => wipe(SHORT_MS)); return; }

  // ── first visit ─────────────────────────────────────────────────────────────────────────
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
    setWord(5); // the tagline, in bone, on a full bar
    setTimeout(() => wipe(500), 420);
  });
}
