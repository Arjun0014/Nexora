/**
 * One-shot reveals: `[data-reveal]` gets `.is-in` the first time it approaches the viewport.
 *
 * Threshold 0 with a negative bottom margin, not a ratio: a chapter can be several viewports tall, and a ratio
 * threshold on an element taller than the screen either fires very late or never reaches the ratio at all.
 * This fires when the element's top edge crosses 88% of the viewport, whatever its height.
 *
 * A sweep runs alongside the observer for the cases it cannot see: a deep link or a restored scroll position
 * jumps the page before the observer's first callback, so everything it skipped over would stay hidden for
 * good. The sweep reveals anything already at or above the reading line, and runs again on `load` (late images
 * move things) and on `hashchange`.
 */
import { $$, env } from './core/env';

export function initReveal() {
  const els = $$('[data-reveal]');
  if (!els.length) return;
  if (!env.motion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }

  const pending = new Set<HTMLElement>(els);
  const show = (el: Element) => { el.classList.add('is-in'); pending.delete(el as HTMLElement); io.unobserve(el); };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(e.target);
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

  const sweep = () => {
    const line = innerHeight * 0.88;
    for (const el of [...pending]) if (el.getBoundingClientRect().top < line) show(el);
  };

  els.forEach((el) => io.observe(el));
  sweep();
  addEventListener('load', sweep, { once: true });
  addEventListener('hashchange', () => requestAnimationFrame(sweep));
}
