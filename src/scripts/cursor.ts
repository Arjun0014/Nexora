/**
 * The pointer follower — rebuilt on noho.ink's measured model (brief #4).
 *
 * Position   an exponential ease towards the pointer, k = 1 − e^(−dt/τ), τ = 85 ms. It is frame-rate independent,
 *            never overshoots, keeps up with fast movement (the lag is proportional to speed, so it closes the gap
 *            in ~250 ms however far the pointer went) and lands EXACTLY under the pointer, snapping the last 0.1 px.
 *            No springs, no velocity stretch, no rotation: those are what made the old follower wobble and glitch.
 * Look       resolved from what is under the pointer, on move AND after a scroll (content moves under a still
 *            pointer), and written as data-state for CSS to morph over 0.42 s:
 *              [data-cursor="Word"]  → label   a filled circle carrying the word ("Request", "Drag", "Explore"…)
 *              [data-cursor="hold"]  → hold    "Hold", with a ring that fills as you hold
 *              [data-cursor="01"]    → num     a small ink circle carrying the numeral
 *              a, button, [tabindex] → ring    an outline, the size of a fingertip
 *              input/textarea/select → hide
 *              anything else         → dot
 *            The dot takes ink or bone from the ground under it (data-bg / data-theme), so it is always visible.
 * Press      a short squeeze on pointerdown.
 * Fine pointers only, never under reduced motion; hidden while the keyboard is in use.
 */
import { $, env } from './core/env';
import { gsap } from './core/motion';
import { lenis } from './core/scroll';

const TAU = 0.085;

export function initCursor() {
  const el = $('[data-cursor-root]');
  if (!el || !env.finePointer || !env.motion) { el?.remove(); return; }
  const root: HTMLElement = el;
  const text = $('[data-cursor-text]', root)!;

  let tx = -100, ty = -100, x = -100, y = -100, seen = false;
  let state = 'dot', word = '', ground = '';

  const resolve = () => {
    if (!seen) return;
    const hit = document.elementFromPoint(tx, ty) as HTMLElement | null;
    let next = 'dot', label = '';
    if (hit) {
      const tagged = hit.closest<HTMLElement>('[data-cursor]');
      const field = hit.closest('input, textarea, select, [contenteditable="true"]');
      const link = hit.closest('a[href], button, [role="button"], summary, label[for], [tabindex]:not([tabindex="-1"])');
      if (field) next = 'hide';
      else if (tagged) {
        const v = tagged.dataset.cursor || '';
        if (v === 'hold') { next = 'hold'; label = 'Hold'; }
        else if (/^\d+$/.test(v)) { next = 'num'; label = v; }
        else if (v === 'Drag') { next = 'drag'; label = 'Drag'; }
        else { next = 'label'; label = v; }
      } else if (link) next = 'ring';
      // The ground under the pointer: the nearest element that declares one.
      const g = hit.closest<HTMLElement>('[data-bg], [data-theme]');
      const gv = g ? (g.dataset.bg || (g.dataset.theme === 'paper' || g.dataset.theme === 'light' ? 'light' : 'dark')) : 'dark';
      if (gv !== ground) { ground = gv; root.dataset.ground = gv; }
    }
    if (next !== state) { state = next; root.dataset.state = next; }
    if (label !== word) { word = label; if (label) text.textContent = label; }
  };

  // ── input ───────────────────────────────────────────────────────────────────────────────
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!seen) { seen = true; x = tx; y = ty; root.dataset.on = ''; }
    resolve();
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { delete root.dataset.on; seen = false; });
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') root.dataset.press = ''; });
  addEventListener('pointerup', () => { delete root.dataset.press; });
  addEventListener('keydown', (e) => { if (e.key === 'Tab') { delete root.dataset.on; seen = false; } });

  // Content moves under a still pointer when the page scrolls: look again (noho's hover sync).
  let queued = false;
  const resync = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; resolve(); }); };
  if (lenis) lenis.on('scroll', resync); else addEventListener('scroll', resync, { passive: true });

  // ── motion ──────────────────────────────────────────────────────────────────────────────
  let running = false;
  const tick = (_t: number, dtMs: number) => {
    const k = 1 - Math.exp(-(Math.min(dtMs, 64) / 1000) / TAU);
    x += (tx - x) * k; y += (ty - y) * k;
    if (Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1) { x = tx; y = ty; }
    root.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    if (x === tx && y === ty) { running = false; gsap.ticker.remove(tick); }
  };
  const wake = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
}
