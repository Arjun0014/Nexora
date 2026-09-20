/**
 * The turning floor: the hero's own loop video, zoomed past the rim, as a live ground.
 *
 * Scroll velocity drives playback speed — `rate = clamp(1 + |v| * K, 1, MAX)` with `v` in viewport-heights per
 * second — damped back to 1x with tau DAMP when the page is still. A video cannot play backwards, so scrolling
 * up speeds it forwards too; the crop sits past the rim precisely because the direction of rotation is
 * unreadable there, so the only thing felt is "the floor reacted".
 *
 * It only ever plays while on screen, and never at all under reduced motion, where the poster stands in.
 */
import { $, clamp, env } from './core/env';
import { onTick, damp } from './core/ticker';

const K = 2.6;
const MAX = 8;
const DAMP = 0.5; // seconds back to 1x

export function initTurning() {
  const root = $('[data-turning]');
  if (!root) return;
  const video = $<HTMLVideoElement>('[data-turning-video]', root);
  if (!video || !env.motion) return;

  const small = Math.min(innerWidth, innerHeight) < 820;
  video.src = `/media/hero/loop-${small ? 960 : 1440}.mp4`;
  video.preload = 'auto';

  let rate = 1;
  let lastY = scrollY;
  let lastT = performance.now();
  let v = 0;
  let inView = false;
  let off: (() => void) | null = null;

  addEventListener('scroll', () => {
    const now = performance.now();
    const dt = Math.max(16, now - lastT);
    // Viewport-heights per second: a full-screen flick is about 1, a slow read about 0.1.
    v = Math.abs(scrollY - lastY) / innerHeight / (dt / 1000);
    lastY = scrollY; lastT = now;
  }, { passive: true });

  const tick = (dt: number) => {
    const now = performance.now();
    // Scroll events stop arriving the moment the page settles, so decay the stored velocity itself.
    if (now - lastT > 90) v = damp(v, 0, 0.12, dt);
    const want = clamp(1 + v * K, 1, MAX);
    rate = want > rate ? damp(rate, want, 0.08, dt) : damp(rate, want, DAMP, dt);
    try { video.playbackRate = Math.round(rate * 100) / 100; } catch { /* rate control refused: plain 1x */ }
    root.style.setProperty('--spin', (rate - 1).toFixed(3));
  };

  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView) {
      video.play().catch(() => { /* autoplay refused: the poster stands in */ });
      if (!off) off = onTick(tick);
    } else {
      video.pause();
      off?.(); off = null;
    }
  }, { rootMargin: '15% 0px' }).observe(root);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (inView) video.play().catch(() => { /* nothing to do */ });
  });
}
