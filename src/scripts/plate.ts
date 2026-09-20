/** The plate eases from 1.06 to 1.0 as it crosses the viewport. Transform only; asleep when off-screen. */
import { $, clamp, env } from './core/env';

export function initPlate() {
  const root = $('[data-plate]');
  const img = root && $('[data-plate-img]', root);
  if (!root || !img || !env.motion || !('IntersectionObserver' in window)) return;

  let visible = false, queued = false;
  const update = () => {
    queued = false;
    if (!visible) return;
    const r = root.getBoundingClientRect();
    const p = clamp((innerHeight - r.top) / (innerHeight + r.height));
    img.style.setProperty('--plate-s', (1.06 - 0.06 * p).toFixed(4));
  };
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; request(); }).observe(root);
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
}
