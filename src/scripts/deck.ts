/**
 * The workforce stack: five plates you can actually throw.
 *
 * Physics (measured targets in docs/redesign/00-DIRECTION.md §6C):
 *   drag        1:1 with the pointer
 *   rotation    clamp(dx * ROT_PER_PX, ±ROT_MAX) about a pivot BELOW the card, so it swings like a held card
 *   release     |dx| > THROW_FRAC of the card width, or |vx| > THROW_V px/ms → thrown along the release vector
 *   otherwise   springs home, critically damped (tau SPRING)
 *   the stack   answers early: the card beneath rises once the top card passes ANSWER of the threshold
 *   the loop    a thrown card returns to the back, so the stack can never empty
 *
 * Everything is transform/opacity. The rAF loop only runs while something is moving or the deck is on screen.
 * Keyboard (arrows / Home / End on the stack), buttons and touch all drive the same `advance()`.
 */
import { $, $$, clamp, env } from './core/env';
import { onTick, damp } from './core/ticker';

const ROT_PER_PX = 0.055; // degrees
const ROT_MAX = 14;
const THROW_FRAC = 0.26;
const THROW_V = 0.85; // px per ms
const SPRING = 0.14; // seconds
const ANSWER = 0.4;
const FLY_MS = 460;
const DEPTH_Y = -15; // px per layer
const DEPTH_S = 0.045;
const DEPTH_R = 1.5; // degrees per layer, alternating

interface Card {
  el: HTMLElement;
  /** live offset from its home position */
  x: number; y: number; rot: number;
  /** where it is heading */
  tx: number; ty: number; trot: number;
  depth: number;
  flying: number; // ms remaining
  vx: number; vy: number;
}

