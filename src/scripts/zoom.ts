/**
 * The zoom-type chapter transition.
 *
 * A word is knocked OUT of the outgoing chapter's ground, so at rest the next chapter is already visible
 * through its letterforms. Scrolling scales that knock-out about a point inside one letter until the letter
 * swallows the viewport and the next chapter is all there is.
 *
 * The curve is the one measured from the reference (docs/redesign/research/interaction-references.md): the
 * LOGARITHM of the scale eases, so 70% of the move is spent below 2x and the last 15% covers 5x to 30x+. The
 * picture behind only reaches ~1.9x, and that ratio between the two planes is what reads as a camera move
 * rather than a CSS grow. The incoming scene arrives at scale 1 and merely resolves focus — a lens pulling
 * focus, not a fade-in — which is done by cross-fading a statically blurred copy, never by animating a filter.
 *
 * Crispness comes from filling a Path2D on a canvas (the hero's title card does the same thing in reverse), so
 * there is no rasterised text texture to go soft at 50x.
 */
import words from '../data/words.json';
import { $, clamp, env } from './core/env';
import { onTick, damp } from './core/ticker';

const EXP = 3.4;       // measured: ln(scale) eases as p^3.4
const IMG_MAX = 0.9;   // the picture behind reaches 1 + 0.9 = 1.9x
const IMG_EXP = 1.6;
const SWAP = 0.72;     // the letters own the stage from here on
const REST_WIDTH = 0.9;  // landscape: the word spans this much of the stage
const REST_HEIGHT = 0.13; // portrait: cap height instead, so the word crops rather than shrinking to a hairline

type Word = { width: number; height: number; d: string; anchor: { x: number; y: number; r: number } };

export function initZoom() {
  document.querySelectorAll<HTMLElement>('[data-zoom]').forEach(setup);
}

function setup(root: HTMLElement) {
  const spec = (words.words as Record<string, Word>)[root.dataset.zoom ?? ''];
  const canvas = $<HTMLCanvasElement>('[data-zoom-mask]', root);
  const next = $('[data-zoom-next]', root);
  const soft = $('[data-zoom-soft]', root);
  const stage = $('[data-zoom-stage]', root);
  if (!spec || !canvas || !next || !stage) return;

  // Without motion the gate is a still composition: the word, filled with the next chapter's picture.
  if (!env.motion) { root.dataset.state = 'static'; }

  const ctx = canvas.getContext('2d')!;
  const path = new Path2D(spec.d);
  let W = 1, H = 1, ratio = 1;
  let lastDrawn = -1;
  let p = 0;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    ratio = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * ratio));
    H = Math.max(1, Math.round(r.height * ratio));
    canvas.width = W; canvas.height = H;
    lastDrawn = -1;
  };

  /**
   * Geometry of the word at rest, in backing pixels. On a narrow screen a word this wide would set at 36 px
   * tall, which is not a composition — so there the HEIGHT sets the scale and the word crops at both edges.
   * It is flown into either way, so cropping costs nothing.
   */
  const restBox = () => {
    const byWidth = (W * REST_WIDTH) / spec.width;
    const byHeight = (H * REST_HEIGHT) / spec.height;
    const k = Math.max(byWidth, byHeight);
    // When it crops, centre the ANCHOR letter rather than the word, so what is on screen is the letter you
    // are about to fly into.
    const x = byHeight > byWidth ? W / 2 - spec.anchor.x * k : (W - spec.width * k) / 2;
    return { k, w: spec.width * k, h: spec.height * k, x, y: (H - spec.height * k) / 2 };
  };

  function draw(t: number) {
    if (t === lastDrawn) return;
    lastDrawn = t;
    const box = restBox();
    // The scale at which the clearance circle inside the anchor letter swallows the whole stage.
    const sMax = (1.06 * Math.hypot(W, H) / 2) / (spec.anchor.r * box.k);
    const pe = clamp(t / SWAP);
    const s = Math.exp(Math.log(sMax) * Math.pow(pe, EXP));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (t >= 0.999) return; // the ground is gone; the next chapter is the whole stage

    ctx.fillStyle = root.dataset.zoomGround || '#17110c';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'destination-out';
    const ax = box.x + spec.anchor.x * box.k;
    const ay = box.y + spec.anchor.y * box.k;
    const ks = box.k * s;
    // Scale about the anchor: the anchor point itself never moves, so we fly straight into that letter.
    ctx.setTransform(ks, 0, 0, ks, ax - spec.anchor.x * ks, ay - spec.anchor.y * ks);
    ctx.fill(path);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  function apply(t: number) {
    const pe = clamp(t / SWAP);
    // Focus is a lens pull, not a fade: it resolves over the first half of the arrival and then holds sharp,
    // so the rest of the scroll is spent on a clean picture rather than a soft one.
    const pa = clamp((t - SWAP) / ((1 - SWAP) * 0.5));
    // The picture behind moves far more slowly than the type. That ratio is the depth cue.
    (next as HTMLElement).style.transform = `scale(${(1 + IMG_MAX * Math.pow(pe, IMG_EXP)).toFixed(4)})`;
    // Focus resolves on an ease-out with a long tail once the letters own the stage.
    if (soft) soft.style.opacity = String(Math.max(0, 1 - (1 - Math.pow(1 - pa, 3))).toFixed(3));
    draw(t);
    root.dataset.state = t <= 0.001 ? 'rest' : t >= 0.999 ? 'done' : 'run';
  }

  resize();
  apply(0);

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { resize(); apply(p); }, 140);
  }, { passive: true });

  if (!env.motion) { apply(0); return; }

  // ── driver: scroll position inside the track, damped ────────────────────────────────────
  let off: (() => void) | null = null;
  const target = () => {
    const r = root.getBoundingClientRect();
    const travel = root.offsetHeight - stage.offsetHeight;
    return travel > 0 ? clamp(-r.top / travel) : 0;
  };

  const tick = (dt: number) => {
    const t = target();
    // Wheel steps are 100 px jumps; damping is what turns them into a camera move.
    p = damp(p, t, 0.1, dt);
    if (Math.abs(p - t) < 0.0004) p = t;
    apply(p);
  };

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !off) { p = target(); off = onTick(tick); }
    else if (!e.isIntersecting && off) { off(); off = null; apply(target()); }
  }, { rootMargin: '10% 0px' }).observe(root);
}
