/** One-shot reveals. Elements with [data-reveal] get .is-in the first time they enter the viewport. */
import { $$, env } from './core/env';

export function initReveal() {
  const els = $$('[data-reveal]');
  if (!els.length) return;
  if (!env.motion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}