export function initDeck() {
  const found = $('[data-deck]');
  if (!found) return;
  const root: HTMLElement = found;

  const stack = $('[data-deck-stack]', root)!;
  const els = $$<HTMLElement>('[data-deck-card]', stack);
  if (els.length < 2) return;

  const panels = $$<HTMLElement>('[data-deck-panel]', root);
  const counter = $('[data-deck-count]', root);
  const live = $('[data-deck-live]', root);
  const n = els.length;

  // Order[0] is the front card. Cards keep their DOM position; only transforms and z-index move.
  let order = els.map((_, i) => i);
  const cards: Card[] = els.map((el) => ({ el, x: 0, y: 0, rot: 0, tx: 0, ty: 0, trot: 0, depth: 0, flying: 0, vx: 0, vy: 0 }));

  const front = () => order[0];
  const ids = els.map((el) => el.dataset.deckCard ?? '');

  // ── layout ──────────────────────────────────────────────────────────────────────────────
  function reseat(immediate = false) {
    order.forEach((idx, depth) => {
      const c = cards[idx];
      c.depth = depth;
      c.tx = 0;
      c.ty = depth * DEPTH_Y;
      c.trot = depth === 0 ? 0 : (depth % 2 ? 1 : -1) * DEPTH_R * Math.ceil(depth / 2);
      c.el.style.zIndex = String(n - depth);
      c.el.setAttribute('aria-hidden', depth === 0 ? 'false' : 'true');
      c.el.dataset.depth = String(depth);
      // Only the front card can be reached with a pointer; the rest are scenery.
      c.el.style.pointerEvents = depth === 0 ? 'auto' : 'none';
      if (immediate) { c.x = c.tx; c.y = c.ty; c.rot = c.trot; }
    });
    paint();
    announce();
  }

  function paint() {
    for (const c of cards) {
      const s = 1 - c.depth * DEPTH_S;
      c.el.style.transform = `translate3d(${c.x.toFixed(2)}px, ${(c.y).toFixed(2)}px, 0) rotate(${c.rot.toFixed(2)}deg) scale(${s.toFixed(3)})`;
      c.el.style.opacity = c.depth > 3 ? '0' : '1';
    }
  }

  function announce() {
    const id = ids[front()];
    panels.forEach((p) => { p.dataset.on = String(p.dataset.deckPanel === id); });
    root.dataset.sector = id;
    if (counter) counter.textContent = String(seen + 1).padStart(2, '0');
    const label = els[front()].dataset.deckTitle ?? '';
    if (live) live.textContent = `${label}, ${seen + 1} of ${n}`;
  }

  // `seen` counts how far through the five we are, independently of the physical order.
  let seen = 0;

  // ── stepping ────────────────────────────────────────────────────────────────────────────
  function advance(dir: 1 | -1, vx = 0, vy = 0) {
    const c = cards[front()];
    if (dir > 0) {
      // Throw the front card out and send it to the back.
      c.flying = FLY_MS;
      c.vx = vx || 1.1;
      c.vy = vy;
      order = [...order.slice(1), order[0]];
      seen = (seen + 1) % n;
    } else {
      // Bring the back card round the front, arriving from the side it left by.
      const last = order[order.length - 1];
      order = [last, ...order.slice(0, -1)];
      seen = (seen - 1 + n) % n;
      const b = cards[last];
      b.x = -innerWidth * 0.5; b.y = 40; b.rot = -18;
    }
    reseat();
    wake();
  }

  // ── pointer ─────────────────────────────────────────────────────────────────────────────
  let dragging = -1;
  let px = 0, py = 0, sx = 0, sy = 0, lastT = 0, vx = 0, vy = 0, moved = false;

  stack.addEventListener('pointerdown', (e) => {
    if (!env.motion || e.button !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-deck-card]');
    if (!el || el !== cards[front()].el) return;
    // A real click on the card's link must still work.
    if ((e.target as HTMLElement).closest('a, button')) return;
    dragging = front();
    moved = false;
    sx = px = e.clientX; sy = py = e.clientY;
    vx = vy = 0; lastT = e.timeStamp;
    cards[dragging].flying = 0;
    el.setPointerCapture(e.pointerId);
    root.dataset.dragging = 'true';
    wake();
  });

  stack.addEventListener('pointermove', (e) => {
    if (dragging < 0) return;
    const dt = Math.max(1, e.timeStamp - lastT);
    vx = (e.clientX - px) / dt;
    vy = (e.clientY - py) / dt;
    px = e.clientX; py = e.clientY; lastT = e.timeStamp;
    const c = cards[dragging];
    c.x = e.clientX - sx;
    c.y = e.clientY - sy;
    if (Math.abs(c.x) > 3 || Math.abs(c.y) > 3) moved = true;
    c.rot = clamp(c.x * ROT_PER_PX, -ROT_MAX, ROT_MAX);
    // The stack answers before the throw completes.
    const t = Math.abs(c.x) / (stack.offsetWidth * THROW_FRAC);
    const lift = clamp((t - ANSWER) / (1 - ANSWER));
    for (const k of order.slice(1)) {
      const b = cards[k];
      b.ty = b.depth * DEPTH_Y + lift * -DEPTH_Y;
    }
    root.style.setProperty('--deck-lift', lift.toFixed(3));
    paint();
  });

  const endDrag = (e: PointerEvent) => {
    if (dragging < 0) return;
    const c = cards[dragging];
    dragging = -1;
    delete root.dataset.dragging;
    root.style.removeProperty('--deck-lift');
    try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch { /* already gone */ }
    if (!moved) return;
    const past = Math.abs(c.x) > stack.offsetWidth * THROW_FRAC;
    const fast = Math.abs(vx) > THROW_V;
    if (past || fast) advance(1, vx, vy);
    else { for (const k of order) cards[k].ty = cards[k].depth * DEPTH_Y; wake(); }
  };
  stack.addEventListener('pointerup', endDrag);
  stack.addEventListener('pointercancel', endDrag);

  // ── keyboard and buttons ────────────────────────────────────────────────────────────────
  stack.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); advance(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); advance(-1); }
  });
  $$('[data-deck-next]', root).forEach((b) => b.addEventListener('click', () => advance(1)));
  // The workforces gate asks for the original order whenever the photograph is about to become card 1 again.
  root.addEventListener('nx:deck-reset', () => {
    if (order[0] === 0 && seen === 0) return;
    order = els.map((_, i) => i); seen = 0;
    for (const c of cards) c.flying = 0;
    reseat(true);
  });
  $$('[data-deck-prev]', root).forEach((b) => b.addEventListener('click', () => advance(-1)));

  // ── frame loop ──────────────────────────────────────────────────────────────────────────
  let off: (() => void) | null = null;
  let idleFrames = 0;
  const tick = (dt: number) => {
    let busy = dragging >= 0;
    for (const c of cards) {
      if (c.flying > 0) {
        // A thrown card keeps its release velocity and spins; it is re-seated when it lands off stage.
        c.flying -= dt * 1000;
        const k = dt * 1000;
        c.x += c.vx * k * 1.6;
        c.y += (c.vy * k * 1.6) + k * 0.06;
        c.rot += Math.sign(c.vx || 1) * k * 0.09;
        busy = true;
        if (c.flying <= 0) { c.x = -innerWidth; c.y = 0; c.rot = 0; }
      } else if (c !== cards[dragging]) {
        const nx = damp(c.x, c.tx, SPRING, dt);
        const ny = damp(c.y, c.ty, SPRING, dt);
        const nr = damp(c.rot, c.trot, SPRING, dt);
        if (Math.abs(nx - c.x) > 0.01 || Math.abs(ny - c.y) > 0.01 || Math.abs(nr - c.rot) > 0.01) busy = true;
        c.x = nx; c.y = ny; c.rot = nr;
        if (Math.abs(c.x - c.tx) < 0.2 && Math.abs(c.y - c.ty) < 0.2 && Math.abs(c.rot - c.trot) < 0.05) {
          c.x = c.tx; c.y = c.ty; c.rot = c.trot;
        }
      }
    }
    paint();
    idleFrames = busy ? 0 : idleFrames + 1;
    if (idleFrames > 6 && !inView) sleep();
  };
  const wake = () => { if (!off) { idleFrames = 0; off = onTick(tick); } };
  const sleep = () => { off?.(); off = null; };

  let inView = false;
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView) wake(); else if (dragging < 0) sleep();
  }, { rootMargin: '20% 0px' }).observe(root);

  // Without motion the stack stays a plain list; the markup already reads that way.
  if (!env.motion) { root.dataset.static = 'true'; return; }
  root.dataset.live = 'true';
  reseat(true);
}
