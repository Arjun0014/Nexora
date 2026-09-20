/** Marks the step crossing the middle of the viewport and rolls the sticky numeral to match. */
import { $, $$ } from './core/env';

export function initProcess() {
  const root = $('[data-process]');
  if (!root || !('IntersectionObserver' in window)) return;
  const steps = $$('[data-process-step]', root);
  const reel = $('[data-process-reel]', root);
  if (!steps.length) return;

  const setCurrent = (i: number) => {
    steps.forEach((s, k) => { if (k === i) s.dataset.current = ''; else delete s.dataset.current; });
    reel?.style.setProperty('--step', String(i));
  };
  setCurrent(0);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.processStep));
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  steps.forEach((s) => io.observe(s));
}
